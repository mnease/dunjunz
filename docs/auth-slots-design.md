# DUNJUNZ — Magic-link auth + multi-slot cloud saves

**Status:** Design council (EMA + Scout / Waggle / Hexis) — ready for one implementation pass  
**Date:** 2026-07-20  
**Constraints:** Vercel serverless, Neon Postgres, Resend magic links, no passwords, guest OK (email required), do not break local play.

---

## Scout — current surface (verified)

| Fact | Location |
| --- | --- |
| Single save key | `SAVE_KEY = 'dunjunz-save-v1'` in `src/config.ts` |
| Load / write / clear | `src/systems/save.ts` → localStorage only |
| Schema | `SaveData` version **5** in `src/types.ts` (mapz, lands, princess, best bud) |
| Title flow | `TitleScene`: `loadSave()` → hasProgress? CONTINUE/NEW : START; R clears; ENTER starts Game |
| Game persist | `GameScene` calls `writeSave(this.save)` on many mutations + shutdown |
| API today | `api/feedback.ts` only (Resend / SMTP) |
| SPA rewrites | `vercel.json` excludes `/api/*` |
| Shell UI | `index.html` + `src/ui/feedback.ts` (DOM modal pattern exists) |
| Auth / DB | **None** |

Local play path is sacred: offline continue with localStorage must still work with no network.

---

## 1. Auth model (locked decision)

### Two modes, one user row

| Mode | How you prove identity | Cloud slots | Multi-device |
| --- | --- | --- | --- |
| **Guest** | Opaque `guest_token` (device secret) + email on file | Yes (3 slots) | Only after magic-link claim |
| **Account** | Magic-link verified email → HTTP-only session cookie | Yes (3 slots) | Yes |

### Why this is the cleanest secure model

1. **Email alone is never proof of ownership.** Anyone can type `mike@…`. Guest auth is the **guest_token** (32 random bytes, hashed at rest). Email is recovery metadata + future claim target.
2. **Account = verified.** Magic link proves email control → `email_verified_at` set → session cookie. Guest tokens for that user are kept only as “linked devices” or revoked on “sign out everywhere.”
3. **No passwords.** Magic link only (Resend, same stack as feedback).
4. **Claim / upgrade:** Guest who enters the same email and clicks a magic link becomes Account; slots already under that `user_id` stay. If they started guest on device A and open device B, magic link is the only path (no slot listing by email without proof).
5. **Hijack resistance:** Creating a guest with someone else’s email does **not** grant access to a later verified account’s slots. Rule: on magic-link verify, if `user.email` already has `email_verified_at`, bind the **new session** to that user and **ignore** a foreign `guest_token` that points at a different unverified user. Optional merge only when the guest_token’s user_id **is** that email’s user_id.

### Identity lifecycle

```
[Title / shell]
    │
    ├─ Guest: email → POST /api/auth/guest
    │         ← guest_token (once) + session-like cookie optional
    │         store guest_token in localStorage key dunjunz-guest-token
    │
    └─ Account: email → POST /api/auth/magic-link
              ← always { ok: true } (no email enumeration)
              email click → GET /api/auth/callback?token=…
              ← Set-Cookie: dunjunz_session=…; HttpOnly; Secure; SameSite=Lax
              ← redirect /
```

### Client storage (no secrets of the server)

| Key | Contents |
| --- | --- |
| `dunjunz-save-v1` | **Active slot cache** (unchanged shape = SaveData v5 JSON) — offline play |
| `dunjunz-guest-token` | Guest bearer (only if guest mode) |
| `dunjunz-active-slot` | UUID of last selected slot (or local sentinel) |
| `dunjunz-local-slots` | Optional local multi-slot mirror (MVP phase 2) |

Session cookie is **not** readable by JS (HttpOnly). Guest token must be readable by JS for `Authorization: Bearer` on API calls (no cookie for guest so private/incognito remains simple). Prefer also setting an HttpOnly cookie for guest when same-site; Bearer remains for flexibility.

### Rate limits (server)

| Action | Limit |
| --- | --- |
| Magic link request | 3 / email / hour, 10 / IP / hour |
| Guest create | 5 / IP / hour |
| Slot write | 60 / user / min |
| Slot read | 120 / user / min |

Return 429 with `{ ok: false, error: 'rate_limited' }`. Magic-link response body is always success-shaped when email is valid format (anti-enumeration).

