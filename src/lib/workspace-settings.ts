import { createAdminClient } from "@/lib/supabase/admin";

export async function getAutoAudit(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("auto_audit")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.auto_audit);
}

export async function setAutoAudit(userId: string, autoAudit: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, auto_audit: autoAudit },
    { onConflict: "id" },
  );
  if (error) {
    if (
      error.message.toLowerCase().includes("auto_audit") ||
      error.code === "PGRST204"
    ) {
      throw new Error(
        "Run supabase/qa-standards.sql in the Supabase SQL Editor, then turn on automatic scoring again.",
      );
    }
    throw new Error(error.message);
  }
}
