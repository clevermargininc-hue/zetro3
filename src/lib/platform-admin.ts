import { SALES_EMAIL } from "@/lib/contact";

/** Zetro staff who can open /admin. Override with ADMIN_EMAILS="a@x.com,b@y.com". */
export function platformAdminEmails() {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const list = (raw ? raw.split(",") : [SALES_EMAIL]).map((email) => email.trim().toLowerCase()).filter(Boolean);
  return new Set(list);
}

export function isPlatformAdmin(email: string | null | undefined) {
  return Boolean(email) && platformAdminEmails().has(email!.trim().toLowerCase());
}
