import { Logo } from "@/components/logo";
import type { ReactNode } from "react";

export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-md">
        <Logo />
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