---

## 2. DB schema (Neon Postgres)

```sql
-- DUNJUNZ auth + slots v1
-- Neon Postgres. Run once via migration tool or neon SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT NOT NULL,          -- or TEXT + lower() unique index
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  email_verified_at TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX users_email_normalized_uidx ON users (email_normalized);

CREATE TABLE guest_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      BYTEA NOT NULL,           -- sha256(raw_token)
  label           TEXT NULL,                -- e.g. user-agent snippet
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ NULL,
  revoked_at      TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX guest_tokens_hash_uidx ON guest_tokens (token_hash);
CREATE INDEX guest_tokens_user_idx ON guest_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE magic_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      BYTEA NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,     -- now() + interval '15 minutes'
  used_at         TIMESTAMPTZ NULL,
  request_ip      INET NULL
);

CREATE UNIQUE INDEX magic_links_hash_uidx ON magic_links (token_hash);
CREATE INDEX magic_links_user_idx ON magic_links (user_id);

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      BYTEA NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,     -- now() + interval '30 days'
  revoked_at      TIMESTAMPTZ NULL,
  last_used_at    TIMESTAMPTZ NULL,
  user_agent      TEXT NULL
);

CREATE UNIQUE INDEX sessions_hash_uidx ON sessions (token_hash);
CREATE INDEX sessions_user_idx ON sessions (user_id) WHERE revoked_at IS NULL;

-- Fixed 3 slots per user: slot_index 0..2
CREATE TABLE save_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_index      SMALLINT NOT NULL CHECK (slot_index BETWEEN 0 AND 2),
  name            TEXT NOT NULL DEFAULT 'Hero',
  -- Summary for UI without loading full blob
  summary_level   INT NOT NULL DEFAULT 1,
  summary_room    TEXT NOT NULL DEFAULT 'overworld',
  summary_land    TEXT NULL,                 -- e.g. surface / dunjunz
  is_empty        BOOLEAN NOT NULL DEFAULT true,
  save_version    INT NOT NULL DEFAULT 5,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot_index)
);

CREATE INDEX save_slots_user_updated_idx ON save_slots (user_id, updated_at DESC);

-- Optional: simple rate-limit counters if not using Upstash
CREATE TABLE rate_limits (
  bucket_key      TEXT PRIMARY KEY,
  count           INT NOT NULL DEFAULT 0,
  window_start    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**If `CITEXT` unavailable:** use `email TEXT NOT NULL` + unique on `email_normalized` only (generated column already unique).

**Slot count N = 3** (classic console feel; enough for alts; cheap JSONB).

---

## 3. API routes + contracts

Shared headers:

- Guest: `Authorization: Bearer <guest_token>`
- Account: cookie `dunjunz_session=<raw>` (preferred) **or** `Authorization: Bearer <session_token>`
- JSON bodies, `Content-Type: application/json`
- CORS: same-origin only (SPA + API on dunjunz.vercel.app) — no public CORS for write routes

Auth resolution order: session cookie → Bearer session → Bearer guest.

### `POST /api/auth/guest`

**Body**
```json
{ "email": "player@example.com" }
```

**200**
```json
{
  "ok": true,
  "mode": "guest",
  "userId": "uuid",
  "email": "player@example.com",
  "emailVerified": false,
  "guestToken": "<raw 32-byte base64url — show once>",
  "slots": [ /* SlotSummary x3, empty if new */ ]
}
```

Rules:

- Validate email format (reuse feedback regex).
- Upsert user by normalized email **only if** that user is unverified **or** new. If email already **verified**, return 409:
  ```json
  { "ok": false, "error": "email_has_account", "hint": "Use magic link to sign in." }
  ```
- Create guest_token row; return raw once.
- Ensure 3 empty slots exist for user.

### `POST /api/auth/magic-link`

**Body**
```json
{ "email": "player@example.com" }
```

**200** (always if email well-formed)
```json
{ "ok": true, "message": "If that inbox exists in our realm, a link is on the way." }
```

Side effects:

- Upsert user by email if missing.
- Create magic_links row (15 min TTL).
- Resend email: subject `Your DUNJUNZ magic link`, body with `https://dunjunz.vercel.app/api/auth/callback?token=<raw>`.
- Rate limit; on limit still return 200 with same message (or 429 only for abusive IP).

### `GET /api/auth/callback?token=`

