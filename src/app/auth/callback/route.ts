import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }
  return value;
}

function redirectUrl(request: NextRequest, next: string) {
  const origin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${next}`;
  }
  return `${origin}${next}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));
  const origin = new URL(request.url).origin;

  const isPasswordRecovery = next === "/reset-password" || type === "recovery";

  // If neither code nor token_hash is present, redirect with an error
  if (!code && !tokenHash) {
    if (isPasswordRecovery) {
      return NextResponse.redirect(`${origin}/forgot-password?error=missing_code`);
    }
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  let redirect = NextResponse.redirect(redirectUrl(request, next));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        redirect = NextResponse.redirect(redirectUrl(request, next));
        cookiesToSet.forEach(({ name, value, options }) => {
          redirect.cookies.set(name, value, options);
        });
      },
    },
  });

  // Handle token_hash flow (used by Supabase email links for recovery, signup confirmation, etc.)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "signup" | "email",
    });
    if (error) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(
          `${origin}/forgot-password?error=${encodeURIComponent("Reset link expired or already used. Please request a new one.")}`,
        );
      }
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
    return redirect;
  }

  // Handle code exchange flow (PKCE)
  const { error } = await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    if (isPasswordRecovery) {
      // For password recovery, redirect back to forgot-password with a friendly message
      return NextResponse.redirect(
        `${origin}/forgot-password?error=${encodeURIComponent("Reset link expired or was opened in a different browser. Please request a new one.")}`,
      );
    }
    const message = /pkce|verifier/i.test(error.message)
      ? "oauth_pkce"
      : error.message;
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  return redirect;
}
