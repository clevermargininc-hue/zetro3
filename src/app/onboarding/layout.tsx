import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_0%,#eef3ff_0%,transparent_55%),#f8faff] px-5 py-12 font-sans text-[#16233F]">
      <div className="w-full max-w-[460px] rounded-2xl border border-[#E3E9F5] bg-white p-7 sm:p-8 shadow-[0_1px_3px_rgb(10_26_63/0.04),0_18px_40px_-12px_rgb(10_26_63/0.1)]">
        <Logo size="sm" />
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
