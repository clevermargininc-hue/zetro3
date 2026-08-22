import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace-cookie";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/talk-sales", "/about", "/how-it-works", "/solutions", "/pricing"]);

async function userHasWorkspace(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<boolean | null> {
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

  // Google/Microsoft return with ?code=. Do not call getUser() first — it can
  // overwrite the PKCE verifier cookie the callback needs to exchange the code.
  if (oauthCode && !path.startsWith("/auth/callback")) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    if (!callback.searchParams.get("next")) {
      callback.searchParams.set("next", "/onboarding");
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
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
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

  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/api");

  function safeNext(value: string | null) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
    return value;
  }

  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    if (next?.startsWith("/invite/")) {
      return NextResponse.redirect(new URL(next.split("?")[0], request.nextUrl.origin));
    }
    const ready = await userHasWorkspace(request, supabase, user.id);
    const dest = request.nextUrl.clone();
    dest.pathname = ready === true ? "/dashboard" : "/onboarding";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  const isOnboarding = path.startsWith("/onboarding");
  const isInvite = path.startsWith("/invite/");
  if (user && isOnboarding) {
    const inviteStep = request.nextUrl.searchParams.get("step") === "invite";
    if (!inviteStep) {
      const ready = await userHasWorkspace(request, supabase, user.id);
      if (ready === true) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/dashboard";
        dest.search = "";
        return NextResponse.redirect(dest);
      }
    }
  }

  if (user && !isPublic && !isOnboarding && !isInvite) {
    const ready = await userHasWorkspace(request, supabase, user.id);
    if (ready === false) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/onboarding";
      dest.search = "";
      return NextResponse.redirect(dest);
    }
  }

  return response;
}
