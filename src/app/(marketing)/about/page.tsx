import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Zetro",
  description: "Zetro helps contact centers score more calls — including English and Kiswahili on the same recording.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">About</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Built for floors that speak more than one language
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Most QA tools were written for one language and a tiny sample. We built Zetro for contact
          centers where a call can switch language mid-sentence — and where coaches need more than two
          tapes a month.
        </p>
      </header>

      <div className="mt-12 grid border border-[#E3EBFB] bg-white rounded-none overflow-hidden lg:grid-cols-2 shadow-xs">
        <section className="border-b border-[#E3EBFB] p-6 lg:border-b-0 lg:border-r">
          <h2 className="text-[15px] font-bold text-ink">The 2% problem</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            QA teams listen by hand. At real volume, that is about 1% or 2% of calls.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            The rest never get a mark. Risk slips through. Good work is never praised. Agents get
            coached from luck, not from a fair sample of their week.
          </p>
        </section>
        <section className="p-6">
          <h2 className="text-[15px] font-bold text-ink">Two languages, one call</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            In East Africa — and many other markets — a customer and an agent can mix English and
            Kiswahili in the same sentence. Generic tools drop that talk.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Zetro is built for noisy, mixed, real-floor audio. Write it down. Split who spoke. Score
            it.
          </p>
        </section>
      </div>

      <section className="mt-10 border border-[#E3EBFB] bg-[#F3F6FD] rounded-none p-6">
        <h2 className="text-[15px] font-bold text-ink">What we are here for</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-muted">
          Give QA leads enough scored calls to coach from proof. When agents get better, the customer
          hears it. We do not replace your scorecard. We apply it to more of the floor.
        </p>
      </section>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border border-[#039EBE] bg-[#04B6DA] text-white rounded-none px-6 py-6 sm:flex-row shadow-md">
        <div>
          <p className="text-[16px] font-bold text-white">Want to see it on your own calls?</p>
          <p className="mt-1 text-[13px] text-[#E3EBFB]">Ask for a walkthrough, or open a workspace and try one recording.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/talk-sales" className="btn bg-white text-[#061C52] hover:bg-[#F3F6FD] font-bold border-none">
            Talk to sales
          </Link>
          <Link href="/signup" className="btn border border-white text-white hover:bg-white/10 font-semibold">
            Start a workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
