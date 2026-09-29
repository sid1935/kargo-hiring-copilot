import { Resend } from "resend";

const DRY_RUN = process.env.DRY_RUN !== "false"; // default true — safe default

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  dryRun: boolean;
  providerId: string | null;
}

/**
 * Sends an email via Resend, or logs it instead when DRY_RUN is true
 * (the default). This is only ever called from the one-click "Send" action
 * in the dashboard — nothing in this app calls it on a timer.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would send email to ${input.to}\nSubject: ${input.subject}\n\n${input.body}\n`,
    );
    return { dryRun: true, providerId: null };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");

  const resend = getResend();
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { dryRun: false, providerId: result.data?.id ?? null };
}

export function isDryRun(): boolean {
  return DRY_RUN;
}
