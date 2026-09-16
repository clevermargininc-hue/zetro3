import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  [
    "01",
    "Seamless ingest",
    "Upload audio or video. Zetro extracts the recording and queues it for prepare — scoring never starts until you ask.",
  ],
  [
    "02",
    "Speaker-aware prepare",
    "Diarization keeps Agent vs Customer turns, including mixed Kiswahili and English, ready for audit.",
  ],
  [
    "03",
    "Your company standards",
    "Scorecards, compliance, and process files are read first. Audits follow those rules — not a generic rubric.",
  ],
  [
    "04",
    "Evidence-backed scores",
    "Each parameter earns a mark with notes and quotes so coaches can act on real moments in the call.",
  ],
] as const;

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

  const waveHeights = [22, 40, 30, 54, 36, 62, 44, 28, 50, 34, 58, 42, 26, 48, 38, 56];

  return (
    <>
      <section className="hero-mesh relative overflow-hidden">
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-between px-6 pb-10 pt-24 lg:px-8 lg:pb-14 lg:pt-32">
          <div className="max-w-3xl">
            <p className="reveal font-display text-6xl font-bold tracking-tight text-ink sm:text-7xl lg:text-8xl">
              Zetro
            </p>
            <h1 className="reveal reveal-delay-1 mt-6 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl lg:leading-[1.1]">
              Audit every conversation against your company scorecard.
            </h1>
            <p className="reveal reveal-delay-2 mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
              Transcribe bilingual calls, prepare speakers, then score from your Standards files — with evidence coaches can trust.
            </p>
            <div className="reveal reveal-delay-3 mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
                {signedIn ? "Go to Dashboard" : "Start your free workspace"}
              </Link>
              <Link href="/talk-sales" className="btn btn-lg btn-ghost px-8">
                Talk to Sales
              </Link>
            </div>
          </div>

          <div className="reveal reveal-delay-2 mt-16 w-full border-t border-line/80 pt-8" aria-hidden>
            <div className="hero-wave max-w-3xl">
              {waveHeights.map((height, index) => (
                <span
                  key={index}
                  style={{
                    height,
                    animationDelay: `${index * 0.07}s`,
                    opacity: 0.28 + (index % 5) * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="marketing-section bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Built for contact-center QA
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              One path from upload to prepare to documents audit — always against your uploaded scorecard.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([n, title, body]) => (
              <article key={n} className="border-t border-line pt-5">
                <p className="text-[12px] font-semibold tabular-nums text-blue">{n}</p>
                <h3 className="mt-3 font-display text-[18px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
