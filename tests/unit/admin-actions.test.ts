import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { signIn, signOut } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({
  getAdminEmail: () => "admin@example.test",
  getNeonAuth: () => ({ signIn: { email: signIn }, signOut }),
  isAdminIdentity: (user: { emailVerified?: boolean } | undefined) =>
    user?.emailVerified === true,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
import { signInAction, signOutAction } from "@/app/auth/sign-in/actions";
beforeEach(() => {
  signIn.mockReset();
  signOut.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.restoreAllMocks());
function credentials(email = "admin@example.test") {
  const form = new FormData();
  form.set("email", email);
  form.set("password", "fixture");
  return form;
}
it("rejects other emails without sending credentials upstream", async () => {
  await expect(signInAction(credentials("other@example.test"))).rejects.toThrow(
    "redirect:/auth/sign-in?error=credentials",
  );
  expect(signIn).not.toHaveBeenCalled();
});
it("redirects home after a verified administrator signs in", async () => {
  signIn.mockResolvedValue({
    data: { user: { emailVerified: true } },
    error: null,
  });
  await expect(signInAction(credentials())).rejects.toThrow("redirect:/");
});
it("clears an unverified sign-in and rejects it", async () => {
  signIn.mockResolvedValue({
    data: { user: { emailVerified: false } },
    error: null,
  });
  await expect(signInAction(credentials())).rejects.toThrow(
    "error=credentials",
  );
  expect(signOut).toHaveBeenCalledOnce();
});
it("does not expose provider failures", async () => {
  signIn.mockRejectedValue(new Error("private provider failure"));
  await expect(signInAction(credentials())).rejects.toThrow(
    "redirect:/auth/sign-in?error=unavailable",
  );
});
it("reports a failed sign-out instead of implying logout succeeded", async () => {
  signOut.mockResolvedValue({ error: { message: "private" } });
  await expect(signOutAction()).rejects.toThrow(
    "redirect:/auth/sign-in?error=signout",
  );
});
it("returns home after successful logout", async () => {
  await expect(signOutAction()).rejects.toThrow("redirect:/");
});
