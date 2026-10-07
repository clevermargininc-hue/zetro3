import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-5 py-24">
      <div className="w-full max-w-md surface p-8 sm:p-10 text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-[#061C52]">Page not found</h1>
        <p className="mt-2 text-sm text-[#334155]">That call or page does not exist in this workspace.</p>
        <div className="mt-6 flex justify-center">
          <Link href="/dashboard" className="btn btn-lg btn-primary">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
