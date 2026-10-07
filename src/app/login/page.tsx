import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const { error, next, email } = await searchParams;
  const dest =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const invited = dest?.startsWith("/invite/");
  const decoded = error ? decodeURIComponent(error) : null;
  const oauthError =
    error === "oauth" ||
    error === "oauth_missing_code" ||
    error === "oauth_pkce"
      ? "Google sign-in did not finish. Use the same browser tab and try again."
      : decoded && /pkce|verifier/i.test(decoded)
        ? "Google sign-in did not finish. Use the same browser tab and try again."
        : decoded;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#061C52] p-10 pb-16 text-white border-r border-[#039EBE] lg:flex">
        <Logo invert />
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-[#E3EBFB]">
            Call quality
          </p>
          <h1 className="mt-3 max-w-md text-3xl font-bold leading-snug !text-white">
            Score calls against the scorecard you already use.
          </h1>
        </div>
        <p className="text-sm !text-[#E3EBFB]">
          Tanzania · English &amp; Kiswahili · English only elsewhere
        </p>
      </div>
      <div className="grid place-items-center bg-white px-5 py-12 lg:py-16">
        <div className="w-full max-w-md surface p-8 sm:p-10 border border-[#E3EBFB] bg-white">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-[#061C52] lg:mt-0">
            {invited ? "Sign in to join your team" : "Sign in to Zetro"}
          </h1>
          <p className="mt-2 text-sm text-[#334155]">
            {invited
              ? "Use the email this invitation was sent to. You will join that workspace automatically."
              : "Open your workspace to review calls and scores."}
          </p>
          {oauthError ? <p className="alert-error mt-4">{oauthError}</p> : null}
          <div className="mt-8">
            <AuthForm mode="login" next={dest} email={email} />
          </div>
          <p className="mt-6 text-sm text-[#334155]">
            {invited ? "New here? " : "New organization? "}
            <Link
              href={
                dest
                  ? `/signup?next=${encodeURIComponent(dest)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
                  : "/signup"
              }
              className="font-semibold text-[#04B6DA] hover:text-[#039EBE] underline"
            >
              {invited ? "Create an account" : "Create a workspace"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
