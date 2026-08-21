import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  return (
    <div className="grid min-h-full bg-white lg:grid-cols-2">
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
          <h1 className="mt-8 text-2xl font-semibold lg:mt-0">Create your workspace</h1>
          <p className="mt-2 text-sm text-muted">
            Use a work email. You can invite your operations team later.
          </p>
          <div className="mt-8">
            <AuthForm mode="signup" />
          </div>
          <p className="mt-6 text-sm text-muted">
            Already have a workspace?{" "}
            <Link href="/login" className="font-medium text-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
