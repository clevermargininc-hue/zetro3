import { NextResponse, type NextRequest } from "next/server";
import {
  DEV_GEO_COOKIE,
  DEV_GEO_PARAM,
  NOT_AVAILABLE_PATH,
  countryFromHeaders,
  isAllowedCountry,
  normalizeCountryCode,
} from "@/lib/geo";
import { updateSession } from "@/lib/supabase/middleware";

function visitorCountry(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const simulated = request.nextUrl.searchParams.get(DEV_GEO_PARAM);
    if (simulated) return { code: normalizeCountryCode(simulated), simulated };
    const cookie = normalizeCountryCode(request.cookies.get(DEV_GEO_COOKIE)?.value);
    if (cookie) return { code: cookie, simulated: null };
  }
  return { code: countryFromHeaders(request.headers), simulated: null };
}

function withDevGeoCookie(response: NextResponse, simulated: string | null, code: string | null) {
  if (simulated == null) return response;
  if (code) response.cookies.set(DEV_GEO_COOKIE, code, { path: "/", sameSite: "lax" });
  else response.cookies.delete(DEV_GEO_COOKIE);
  return response;
}

export async function proxy(request: NextRequest) {
  const { code, simulated } = visitorCountry(request);
  const path = request.nextUrl.pathname;

  const countryKnown = Boolean(code);
  const blocked =
    path !== NOT_AVAILABLE_PATH &&
    !isAllowedCountry(code) &&
    (countryKnown || process.env.NODE_ENV === "production");
  if (blocked) {
    if (path === "/api/waitlist" || path === "/api/sales") {
      return withDevGeoCookie(NextResponse.next(), simulated, code);
    }
    if (path.startsWith("/api/")) {
      return withDevGeoCookie(
        NextResponse.json({ error: "Zetro is only available in Tanzania." }, { status: 403 }),
        simulated,
        code,
      );
    }
    const dest = request.nextUrl.clone();
    dest.pathname = NOT_AVAILABLE_PATH;
    dest.search = "";
    if (code) dest.searchParams.set("country", code);
    return withDevGeoCookie(NextResponse.redirect(dest), simulated, code);
  }

  return withDevGeoCookie(await updateSession(request), simulated, code);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
