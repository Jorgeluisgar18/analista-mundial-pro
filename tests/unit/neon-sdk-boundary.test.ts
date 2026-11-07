// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
type CookieOptions = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  path?: string;
};
const state = vi.hoisted(() => ({
  headers: new Headers(),
  writes: [] as {
    name: string;
    value: string;
    options: CookieOptions;
  }[],
  jar: new Map<string, string>(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({
    set: (name: string, value: string, options: CookieOptions) => {
      state.writes.push({ name, value, options });
      if (options.maxAge === 0) state.jar.delete(name);
      else state.jar.set(name, value);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { createNeonAuth } from "@neon/auth/next/server";
import { getAdminAuthorization } from "@/lib/auth/server";
import { signInAction, signOutAction } from "@/app/auth/sign-in/actions";
const token = "__Secure-neon-auth.session_token";
const cache = "__Secure-neon-auth.local.session_data";
const user = {
  id: "admin",
  email: "admin@example.test",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const session = {
  id: "s1",
  token: "fixture-token",
  userId: "admin",
  expiresAt: "2099-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const auth = () =>
  createNeonAuth({
    baseUrl: "https://auth.example.test/db/auth",
    cookies: { secret: "x".repeat(32) },
    logLevel: "silent",
  });
function response(body: unknown, cookie?: string, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { "set-cookie": cookie } : {}),
    },
  });
}
function restoreHeaders() {
  state.headers = new Headers({
    origin: "https://app.example.test",
    cookie: [...state.jar]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("; "),
  });
}
beforeEach(() => {
  state.writes = [];
  state.jar.clear();
  restoreHeaders();
  vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test/db/auth");
  vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "x".repeat(32));
  vi.stubEnv("ANALYST_ADMIN_EMAIL", "admin@example.test");
});
it("actual SDK forwards credentials and persists HttpOnly Secure Lax token and signed cache via Next cookies", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response(
        { user, token: "fixture-token" },
        `${token}=fixture-token; Path=/; HttpOnly; Secure; SameSite=Lax`,
      ),
    )
    .mockResolvedValueOnce(response({ user, session }));
  vi.stubGlobal("fetch", fetch);
  const form = new FormData();
  form.set("email", user.email);
  form.set("password", "fixture");
  await expect(signInAction(form)).rejects.toThrow("redirect:/");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toBe(
    "https://auth.example.test/db/auth/sign-in/email",
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    email: user.email,
    password: "fixture",
  });
  expect(state.writes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: token,
        value: "fixture-token",
        options: expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        }),
      }),
      expect.objectContaining({ name: cache }),
    ]),
  );
  restoreHeaders();
  fetch.mockClear().mockResolvedValue(response(null));
  expect((await auth().getSession()).data?.user.email).toBe(user.email);
  expect(fetch).not.toHaveBeenCalled();
  expect(await getAdminAuthorization()).toBe("unauthenticated");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain(
    "get-session?disableCookieCache=true",
  );
  expect(new Headers(fetch.mock.calls[0][1].headers).get("cookie")).toContain(
    token,
  );
});
it("actual SDK logout expires token plus minted local cache and next session cannot use either", async () => {
  state.jar.set(token, "fixture-token");
  state.jar.set(cache, "old-cache");
  restoreHeaders();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response(
        { success: true },
        `${token}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      ),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(signOutAction()).rejects.toThrow("redirect:/");
  expect(fetch.mock.calls[0][0]).toContain("/sign-out");
  expect(state.jar.size).toBe(0);
  expect(state.writes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: token,
        options: expect.objectContaining({ maxAge: 0 }),
      }),
      expect.objectContaining({
        name: cache,
        options: expect.objectContaining({ maxAge: 0 }),
      }),
    ]),
  );
  restoreHeaders();
  fetch.mockResolvedValue(response(null));
  expect(await getAdminAuthorization()).toBe("unauthenticated");
});
it.each([401, 500])(
  "actual SDK provider HTTP %s rejects authorizing cached/legacy credentials and sanitizes response",
  async (status) => {
    state.headers.set("cookie", `${token}=fake; ${cache}=forged`);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response({ message: "private upstream" }, undefined, status),
        ),
    );
    expect(await getAdminAuthorization()).toBe("unavailable");
  },
);
it("actual SDK transport failure denies access", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("fetch failed")),
  );
  expect(await getAdminAuthorization()).toBe("unavailable");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
