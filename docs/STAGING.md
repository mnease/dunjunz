# Dunjunz staging vs production

**Imperative:** Active users only get code when you **intentionally promote** to production. Day-to-day work happens on the **staging branch**, never on `main`.

## Environments

| Environment | Git branch | URLs | When it updates |
| --- | --- | --- | --- |
| **Production** | `main` only | https://www.dunjunz.com · https://dunjunz.com | Only when `main` advances (scheduled / deliberate merge) |
| **Staging (dev)** | `graphics-v2` | https://graphics.dunjunz.com · https://dunjunz-graphics-v2.vercel.app · https://dunjunz-git-graphics-v2-neasemedia.vercel.app | Every push to `graphics-v2` |

Vercel **production branch** = `main`.  
Staging domain **graphics.dunjunz.com** is bound to git branch **`graphics-v2`** (auto-points at latest branch deploy).

## Daily workflow (dev / staging)

```bash
cd /path/to/dunjunz
git fetch origin
git checkout graphics-v2
git pull origin graphics-v2

# …implement, test…
npm test
git add -A
git commit -m "…"
git push origin graphics-v2
```

Then playtest on **staging only**:

- Primary: https://graphics.dunjunz.com/play/
- Alias: https://dunjunz-graphics-v2.vercel.app/play/
- Auto git URL: https://dunjunz-git-graphics-v2-neasemedia.vercel.app/play/

**Do not** `git push origin main` for WIP.  
**Do not** cherry-pick experimental graphics onto `main` until a release.

## Promote staging → production (scheduled release)

When staging is baked and you want live users to get it:

```bash
# From a clean tree
./scripts/promote-staging-to-production.sh
# or manually:
git checkout main && git pull origin main
git merge --no-ff graphics-v2 -m "release: promote graphics-v2 staging to production"
git push origin main
```

That single push to `main` is what redeploys **www.dunjunz.com**.

### Release checklist

1. Staging looks correct on https://graphics.dunjunz.com/play/
2. `npm test` green on `graphics-v2`
3. You intend a **production** ship (schedule / note to self)
4. Run promote script (or merge PR `graphics-v2` → `main`)
5. Smoke production after deploy
6. Resume work on `graphics-v2` for the next batch

## Hotfixes

Prefer: fix on `graphics-v2` → quick bake on staging → promote.

Emergency only: fix on `main` **and** merge/cherry-pick back into `graphics-v2` so staging does not regress.

## Agent / AI rule

- Default branch for Dunjunz feature work: **`graphics-v2`**
- Production (`main`) only for: promote merges, true emergencies, or docs the operator explicitly wants live
- Never assume “push to main” for graphics, world, or gameplay experiments

## Alias note

`dunjunz-graphics-v2.vercel.app` is a stable short name. A GitHub Action re-points it after each `graphics-v2` push (requires `VERCEL_TOKEN` repo secret).  
`graphics.dunjunz.com` and the `*-git-graphics-v2-*` URL track the branch via Vercel git integration without that secret.

## Related

- Graphics rebuild plan: [`graphics-v2-rebuild-plan.md`](./graphics-v2-rebuild-plan.md)
- Style Bible: [`graphics-v2-style-bible.md`](./graphics-v2-style-bible.md)
