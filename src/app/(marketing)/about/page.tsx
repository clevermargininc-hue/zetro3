import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Zetro",
  description: "Learn about Zetro's mission to bring AI-powered Quality Assurance to bilingual contact centers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">About</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Bilingual AI for contact center quality
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          We built Zetro because traditional quality assurance leaves a massive blind spot — especially where more than one language is spoken on the same call.
        </p>
      </header>

      <div className="mt-12 grid border border-line bg-white lg:grid-cols-2">
        <section className="border-b border-line p-6 lg:border-b-0 lg:border-r">
          <h2 className="text-[15px] font-semibold text-ink">The 2% problem</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            In most contact centers, QA teams manually listen to a random sample. Given the volume of conversations, they typically audit about 1% to 2% of calls.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            The rest go unreviewed. Compliance risks go undetected, strong service goes unrewarded, and agents do not get consistent coaching.
          </p>
        </section>
        <section className="p-6">
          <h2 className="text-[15px] font-semibold text-ink">The bilingual challenge</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            In East Africa and many other markets, a single call can switch between English and Kiswahili in the same sentence. Generic transcription tools fail at that code-switching.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Zetro is built for that reality: transcription and speaker diarization trained on real-world, noisy, bilingual audio.
          </p>
        </section>
      </div>

      <section className="mt-10 border border-line bg-white p-6">
        <h2 className="text-[15px] font-semibold text-ink">Mission</h2>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-muted">
          Every company should provide exceptional customer service. We give contact centers 100% visibility into their operations so QA managers can coach from evidence instead of sampling a handful of recordings. When agents improve, the customer wins.
        </p>
      </section>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">Ready to see it on your own calls?</p>
          <p className="mt-1 text-[13px] text-muted">Request a demo or start a workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/talk-sales" className="btn btn-blue">
            Request a demo
          </Link>
          <Link href="/signup" className="btn btn-ghost">
            Start free
          </Link>
        </div>
      </div>
    </div>
  );
}
