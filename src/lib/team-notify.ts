import { SALES_EMAIL } from "@/lib/contact";
import { escapeHtml, sendResendEmail } from "@/lib/email";

/** Best-effort email to the sales inbox. The database row is the record; this is only a ping. */
export async function notifyTeam(subject: string, lines: string[]) {
  if (!process.env.RESEND_API_KEY?.trim()) return;
  const text = lines.join("\n");
  try {
    await sendResendEmail({
      to: SALES_EMAIL,
      subject,
      text,
      html: `<pre style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(text)}</pre>`,
    });
  } catch (error) {
    console.error("Team notification failed:", error instanceof Error ? error.message : error);
  }
}
