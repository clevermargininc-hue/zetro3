import { createClient as createJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { durableFetch } from "@/lib/durable-fetch";

export async function getRequestUser(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    const tokenClient = createJsClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: durableFetch as typeof fetch,
      },
    });
    const {
      data: { user },
      error,
    } = await tokenClient.auth.getUser(token);
    if (!error && user) {
      return { user, supabase: tokenClient };
    }
  }

  const cookieClient = await createClient();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();
  return { user: cookieUser, supabase: cookieClient };
}
