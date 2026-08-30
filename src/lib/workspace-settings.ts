import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUsername, nameFromAuthUser, normalizeUsername } from "@/lib/display-name";

export async function getAutoAudit(_userId: string) {
  return false;
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
  if (!value) return;
  if (!isValidUsername(value)) {
    throw new Error("Usernames are 3–24 characters: start with a letter, then letters, numbers, or _.");
  }
  const supabase = createAdminClient();
  const { data: taken, error: takenError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", value)
    .neq("id", userId)
    .maybeSingle();
  if (takenError && (takenError.code === "PGRST204" || /username/i.test(takenError.message))) {
    return;
  }
  if (takenError) throw new Error(takenError.message);
  if (taken) throw new Error("That username is taken.");
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: value }, { onConflict: "id" });
  if (error) {
    if (error.code === "PGRST204" || error.message.toLowerCase().includes("username")) {
      return;
    }
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("That username is taken.");
    }
    throw new Error(error.message);
  }
}

export async function syncProfileFromAuth(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  const nextName = nameFromAuthUser(user);
  const email = (user.email || "").toLowerCase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const fullName = (existing?.full_name as string | undefined)?.trim() || nextName;
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, email: email || (existing?.email as string) || "", full_name: fullName },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return fullName;
}

export async function setAutoAudit(_userId: string, _autoAudit: boolean) {
  throw new Error(
    "Automatic auditing is not allowed. Start a documents audit after the transcript is ready.",
  );
}
