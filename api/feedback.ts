/**
 * Vercel serverless: POST /api/feedback
 * Sends player feedback to support@neasemedia.com via SMTP.
 *
 * Required env (Vercel project → Settings → Environment Variables):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Optional:
 *   SMTP_FROM, FEEDBACK_TO (default support@neasemedia.com)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const FEEDBACK_TO = process.env.FEEDBACK_TO?.trim() || 'support@neasemedia.com';
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 4000;

export interface FeedbackBody {
  name?: string;
  email?: string;
  message?: string;
  /** Honeypot — bots fill this; humans leave empty. */
  website?: string;
}

export function validateFeedback(body: FeedbackBody): {
  ok: true;
  name: string;
  email: string;
  message: string;
} | { ok: false; error: string } {
  if (body.website && String(body.website).trim() !== '') {
    // Silent success path for bots — handled by caller
    return { ok: false, error: 'honeypot' };
  }
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!name || name.length > MAX_NAME) {
    return { ok: false, error: 'Name is required (max 120 chars).' };
  }
  if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'A valid email is required.' };
  }
  if (!message || message.length < 5) {
    return { ok: false, error: 'Message is too short.' };
  }
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: 'Message is too long (max 4000 chars).' };
  }
  return { ok: true, name, email, message };
}

function smtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === '1' ||
    process.env.SMTP_SECURE === 'true' ||
    port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeouts so serverless doesn't hang forever
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS: same-origin preferred; allow simple POSTs from the game origin
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  let body: FeedbackBody = {};
  try {
    body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as FeedbackBody)
        : ((req.body ?? {}) as FeedbackBody);
  } catch {
    res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
    return;
  }

  const parsed = validateFeedback(body);
  if (!parsed.ok) {
    if (parsed.error === 'honeypot') {
      // Pretend success so bots leave
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }

  if (!smtpConfigured()) {
    console.error('[feedback] SMTP not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS)');
    res.status(503).json({
      ok: false,
      error:
        'Mail is not configured on the server yet. Try again later or email support@neasemedia.com directly.',
    });
    return;
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER ||
    'noreply@neasemedia.com';

  const { name, email, message } = parsed;
  const subject = `[DUNJUNZ Feedback] ${name.slice(0, 40)}`;
  const text = [
    'DUNJUNZ player feedback',
    '======================',
    `From: ${name} <${email}>`,
    `To: ${FEEDBACK_TO}`,
    `When: ${new Date().toISOString()}`,
    '',
    message,
    '',
    '---',
    'Sent via dunjunz.vercel.app /api/feedback',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">DUNJUNZ player feedback</h2>
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p><strong>When:</strong> ${escapeHtml(new Date().toISOString())}</p>
      <hr />
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
      <hr />
      <p style="color:#666;font-size:12px">Sent via /api/feedback → ${escapeHtml(FEEDBACK_TO)}</p>
    </div>
  `;

  try {
    const transport = createTransport();
    // Verify connection when VERBOSE_SMTP=1 (optional debug on Vercel logs)
    if (process.env.VERBOSE_SMTP === '1') {
      await transport.verify();
    }
    const info = await transport.sendMail({
      from: `DUNJUNZ Feedback <${from}>`,
      to: FEEDBACK_TO,
      replyTo: `${name} <${email}>`,
      subject,
      text,
      html,
    });
    console.log('[feedback] sent', info.messageId);
    res.status(200).json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[feedback] SMTP error', msg);
    res.status(502).json({
      ok: false,
      error:
        'Could not send mail right now. Email support@neasemedia.com directly if it keeps failing.',
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
