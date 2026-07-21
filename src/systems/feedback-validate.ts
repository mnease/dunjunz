/**
 * Shared client/server-ish validation for feedback (unit-tested).
 * Server API re-validates with the same rules.
 */

export interface FeedbackFields {
  name: string;
  email: string;
  message: string;
  website?: string;
}

export function validateFeedbackFields(body: FeedbackFields): {
  ok: boolean;
  error?: string;
} {
  if (body.website && body.website.trim() !== '') {
    return { ok: false, error: 'honeypot' };
  }
  const name = body.name.trim();
  const email = body.email.trim();
  const message = body.message.trim();
  if (!name || name.length > 120) {
    return { ok: false, error: 'Name is required (max 120 chars).' };
  }
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'A valid email is required.' };
  }
  if (!message || message.length < 5) {
    return { ok: false, error: 'Message is too short.' };
  }
  if (message.length > 4000) {
    return { ok: false, error: 'Message is too long (max 4000 chars).' };
  }
  return { ok: true };
}
