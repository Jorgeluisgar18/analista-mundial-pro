"use server";

import { redirect } from "next/navigation";
import { getAdminEmail, getNeonAuth, isAdminIdentity } from "@/lib/auth/server";

export async function signInAction(formData: FormData) {
  const auth = getNeonAuth();
  const adminEmail = getAdminEmail();
  if (!auth || !adminEmail) redirect("/auth/sign-in?error=unavailable");

  const submittedEmail = formData.get("email");
  const password = formData.get("password");
  if (
    typeof submittedEmail !== "string" ||
    typeof password !== "string" ||
    !password ||
    submittedEmail.trim().toLowerCase() !== adminEmail
  ) {
    redirect("/auth/sign-in?error=credentials");
  }

  let user: { email?: unknown; emailVerified?: unknown } | undefined;
  let requestFailed = false;
  let credentialsRejected = false;
  try {
    const result = await auth.signIn.email({
      email: adminEmail,
      password,
    });
    credentialsRejected = Boolean(result.error);
    user = result.data?.user;
  } catch {
    requestFailed = true;
  }

  if (requestFailed) redirect("/auth/sign-in?error=unavailable");
  if (credentialsRejected) redirect("/auth/sign-in?error=credentials");
  if (!isAdminIdentity(user)) {
    try {
      await auth.signOut();
    } catch {
      // Failed sign-out still leaves the protected API denying this identity.
    }
    redirect("/auth/sign-in?error=credentials");
  }

  redirect("/");
}

export async function signOutAction() {
  const auth = getNeonAuth();
  let failed = !auth;
  try {
    if (auth) failed = Boolean((await auth.signOut()).error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/auth/sign-in?error=signout");
  redirect("/");
}
