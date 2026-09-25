/** Inbox for contracts, payment, and sales deals. There is no online checkout. */
export const SALES_EMAIL = "Clevermargininc@gmail.com";

export function salesMailto(subject: string, body?: string) {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${SALES_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
}
