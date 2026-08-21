import { createClient as createJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";

export async function getRequestUser(request: Request) {
  const cookieClient = await createClient();
  const {
    data: { user: cookieUser },
  } = await cookieClient.auth.getUser();
  if (cookieUser) {
    return { user: cookieUser, supabase: cookieClient };
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return { user: null, supabase: cookieClient };
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  const tokenClient = createJsClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await tokenClient.auth.getUser(token);
  if (error || !user) {
    return { user: null, supabase: cookieClient };
  }
  return { user, supabase: tokenClient };
}
