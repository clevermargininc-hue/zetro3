import { Logo } from "@/components/logo";
import type { ReactNode } from "react";

export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-5 py-12 lg:py-16">
      <div className="w-full max-w-md surface p-8 sm:p-10">
        <Logo />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
