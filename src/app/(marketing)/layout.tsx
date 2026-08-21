import Link from "next/link";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <div className="min-h-full bg-white relative overflow-hidden selection:bg-blue/20 flex flex-col">
      {/* Decorative Background shared across marketing pages */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none -z-10 fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue/5 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-blue/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue/5 blur-[120px]" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Header */}
      <header className="border-b border-line/40 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 mx-auto absolute left-1/2 -translate-x-1/2">
            <Link href="/about" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">About Us</Link>
            <Link href="/how-it-works" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">How it Works</Link>
            <Link href="/solutions" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">Solutions</Link>
            <Link href="/pricing" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/talk-sales" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors hidden sm:block">
              Talk to Sales
            </Link>
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-blue shadow-md shadow-blue/20 transition-transform hover:-translate-y-0.5">
                Open Workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[14px] font-semibold text-muted hover:text-ink transition-colors hidden sm:block">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-blue shadow-md shadow-blue/20 transition-transform hover:-translate-y-0.5">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10">
        {children}
      </main>

      {/* Shared Footer */}
      <footer className="border-t border-line/50 bg-white py-16 z-10 relative mt-auto">
         <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
               <Logo size="sm" />
               <p className="mt-4 text-[13px] leading-relaxed text-muted">
                 Enterprise quality intelligence for modern, bilingual contact centers across East Africa and beyond.
               </p>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-4">Product</h4>
              <ul className="space-y-2 text-[14px] text-muted">
                <li><Link href="/how-it-works" className="hover:text-blue transition-colors">How it Works</Link></li>
                <li><Link href="/solutions" className="hover:text-blue transition-colors">Solutions</Link></li>
                <li><Link href="/pricing" className="hover:text-blue transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-4">Company</h4>
              <ul className="space-y-2 text-[14px] text-muted">
                <li><Link href="/about" className="hover:text-blue transition-colors">About Us</Link></li>
                <li><Link href="/talk-sales" className="hover:text-blue transition-colors">Contact Sales</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-4">Legal</h4>
              <ul className="space-y-2 text-[14px] text-muted">
                <li><span className="cursor-not-allowed">Privacy Policy</span></li>
                <li><span className="cursor-not-allowed">Terms of Service</span></li>
              </ul>
            </div>
         </div>
         <div className="mx-auto max-w-7xl px-6 mt-16 pt-8 border-t border-line/40 flex flex-col md:flex-row items-center justify-between">
            <p className="text-[13px] font-medium text-muted">
               &copy; {new Date().getFullYear()} Zetro Quality Intelligence. All rights reserved.
            </p>
         </div>
      </footer>
    </div>
  );
}
