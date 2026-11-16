import "./z-landing.css";
import { ZetroPublicFooter, ZetroPublicNav } from "@/components/landing/zetro-public-chrome";
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
    <div className="z-landing flex min-h-full flex-col antialiased">
      <a href="#main-content" className="z-skip">
        Skip to main content
      </a>
      <ZetroPublicNav signedIn={signedIn} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <ZetroPublicFooter signedIn={signedIn} />
    </div>
  );
}
