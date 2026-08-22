import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, normalizeUsername } from "@/lib/display-name";

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

export async function updateProfileName(userId: string, fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) throw new Error("Enter your name.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: trimmed }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function updateUsername(userId: string, username: string) {
  const value = normalizeUsername(username);
  if (!isValidUsername(value)) {
    throw new Error("Usernames are 3–24 characters: start with a letter, then letters, numbers, or _.");
  }
  const supabase = createAdminClient();
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", value)
    .neq("id", userId)
    .maybeSingle();
  if (taken) throw new Error("That username is taken.");
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: value }, { onConflict: "id" });
  if (error) {
    if (error.code === "PGRST204" || error.message.toLowerCase().includes("username")) {
      throw new Error("Run supabase/usernames.sql in the Supabase SQL Editor, then set your username.");
    }
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("That username is taken.");
    }
    throw new Error(error.message);
  }
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