- Hash token, find unused non-expired magic_link.
- Set `email_verified_at = now()`, mark link used.
- Create session (30d); `Set-Cookie: dunjunz_session=...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`.
- Redirect `302` → `/?auth=ok` (or `/#auth=ok`).
- Invalid/expired → `302` → `/?auth=error`.

### `GET /api/auth/me`

**200**
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "player@example.com",
    "emailVerified": true,
    "mode": "account"
  }
}
```
**401** `{ "ok": false, "error": "unauthorized" }`

### `POST /api/auth/logout`

- Revoke session (and optionally clear cookie).
- Guest: client drops `dunjunz-guest-token` (server may revoke if Bearer guest sent).

### `GET /api/slots`

Auth required.

**200**
```json
{
  "ok": true,
  "slots": [
    {
      "id": "uuid",
      "slotIndex": 0,
      "name": "Sir Stabby",
      "isEmpty": false,
      "summaryLevel": 7,
      "summaryRoom": "dunjunz-b2",
      "summaryLand": "dunjunz",
      "updatedAt": "2026-07-20T18:00:00.000Z"
    },
    { "id": "uuid", "slotIndex": 1, "name": "Empty", "isEmpty": true, "summaryLevel": 1, "summaryRoom": "overworld", "summaryLand": null, "updatedAt": "..." },
    { "id": "uuid", "slotIndex": 2, "name": "Empty", "isEmpty": true, "summaryLevel": 1, "summaryRoom": "overworld", "summaryLand": null, "updatedAt": "..." }
  ]
}
```

### `POST /api/slots` — create/start in empty slot

**Body**
```json
{ "slotIndex": 1, "name": "New Hero" }
```

**200** `{ "ok": true, "slot": { ...SlotSummary, "isEmpty": false }, "data": { /* default SaveData v5 */ } }`  
**409** if slot not empty.

### `GET /api/slots/:id`

**200** `{ "ok": true, "slot": SlotSummary, "data": SaveData }`  
**404** if not owned / missing.

### `PUT /api/slots/:id`

**Body**
```json
{
  "name": "Sir Stabby",
  "data": { /* full SaveData v5 */ },
  "expectedUpdatedAt": "2026-07-20T18:00:00.000Z"
}
```

- Validate `data.version === 5` (or ≤5 and migrate server-side with same rules as client if needed).
- Max JSON size **256 KB** (reject 413).
- Optimistic concurrency: if `expectedUpdatedAt` provided and mismatches, **409** `{ ok:false, error:'conflict', slot, data }`.
- Update summary fields from data: level, roomId, landsCleared tail, is_empty=false.

**200** `{ "ok": true, "slot": SlotSummary }`

### `DELETE /api/slots/:id`

Soft-empty: reset to default empty shell, keep slot_index row.

**200** `{ "ok": true, "slot": empty SlotSummary }`

### `POST /api/slots/import-local` (migration helper)

**Body**
```json
{ "slotIndex": 0, "name": "Imported", "data": { /* SaveData from localStorage */ } }
```

- Only if target slot empty **or** `force: true`.
- Used once after first login to hoist `dunjunz-save-v1`.

---

## 4. Magic link flow (sequence)

```
Client                         API                         Resend              Neon
  |-- POST /auth/magic-link --> |                            |                   |
  |                             |-- rate limit ------------> |                   |
  |                             |-- upsert user / insert link ------------------>|
  |                             |-- send email ------------> |                   |
  |<- { ok:true } --------------|                            |                   |
  |                             |                            |-- inbox --------->|
  User clicks link
  |-- GET /auth/callback?token ->|                           |                   |
  |                             |-- verify hash / unused ------------------------>|
  |                             |-- set verified + session ---------------------->|
  |<- 302 Set-Cookie -----------|                            |                   |
  |-- GET /api/me + /api/slots -> … cloud UI
