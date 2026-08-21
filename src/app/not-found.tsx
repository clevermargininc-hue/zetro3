import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-full place-items-center bg-white px-5 py-24">
      <div className="text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">That call or page does not exist in this workspace.</p>
        <Link href="/dashboard" className="btn btn-blue mt-6">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
