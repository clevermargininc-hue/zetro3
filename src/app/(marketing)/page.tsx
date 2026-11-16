import { createClient } from "@/lib/supabase/server";
import { ZetroLanding } from "@/components/landing/zetro-landing";
import "./z-landing.css";

export const metadata = {
  title: "Zetro — AI that listens to every call, so your QA team doesn't have to.",
  description:
    "Zetro reviews 100% of contact center calls — scoring, coaching, and compliance in one platform. Bilingual English and Swahili. Built for banks, telecoms, insurers, hospitals, and SACCOs in East Africa.",
};

export default async function HomePage() {
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

  return <ZetroLanding signedIn={signedIn} />;
}
