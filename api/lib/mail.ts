import { Resend } from 'resend';

const FROM =
  process.env.AUTH_FROM?.trim() ||
  process.env.RESEND_FROM?.trim() ||
  'DUNJUNZ <support@neasemedia.com>';

const SUPPORT_TO =
  process.env.SIGNUP_NOTIFY_TO?.trim() ||
  process.env.FEEDBACK_TO?.trim() ||
  'support@neasemedia.com';

export async function sendMagicLinkEmail(
  to: string,
  link: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('RESEND_API_KEY not configured');

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: 'Your DUNJUNZ sign-in link',
    text: [
      'Sign in to DUNJUNZ (magic link — expires in 15 minutes):',
      '',
      link,
      '',
      'If you did not request this, ignore this email.',
      '— NeaseMedia',
    ].join('\n'),
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5">
        <h2>DUNJUNZ sign-in</h2>
        <p>Click to sign in (link expires in <strong>15 minutes</strong>):</p>
        <p><a href="${link}">${link}</a></p>
        <p style="color:#666;font-size:13px">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message || JSON.stringify(error));
}

export type NewPlayerNotifyKind = 'guest' | 'magic_link';

/**
 * Notify ops when a brand-new users row is created.
 * Never throws — signup must succeed even if mail is down.
 */
export async function notifySupportNewPlayer(opts: {
  email: string;
  userId: string;
  kind: NewPlayerNotifyKind;
  requestIp?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn('[mail] new-player notify skipped: RESEND_API_KEY missing');
    return { sent: false, reason: 'no_resend_key' };
  }

  const when = new Date().toISOString();
  const kindLabel =
    opts.kind === 'guest' ? 'Guest play (email saved)' : 'Magic-link account';
  const subject = `[DUNJUNZ] New player: ${opts.email}`;
  const text = [
    'New DUNJUNZ player signed up.',
    '',
    `Email: ${opts.email}`,
    `User id: ${opts.userId}`,
    `Path: ${kindLabel}`,
    `When (UTC): ${when}`,
    opts.requestIp ? `IP: ${opts.requestIp}` : null,
    '',
    '— dunjunz.com auth',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;max-width:520px">
      <h2 style="margin:0 0 12px">New DUNJUNZ player</h2>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Email</td><td><strong>${escapeHtml(opts.email)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">User id</td><td style="font-family:monospace;font-size:12px">${escapeHtml(opts.userId)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Path</td><td>${escapeHtml(kindLabel)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">When (UTC)</td><td>${escapeHtml(when)}</td></tr>
        ${
          opts.requestIp
            ? `<tr><td style="padding:4px 12px 4px 0;color:#555">IP</td><td>${escapeHtml(opts.requestIp)}</td></tr>`
            : ''
        }
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">Automated notice from dunjunz.com auth.</p>
    </div>
  `;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [SUPPORT_TO],
      subject,
      text,
      html,
    });
    if (error) {
      console.error('[mail] new-player notify failed:', error);
      return { sent: false, reason: error.message || 'resend_error' };
    }
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[mail] new-player notify error:', msg);
    return { sent: false, reason: msg.slice(0, 200) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Best-effort client IP from Vercel / proxies. */
export function clientIpFromReq(headers: {
  [key: string]: string | string[] | undefined;
}): string | undefined {
  const xf = headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0]!.trim().slice(0, 80);
  }
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).slice(0, 80);
  const real = headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim().slice(0, 80);
  return undefined;
}
