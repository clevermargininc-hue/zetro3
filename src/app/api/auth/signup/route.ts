import { NextResponse } from "next/server";
import { hasFirstAndLastName, looksLikeBotName } from "@/lib/bot-signup";
import { countryFromHeaders, isAllowedCountry } from "@/lib/geo";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const country = countryFromHeaders(request.headers);
  const abroad = country ? !isAllowedCountry(country) : process.env.NODE_ENV === "production";
  if (abroad) {
    return NextResponse.json({ error: "Zetro is only available in Tanzania." }, { status: 403 });
  }

  const limited = rateLimit(`signup:${clientKey(request)}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Wait an hour and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    companyWebsite?: unknown;
  };

  if (String(body.companyWebsite || "").trim()) {
    return NextResponse.json({ ok: true, confirm: true });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim();
  if (!email || !email.includes("@") || password.length < 6) {
    return NextResponse.json({ error: "Enter a work email and a password of at least 6 characters." }, { status: 400 });
  }
  if (!hasFirstAndLastName(fullName) || looksLikeBotName(fullName)) {
    return NextResponse.json({ error: "Enter your first and last name." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: new URL("/auth/callback?next=/auth/continue", request.url).toString(),
    },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user && looksLikeBotName(data.user.user_metadata?.full_name)) {
    await createAdminClient().auth.admin.deleteUser(data.user.id).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    return NextResponse.json({ error: "Enter your first and last name." }, { status: 400 });
  }

  if (!data.session) {
    return NextResponse.json({ ok: true, confirm: true });
  }
  return NextResponse.json({ ok: true });
}
