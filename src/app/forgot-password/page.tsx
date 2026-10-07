"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
      // Point directly to /reset-password. The middleware will detect the
      // ?code= param and route through /auth/callback automatically.
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
    <div className="w-full max-w-md p-8 md:p-12 surface">
      <h1 className="text-3xl font-extrabold text-ink mb-2">Reset password</h1>
      <p className="text-muted text-[15px] mb-8">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {success ? (
        <div className="flex flex-col gap-6">
          <div className="alert-ok p-4 rounded-none">
            Check your email for a password reset link.
          </div>
          <Link
            href="/login"
            className="btn btn-lg bg-white border border-[#E3EBFB] text-[#061C52] hover:bg-[#F3F6FD] shadow-xs flex items-center justify-center font-semibold rounded-none"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink">Work email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@company.com"
            />
          </label>

          {error && <p className="alert-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className="btn btn-lg btn-primary text-white mt-2 font-semibold rounded-none"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm font-semibold text-[#04B6DA] hover:text-[#039EBE] hover:underline">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-5 py-12 relative">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
