"use client";

import { useState } from "react";
import Link from "next/link";
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
}: {
  mode: Mode;
  next?: string;
  email?: string;
}) {
  const dest = safeNext(next, mode === "signup" ? "/onboarding" : "/dashboard");
  const [email, setEmail] = useState(emailPrefill || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
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
        const { data, error: signError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
          },
        });
        if (signError) throw signError;
        if (data.session) {
          window.location.href = dest;
          return;
        }
        setInfo("Check your email to confirm the account, then sign in.");
        setLoading(false);
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
          className="btn btn-lg bg-white border border-line text-ink hover:bg-surface-2 shadow-sm w-full flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => signInWithOAuth("azure")}
          disabled={loading}
          className="btn btn-lg bg-white border border-line text-ink hover:bg-surface-2 shadow-sm w-full flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
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
              className="field"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Work email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="password-input" className="font-medium text-ink">Password</label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-blue hover:underline font-medium text-xs"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password-input"
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
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
