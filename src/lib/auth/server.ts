import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";

export function getAdminEmail() {
  const email = process.env.ANALYST_ADMIN_EMAIL?.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function getNeonAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.trim().length < 32 || !getAdminEmail())
    return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return createNeonAuth({ baseUrl, cookies: { secret }, logLevel: "silent" });
  } catch {
    return null;
  }
}

export function isAdminIdentity(
  user: { email?: unknown; emailVerified?: unknown } | null | undefined,
) {
  const admin = getAdminEmail();
  return Boolean(
    admin &&
      user?.emailVerified === true &&
      typeof user.email === "string" &&
      user.email.trim().toLowerCase() === admin,
  );
}

export async function getAdminAuthorization() {
  try {
    const auth = getNeonAuth();
    if (!auth) return "unavailable";
    const { data, error } = await auth.getSession({
      query: { disableCookieCache: "true" },
    });
    if (error) return "unavailable";
    if (!data?.user) return "unauthenticated";
    return isAdminIdentity(data.user) ? "authorized" : "forbidden";
  } catch {
    return "unavailable";
  }
}
