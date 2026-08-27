import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  [
    "01",
    "Seamless Ingest",
    "Upload audio or video (mp3, wav, mp4). The system extracts audio and processes it instantly.",
  ],
  [
    "02",
    "Smart Transcription",
    "Speaker diarization separates Agent vs Customer, keeping the original bilingual context (Kiswahili & English) intact.",
  ],
  [
    "03",
    "Company Standards",
    "Upload your own SOPs, scorecards, and compliance manuals. The AI reads them before scoring any call.",
  ],
  [
    "04",
    "Automated Audits",
    "Get instant scores for empathy, resolution, and compliance, complete with coaching recommendations.",
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

  return (
    <>
      <section className="relative pt-24 pb-28 lg:pt-36 lg:pb-36">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-6 text-center lg:px-8">
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-ink sm:text-7xl leading-[1.1]">
            Audit every conversation with <span className="text-blue">enterprise AI.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-muted">
            Our goal is to help companies provide exceptional customer service. Zetro transcribes calls, scores service quality, and uncovers actionable insights so you can coach your agents from real evidence and elevate the customer experience.
          </p>
          <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
              {signedIn ? "Go to Dashboard" : "Start your free workspace"}
            </Link>
            <Link href="/talk-sales" className="btn btn-lg btn-ghost px-8">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-line bg-bg py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Everything you need for QA
            </h2>
            <p className="mt-4 text-[16px] text-muted">
              Our platform handles the heavy lifting from ingestion to scoring.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([n, title, body]) => (
              <article key={n} className="surface p-8">
                <p className="text-[13px] font-medium tabular-nums text-blue">{n}</p>
                <h3 className="mt-5 text-[18px] font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
