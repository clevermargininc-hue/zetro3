"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/brand-icon";
import { hasFirstAndLastName } from "@/lib/bot-signup";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function safeNext(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function AuthForm({
  mode,
  next,
  email: emailPrefill,
  initialError,
}: {
  mode: Mode;
  next?: string;
  email?: string;
  initialError?: string;
}) {
  const dest = safeNext(next, "/auth/continue");
  const [email, setEmail] = useState(emailPrefill || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [error, setError] = useState<string | null>(initialError || null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const supabase = createClient();
      if (mode === "signup") {
        if (!hasFirstAndLastName(fullName)) {
          throw new Error("Enter your first and last name.");
        }
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName, companyWebsite }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; confirm?: boolean };
        if (!res.ok) throw new Error(body.error || "Could not create the account");
        if (body.confirm) {
          setInfo("Check your email to confirm the account, then sign in.");
          setLoading(false);
          return;
        }
        window.location.href = dest;
        return;
      } else {
        const { error: signError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signError) throw signError;
        window.location.href = dest;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function signInWithOAuth(provider: "google" | "azure") {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
        },
      });
      if (signError) throw signError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => signInWithOAuth("google")}
          disabled={loading}
          className="btn btn-lg bg-white border border-line text-ink hover:bg-surface-2 shadow-2xs w-full flex items-center justify-center gap-3"
        >
          <BrandIcon brand="google" size={18} variant="mark" />
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => signInWithOAuth("azure")}
          disabled={loading}
          className="btn btn-lg bg-white border border-line text-ink hover:bg-surface-2 shadow-2xs w-full flex items-center justify-center gap-3"
        >
          <BrandIcon brand="microsoft" size={18} variant="mark" />
          Continue with Microsoft
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-line"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-2 text-muted font-semibold tracking-wider">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Full name</span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              className="field"
            />
          </label>
        )}
        {mode === "signup" ? (
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            className="sr-only"
          />
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            className="field"
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="password-input" className="font-medium text-ink">Password</label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-text-link hover:underline font-semibold text-xs"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password-input"
              required
              minLength={6}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="field pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && <p className="alert-error">{error}</p>}
        {info && <p className="alert-ok">{info}</p>}
        <button type="submit" disabled={loading} className="btn btn-lg btn-blue mt-1">
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
