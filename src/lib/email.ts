export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] || char;
  });
}

function fromAddresses() {
  return [
    process.env.RESEND_FROM?.trim(),
    "Zetro <beth.t@example.com>",
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
}

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is missing. Add it in .env.local and in Vercel env vars.");
  }

  let lastError = "Resend could not send the email.";
  for (const from of fromAddresses()) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    if (response.ok) return;
    lastError = body.message || `Resend returned ${response.status}.`;
    if (!/domain|verified|from|testing emails/i.test(lastError)) break;
  }
  throw new Error(lastError);
}
