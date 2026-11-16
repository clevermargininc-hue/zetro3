"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: redirectUrl },
      );

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <Logo size="sm" />
      </div>
      <h1 className="text-2xl font-bold text-[#0A1A3F]">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your work email and we&apos;ll send you a secure link to reset your password.
      </p>

      <div className="mt-8">
        {success ? (
          <div className="flex flex-col gap-5">
            <div className="alert-ok">
              Check your email for a password reset link.
            </div>
            <Link
              href="/login"
              className="btn btn-lg btn-ghost w-full flex items-center justify-center"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">Work email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>

            {error && <p className="alert-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn btn-lg btn-blue mt-1"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="mt-2 text-sm text-muted">
              Remembered your password?{" "}
              <Link href="/login" className="font-semibold text-text-link hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="simple-auth grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex [&_h1]:text-white [&_p]:text-white/80">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <Logo invert />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue">Account Recovery</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-snug text-white">
            Get back into your QA workspace quickly.
          </h1>
        </div>
        <p className="relative z-10 text-sm text-white/70">Tanzania · English and Kiswahili</p>
      </div>
      <div className="grid place-items-center bg-white px-5 py-16">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
