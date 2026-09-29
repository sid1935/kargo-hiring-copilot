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
  /** The address the email actually went to — differs from the input when
   * TEST_EMAIL_OVERRIDE is set. */
  actualTo: string;
}

/**
 * Sends an email via Resend, or logs it instead when DRY_RUN is true
 * (the default). This is only ever called from the one-click "Send" action
 * in the dashboard — nothing in this app calls it on a timer.
 *
 * When TEST_EMAIL_OVERRIDE is set, every real send is redirected there
 * instead of the candidate's actual address — a guardrail for testing real
 * sends without an unverified Resend domain (which can only deliver to the
 * account's own signup address anyway) or without risking a real send to a
 * shared/placeholder inbox in test data.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would send email to ${input.to}\nSubject: ${input.subject}\n\n${input.body}\n`,
    );
    return { dryRun: true, providerId: null, actualTo: input.to };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");

  const to = process.env.TEST_EMAIL_OVERRIDE || input.to;

  const resend = getResend();
  const result = await resend.emails.send({
    from,
    to,
    subject: input.subject,
    text: input.body,
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { dryRun: false, providerId: result.data?.id ?? null, actualTo: to };
}

export function isDryRun(): boolean {
  return DRY_RUN;
}
