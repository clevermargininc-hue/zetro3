import type { User } from "@supabase/supabase-js";
import { sendResendEmail, escapeHtml } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstNameFrom } from "@/lib/workspaces";

const WELCOME_FLAG = "welcome_email_sent_at";
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

function isNewAccount(createdAt: string | undefined) {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created < NEW_ACCOUNT_MS;
}

function alreadySent(user: User) {
  const stamp = user.app_metadata?.[WELCOME_FLAG];
  return typeof stamp === "string" && stamp.length > 0;
}

async function setWelcomeFlag(user: User, value: string | null) {
  const supabase = createAdminClient();
  const nextMeta = { ...user.app_metadata };
  if (value) nextMeta[WELCOME_FLAG] = value;
  else delete nextMeta[WELCOME_FLAG];
  await supabase.auth.admin.updateUserById(user.id, { app_metadata: nextMeta });
}

function welcomeHtml(firstName: string, origin: string) {
  const safeName = escapeHtml(firstName);
  const url = `${origin.replace(/\/$/, "")}/onboarding`;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1A56DB;">Zetro</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">Thank you for joining Zetro</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">Thank you for joining Zetro. We are glad you are here.</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">You can now upload calls, transcribe conversations, and score agent quality from real evidence — so your team can coach faster and deliver better customer service.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:#1A56DB;border-radius:8px;">
                      <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                        Open Zetro
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">If the button does not work, open this link:<br><a href="${url}" style="color:#1A56DB;">${escapeHtml(url)}</a></p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b;">— The Zetro team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export async function maybeSendWelcomeEmail(user: User | null | undefined, origin: string) {
  try {
    const email = user?.email?.trim();
    if (!user || !email) return false;
    if (alreadySent(user) || !isNewAccount(user.created_at)) return false;
    if (!process.env.RESEND_API_KEY?.trim()) return false;

    const firstName = firstNameFrom(
      (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        "",
      email,
    );
    const sentAt = new Date().toISOString();
    await setWelcomeFlag(user, sentAt);

    try {
      await sendResendEmail({
        to: email,
        subject: "Thank you for joining Zetro",
        html: welcomeHtml(firstName, origin),
        text: `Hi ${firstName},\n\nThank you for joining Zetro. We are glad you are here.\n\nYou can now upload calls, transcribe conversations, and score agent quality from real evidence.\n\nOpen Zetro: ${origin.replace(/\/$/, "")}/onboarding\n\n— The Zetro team`,
      });
      return true;
    } catch (error) {
      await setWelcomeFlag(user, null).catch(() => undefined);
      console.error("Welcome email failed:", error instanceof Error ? error.message : error);
      return false;
    }
  } catch (error) {
    console.error("Welcome email skipped:", error instanceof Error ? error.message : error);
    return false;
  }
}
