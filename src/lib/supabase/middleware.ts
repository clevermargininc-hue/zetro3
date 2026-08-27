import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const WORKSPACE_COOKIE = "zetro-workspace";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/talk-sales",
  "/about",
  "/how-it-works",
  "/solutions",
  "/pricing",
  "/forgot-password",
  "/reset-password",
]);

function isSafeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function markWorkspace(response: NextResponse) {
  response.cookies.set(WORKSPACE_COOKIE, "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
  });
}

function redirectWithCookies(from: NextResponse, dest: URL) {
  const redirect = NextResponse.redirect(dest);
  from.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

async function userHasWorkspace(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  if (request.cookies.get(WORKSPACE_COOKIE)?.value === "1") {
    return true;
  }
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return Boolean(data);
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const oauthCode = request.nextUrl.searchParams.get("code");

  // OAuth or Supabase email links return with ?code=. Do not call getUser()
  // first — it can overwrite the PKCE verifier cookie the callback needs.
  if (oauthCode && !path.startsWith("/auth/callback")) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    if (!callback.searchParams.get("next")) {
      callback.searchParams.set("next", path === "/" ? "/onboarding" : path);
    }
    return NextResponse.redirect(callback);
  }
  if (path.startsWith("/auth/callback")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isInvite = path.startsWith("/invite/");
  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    isInvite;

  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const next = isSafeNext(request.nextUrl.searchParams.get("next"));
    if (next?.startsWith("/invite/")) {
      return NextResponse.redirect(new URL(next.split("?")[0], request.nextUrl.origin));
    }
    const ready = await userHasWorkspace(request, supabase, user.id);
    const dest = request.nextUrl.clone();
    dest.pathname = ready === true ? "/dashboard" : "/onboarding";
    dest.search = "";
    const redirect = redirectWithCookies(response, dest);
    if (ready === true) markWorkspace(redirect);
    return redirect;
  }

  const isOnboarding = path.startsWith("/onboarding");
  if (user && isOnboarding) {
    const inviteStep = request.nextUrl.searchParams.get("step") === "invite";
    if (!inviteStep) {
      const ready = await userHasWorkspace(request, supabase, user.id);
      if (ready === true) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/dashboard";
        dest.search = "";
        const redirect = redirectWithCookies(response, dest);
        markWorkspace(redirect);
        return redirect;
      }
    }
  }

  if (user && !isPublic && !isOnboarding && !isInvite) {
    const ready = await userHasWorkspace(request, supabase, user.id);
    if (ready === false) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/onboarding";
      dest.search = "";
      return redirectWithCookies(response, dest);
    }
    if (ready === true) markWorkspace(response);
  }

  return response;
}
