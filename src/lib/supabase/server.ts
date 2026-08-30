import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getPublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. Middleware refreshes the session.
        }
      },
    },
  });
}

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const pathname = (await headers()).get("x-zetro-pathname") || "";
    const next =
      pathname.startsWith("/") && !pathname.startsWith("//") && pathname !== "/login"
        ? pathname
        : "";
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return { supabase, user };
});
