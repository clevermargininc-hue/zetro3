export const WORKSPACE_COOKIE = "zetro-workspace";

export function clearWorkspaceCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${WORKSPACE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function setWorkspaceCookie<T extends { cookies: { set: (name: string, value: string, options?: object) => void } }>(
  response: T,
) {
  response.cookies.set(WORKSPACE_COOKIE, "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
  });
  return response;
}
