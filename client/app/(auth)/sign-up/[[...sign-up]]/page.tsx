"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/neon-auth/client";
import AuthShell, { authButtonClass, authInputClass } from "../../AuthShell";
import SocialAuthOptions from "../../SocialAuthOptions";
import EmailField from "../../EmailField";
import PasswordField from "../../PasswordField";
import { authHref, returnPathFromSearch } from "@/lib/auth-navigation";
import { useAuthDestination } from "@/lib/use-auth-destination";
import { userErrorMessage } from "@/lib/user-messages";

export default function SignUpPage() {
  const router = useRouter();
  const destination = useAuthDestination();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(userErrorMessage(result.error, "We couldn't create your account. Check your details and try again."));
        return;
      }

      const verification = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (verification.error) {
        router.push(`${authHref("/verify-email", returnPathFromSearch(window.location.search))}&email=${encodeURIComponent(email)}&send=failed`);
        return;
      }

      router.push(`${authHref("/verify-email", returnPathFromSearch(window.location.search))}&email=${encodeURIComponent(email)}`);
    } catch (caught) {
      setError(userErrorMessage(caught, "We couldn't finish creating your account. Try signing in before creating another account."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle={destination.startsWith("/pricing") ? "Create an account to continue with Creator. You'll review the subscription before paying." : "Save your stories and start creating. Choose Google or GitHub, or use your email."}
      alternateHref="/sign-in"
      alternateLabel="Already have an account? Sign in"
    >
      <form className="space-y-3" onSubmit={signUp}>
        <label className="block text-sm font-medium">
          Name
          <input
            className={authInputClass}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
          <EmailField
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <PasswordField
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        <button className={authButtonClass} type="submit" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>
      <SocialAuthOptions />
    </AuthShell>
  );
}
