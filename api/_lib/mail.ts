import { Resend } from 'resend';

const FROM =
  process.env.AUTH_FROM?.trim() ||
  process.env.RESEND_FROM?.trim() ||
  'DUNJUNZ <support@neasemedia.com>';

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
