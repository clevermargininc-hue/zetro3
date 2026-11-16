import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import s from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const { error, next, email } = await searchParams;
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const invited = dest?.startsWith("/invite/");
  const decoded = error ? decodeURIComponent(error) : null;
  const oauthError =
    error === "oauth" || error === "oauth_missing_code" || error === "oauth_pkce"
      ? "Google sign-in did not finish. Use the same browser tab and try again."
      : decoded && /pkce|verifier/i.test(decoded)
        ? "Google sign-in did not finish. Use the same browser tab and try again."
        : decoded;

  return (
    <main className={s.page}>
      <header className={s.topbar}>
        <Logo size="sm" />
        <Link href="/" className={s.back}>← Back to home</Link>
      </header>
      <section className={s.entry}>
        <div className={s.entryInner}>
          <h1 className={s.heading}>
            {invited ? "Sign in to join your team" : "Sign in to Zetro"}
          </h1>
          <p className={s.description}>
            {invited
              ? "Use the email this invitation was sent to. You will join that workspace automatically."
              : "Welcome back. Sign in to your workspace."}
          </p>
          {oauthError ? <p className="alert-error mt-4">{oauthError}</p> : null}
          <div className={s.formCard}>
            <AuthForm mode="login" next={dest} email={email} />
          </div>
          <p className={s.newOrg}>
            {invited ? "New here? " : "New organization? "}
            <Link
              href={
                dest
                  ? `/signup?next=${encodeURIComponent(dest)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
                  : "/signup"
              }
              className="font-semibold text-blue hover:underline"
            >
              {invited ? "Create an account" : "Create a workspace"}
            </Link>
          </p>
          <p className={s.security}>Your workspace. Your conversations. Securely connected.</p>
        </div>
      </section>
      <footer className={s.footer}>Zetro · Call quality &amp; customer intelligence</footer>
    </main>
  );
}
