import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const { next, email } = await searchParams;
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const invited = dest?.startsWith("/invite/");

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-blue p-10 text-white lg:flex">
        <Logo invert />
        <div>
          <p className="text-sm font-medium text-white/70">Get started</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-snug">
            Stand up a QA workspace in minutes.
          </h1>
        </div>
        <p className="text-sm text-white/70">Upload, transcribe, audit, and rank agents.</p>
      </div>
      <div className="grid place-items-center bg-white px-5 py-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-8 text-2xl font-semibold lg:mt-0">
            {invited ? "Create your account to join" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {invited
              ? "Use the email this invitation was sent to. After you sign in you will join that workspace automatically."
              : "Use your work email. After sign-up you can join a team or start solo."}
          </p>
          <div className="mt-8">
            <AuthForm mode="signup" next={dest} email={email} />
          </div>
          <p className="mt-6 text-sm text-muted">
            Already have a workspace?{" "}
            <Link
              href={
                dest
                  ? `/login?next=${encodeURIComponent(dest)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
                  : "/login"
              }
              className="font-medium text-blue hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
