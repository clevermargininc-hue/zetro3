import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import { durableFetch } from "@/lib/durable-fetch";

export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: durableFetch as typeof fetch,
    },
  });
}
