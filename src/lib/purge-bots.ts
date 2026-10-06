import { looksLikeBotName } from "@/lib/bot-signup";
import { fetchAllRows } from "@/lib/fetch-all";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

/** Drop leftover random-name accounts that never joined a workspace. Capped so one page load stays small. */
export async function purgeWorkspaceLessBots(limit = 20) {
  const db = createAdminClient();
  const [profiles, members] = await Promise.all([
    fetchAllRows<{ id: string; full_name: string | null; email: string | null }>((from, to) =>
      db.from("profiles").select("id, full_name, email").order("id").range(from, to),
    ),
    fetchAllRows<{ user_id: string }>((from, to) =>
      db.from("workspace_members").select("user_id").order("user_id").range(from, to),
    ),
  ]);
  if (profiles.error || members.error) return;
  const memberIds = new Set(members.data.map((row) => row.user_id));
  let removed = 0;
  for (const row of profiles.data) {
    if (removed >= limit) break;
    if (memberIds.has(row.id)) continue;
    if (isPlatformAdmin(row.email)) continue;
    if (!looksLikeBotName(row.full_name)) continue;
    const { error } = await db.auth.admin.deleteUser(row.id);
    if (!error) removed += 1;
  }
}
