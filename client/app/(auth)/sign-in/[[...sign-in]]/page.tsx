"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/neon-auth/client";
import AuthShell, { authButtonClass, authInputClass } from "../../AuthShell";
import SocialAuthOptions from "../../SocialAuthOptions";
import { authHref, returnPathFromSearch } from "@/lib/auth-navigation";
import { useAuthDestination } from "@/lib/use-auth-destination";
import { userErrorMessage } from "@/lib/user-messages";

export default function SignInPage() {
  const router = useRouter();
  const destination = useAuthDestination();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const provider = search.get("error");
    const reason = search.get("reason");
    if (search.get("password") === "reset") setNotice("Your password has been updated. Sign in with your new password.");

    if (reason === "session-expired") {
      setError("Your session expired. Sign in again to continue.");
    } else if (provider === "github") {
      setError("GitHub sign-in was cancelled or could not be completed.");
    } else if (provider === "google") {
      setError("Google sign-in was cancelled or could not be completed.");
    }
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(userErrorMessage(result.error, "We couldn't sign you in. Check your email and password, or try the sign-in method you used to create your account."));
        return;
      }

      router.push(returnPathFromSearch(window.location.search));
      router.refresh();
    } catch (caught) {
      setError(userErrorMessage(caught, "We couldn't sign you in. Please try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle={destination.startsWith("/pricing") ? "Sign in to continue with Creator. You'll review the subscription before paying." : "Sign in to return to your stories."}
      alternateHref="/sign-up"
      alternateLabel="New here? Create an account"
    >
      <form className="space-y-3" onSubmit={signIn}>
        {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
        <label className="block text-sm font-medium">
          Email
          <input
            className={authInputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className={authInputClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <div className="text-right">
          <Link
            className="text-sm text-[#d8c69e] hover:text-[#f1eadb]"
            href={authHref("/forgot-password", destination)}
          >
            Forgot password?
          </Link>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <button className={authButtonClass} type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <SocialAuthOptions />
    </AuthShell>
  );
}