```

Email template (plain + HTML):

- From: `DUNJUNZ <support@neasemedia.com>` (or `AUTH_FROM` / `RESEND_FROM`)
- CTA: “Enter the dunjunz (link expires in 15 minutes)”
- No account creation language that implies password.

---

## 5. Slot model (client behavior)

| Action | Local | Cloud (when authed) |
| --- | --- | --- |
| List | TitleScene reads cache + optional local multi-slot | `GET /api/slots` |
| Load | `loadSave()` from `dunjunz-save-v1` | `GET /api/slots/:id` → write into local cache → Game |
| Save | `writeSave` always local first | debounced `PUT` (2s) after local write; flush on pause / title / shutdown |
| New | clear local / empty slot | `POST /api/slots` or DELETE then play |
| Delete | clear key | `DELETE /api/slots/:id` |

**Active slot:** `dunjunz-active-slot` = cloud UUID.  
**Offline:** keep writing local; queue last PUT body; on next online `PUT` with conflict handling (prefer newer `updatedAt` / prompt “cloud has newer — keep cloud / keep local”).

**MVP conflict UX:** last-write-wins with `expectedUpdatedAt` optional; on 409, auto-prefer cloud and toast “cloud progress restored.”

---

## 6. Client UI placement

### Shell (HTML/DOM) — identity only

Mirror feedback modal pattern (`index.html` + `src/ui/auth.ts`):

- Footer control: **Sign in** / shows masked email when authed
- Modal:
  - Email field
  - **Continue as guest** (requires email)
  - **Email me a magic link**
  - Status: “Check your mail…” / errors
- After guest or verified: close modal, set `window.__DUNJUNZ_AUTH` or `CustomEvent('dunjunz-auth')` so Phaser refreshes

**Why shell:** real `<input type="email">`, autocomplete, mobile keyboards, a11y — Phaser text entry is painful.

### Phaser TitleScene — play + slots

```
DUNJUNZ
…
[ if not authed: "ENTER PLAY LOCAL   ·   SIGN IN IN PAGE FOOTER" ]
[ if authed:     slot list 1/2/3 with name · Lv · land · time ]
                 ↑↓ select · ENTER load · N new on empty · D delete
                 R was "new game" → now "wipe selected slot" with confirm
[ always:        offline local continue if local save has progress ]
```

Keep keyboard-first. Do not force auth to play: **local anonymous path remains** (no email) for pure offline fun — product said guest requires email **when choosing Guest** for cloud identity; pure local without cloud is still allowed as “just play” without cloud slots.

**Product clarification (council):**

| Path | Email? | Cloud? |
| --- | --- | --- |
| **Just play (local)** | No | No — localStorage only (current behavior) |
| **Guest** | Yes | Yes — guest_token |
| **Account** | Yes + magic link | Yes — session |

This preserves “do not break existing local play path.”

---

## 7. Env vars

| Name | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Vercel | Neon pooled connection string |
| `RESEND_API_KEY` | Vercel | Existing |
| `RESEND_FROM` / `AUTH_FROM` | Vercel | Magic link From (default support@) |
| `AUTH_SESSION_SECRET` | Vercel | Optional HMAC if you sign cookies; not required if random token + hash DB |
| `AUTH_BASE_URL` | Vercel | `https://dunjunz.vercel.app` for link generation |
| `MAGIC_LINK_TTL_MIN` | optional | default 15 |
| `SESSION_TTL_DAYS` | optional | default 30 |
| `FEEDBACK_TO` | existing | unchanged |

**Never** ship DB URL or Resend key to client. Vite only gets public `VITE_*` if needed (none required for auth if same-origin `/api`).

Local dev: `.env` for `vercel dev` or dual path — Vite frontend + `vercel dev` API.

---

## 8. File-level implementation order

1. **`docs/sql/001_auth_slots.sql`** — schema above  
2. **`api/_lib/db.ts`** — Neon client (`@neondatabase/serverless`)  
3. **`api/_lib/crypto.ts`** — `randomToken()`, `sha256(token)`, cookie helpers  
4. **`api/_lib/auth.ts`** — resolveRequestUser(req), rate limit helpers  
5. **`api/_lib/mail.ts`** — shared Resend send (factor from feedback)  
6. **`api/auth/guest.ts`**  
7. **`api/auth/magic-link.ts`**  
8. **`api/auth/callback.ts`**  
9. **`api/auth/me.ts`**, **`api/auth/logout.ts`**  
10. **`api/slots/index.ts`** — GET list, POST create  
11. **`api/slots/[id].ts`** — GET / PUT / DELETE  
12. **`api/slots/import-local.ts`**  
13. **`src/systems/auth-client.ts`** — fetch wrappers, token storage  
14. **`src/systems/cloud-save.ts`** — debounce PUT, import-local, conflict  
15. **`src/systems/save.ts`** — keep pure local; optional hook `onAfterWrite`  
16. **`src/ui/auth.ts` + `index.html`** — sign-in modal  
17. **`src/scenes/TitleScene.ts`** — slot picker when authed; preserve local  
18. **`src/scenes/GameScene.ts`** — call cloud flush on existing writeSave sites via wrapper  
19. **`.env.example`**, **`README.md`**, **`CHANGELOG.md`**  
20. **`package.json`** — add `@neondatabase/serverless`  
21. Vitest: pure helpers (normalize email, summary-from-save, token hash)

