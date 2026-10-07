import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-10">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
