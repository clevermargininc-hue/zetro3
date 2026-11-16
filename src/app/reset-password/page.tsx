"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
      setLoading(false);
    }
  }

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
          <p className="text-xs font-semibold uppercase tracking-widest text-blue">Security Update</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-snug text-white">
            Choose a strong password for your Zetro workspace.
          </h1>
        </div>
        <p className="relative z-10 text-sm text-white/70">Tanzania · English and Kiswahili</p>
      </div>

      <div className="grid place-items-center bg-white px-5 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Logo size="sm" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A1A3F]">Set new password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter and confirm a new password (at least 6 characters) for your account.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">New password</span>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-16"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted hover:text-ink"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">Confirm new password</span>
              <input
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </label>

            {error && <p className="alert-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || password.length < 6 || confirmPassword.length < 6}
              className="btn btn-lg btn-blue mt-2"
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <p className="mt-2 text-sm text-muted">
              <Link href="/login" className="font-semibold text-text-link hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