Do **not** put secrets in Phaser bundles.

---

## 9. Acceptance tests / manual QA

### Automated (vitest)

- [ ] Email normalize + validate  
- [ ] `summaryFromSave(SaveData)` → level/room/land  
- [ ] Magic/guest token hash stability  
- [ ] Slot index bounds 0..2  
- [ ] SaveData size guard helper  

### Manual QA

1. **Local unbroken:** clear site data → ENTER → play → refresh → continue (no auth).  
2. **Guest:** Sign in → guest with email → 3 empty slots → name slot 0 → play → reload → still guest → progress on slot 0.  
3. **Guest token theft resistance:** different browser without token cannot list slots.  
4. **Magic link:** request link → click → cookie set → `/api/auth/me` verified → same slots.  
5. **Verified email blocks new guest** on that email (409).  
6. **Rate limit:** 4th magic link in an hour → still no spam (check Resend log).  
7. **Import:** existing local save after first guest/account → import into empty slot.  
8. **Delete slot:** empty again; local cache cleared if it was active.  
9. **Offline:** disable network mid-run → local still saves; re-enable → sync.  
10. **Conflict:** two tabs; last PUT 409 path does not corrupt JSON.  
11. **Logout:** session gone; guest token cleared when user chooses “forget this device.”  
12. **Feedback API** still works unchanged.

---

## 10. Phased MVP

### Phase A — ship first (1 focused PR)

- Neon schema  
- Guest create + session-less guest_token auth  
- Slots list/load/save/delete (3)  
- Shell guest email modal  
- TitleScene simple slot list when guestToken present  
- Local play still default if no guest  
- Import local once  

**Skip in A:** magic link, verified account, multi-device claim.

### Phase B — magic link account

- magic-link + callback + session cookie  
- `/me`, logout  
- Block guest on verified email  
- Footer “Account” vs “Guest” badge  

### Phase C — polish

- Debounced cloud sync + conflict UI  
- Local multi-slot mirror without cloud (optional)  
- “Sign out all devices”  
- Admin/export  

---

## Waggle — UX risks (addressed)

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Auth walls first play | **Critical** | Local “just play” remains zero-friction |
| Phaser email input | High | Shell DOM modal only |
| Guest email feels fake | Medium | Copy: “Email saves your run if you switch browsers (we’ll send a link).” |
| 3 slots vs 1 local key confusion | Medium | Active slot always mirrored to `dunjunz-save-v1`; title shows which slot |
| Magic link tab on phone | Medium | Deep link back to same origin; short TTL messaging |
| R = wipe habits | Low | Confirm “Wipe slot N?” when cloud; local R stays nuclear clear |

## Hexis — security notes

- Store **only hashes** of guest / session / magic tokens (`sha256`).  
- Magic link single-use + 15m expiry.  
- No email enumeration on magic-link endpoint.  
- JSONB size cap; no server-side eval of save.  
- SameSite=Lax cookies; Secure in prod.  
- Parameterized SQL only (`@neondatabase/serverless`).  
- Do not log raw tokens or full save blobs.

---

## Dependencies to add

```json
"@neondatabase/serverless": "^0.10.0"
```

(Resend already present.)

---

## Out of scope

- Full multiplayer  
- OAuth / passkeys (future nice)  
- End-to-end encrypted saves (saves are game state, not sensitive PII beyond email)  
- Password auth  

---

## Council sign-off

| Agent | Verdict |
| --- | --- |
| **Scout** | Facts verified against repo; single local save; feedback Resend path reusable |
| **Waggle** | Require local no-auth path; shell for email; slots in TitleScene |
| **Hexis** | Guest-token soft identity + magic-link verified account; 3 slots; Neon schema + route contracts above |
| **EMA** | Recommend **Phase A first**, then B; this doc is the implementation contract |
