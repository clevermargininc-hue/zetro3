import { ZetroPublicNav } from "@/components/landing/zetro-public-chrome";

export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return <ZetroPublicNav signedIn={signedIn} />;
}
