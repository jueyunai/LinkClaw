/**
 * Lightweight email notification service for MVP.
 *
 * Supports two providers:
 *   - resend: Resend API (https://resend.com) — recommended, generous free tier
 *   - log:    Console-only (development fallback)
 *
 * Environment variables:
 *   EMAIL_PROVIDER        = "resend" | "log"  (default: "log")
 *   EMAIL_API_KEY         = Resend API key
 *   EMAIL_FROM            = Sender address, e.g. "LinkClaw <noreply@linkclaw.app>"
 *   EMAIL_REPLY_TO        = Optional reply-to address
 *   NEXT_PUBLIC_APP_URL   = App base URL for links in emails
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type EmailProvider = 'resend' | 'log';

function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? 'log') as EmailProvider;
  return {
    provider,
    apiKey: process.env.EMAIL_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? 'LinkClaw <noreply@linkclaw.app>',
    replyTo: process.env.EMAIL_REPLY_TO,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
}

async function sendViaResend(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();

  if (!config.apiKey) {
    console.warn('[Email] EMAIL_API_KEY not set, falling back to log provider');
    return sendViaLog(payload);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: config.replyTo,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Email] Resend API error:', response.status, body);
      return { success: false, error: `Resend API ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Resend send failed:', message);
    return { success: false, error: message };
  }
}

async function sendViaLog(payload: EmailPayload): Promise<{ success: boolean }> {
  console.log('[Email] 📧 Would send email:');
  console.log(`  To:      ${payload.to}`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  Body:    ${payload.text ?? '(HTML only)'}`);
  return { success: true };
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const { provider } = getEmailConfig();

  switch (provider) {
    case 'resend':
      return sendViaResend(payload);
    case 'log':
    default:
      return sendViaLog(payload);
  }
}
