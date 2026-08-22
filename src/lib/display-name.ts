export function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(normalizeUsername(value));
}

export function publicName(profile: {
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
}) {
  const username = normalizeUsername(profile.username || "");
  if (username) return username;
  const name = (profile.fullName || "").trim().split(/\s+/)[0];
  if (name) return name;
  return (profile.email || "").split("@")[0] || "User";
}

export function suggestUsername(email: string, fullName?: string | null) {
  const fromName = (fullName || "").trim().split(/\s+/)[0] || "";
  const raw = (fromName || email.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);
  if (/^[a-z][a-z0-9_]{2,23}$/.test(raw)) return raw;
  const padded = `u${raw}`.replace(/[^a-z0-9_]+/g, "").slice(0, 24);
  return padded.length >= 3 ? padded : "user";
}
