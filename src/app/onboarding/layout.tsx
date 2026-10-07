import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-5 py-12 lg:py-16">
      <div className="w-full max-w-lg surface p-8 sm:p-10">
        <Logo />
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
