import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center text-center">
          
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-ink sm:text-7xl leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Audit every conversation with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue to-blue-2">enterprise AI.</span>
          </h1>
          
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-muted animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Our goal is to help companies provide exceptional customer service. Zetro transcribes calls, scores service quality, and uncovers actionable insights so you can coach your agents from real evidence and elevate the customer experience.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue shadow-xl shadow-blue/20 hover:-translate-y-1 transition-all px-8 text-[16px]">
              {signedIn ? "Go to Dashboard" : "Start your free workspace"}
            </Link>
            <Link href="/talk-sales" className="btn btn-lg bg-white border border-line/50 text-ink hover:bg-surface-2 shadow-sm transition-all px-8 text-[16px]">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-surface-2 border-t border-line/40 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-16 text-center max-w-2xl mx-auto">
             <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Everything you need for QA</h2>
             <p className="mt-4 text-[16px] text-muted">Our platform handles the heavy lifting from ingestion to scoring.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Seamless Ingest", "Upload audio or video (mp3, wav, mp4). The system extracts audio and processes it instantly."],
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
            ].map(([n, title, body]) => (
              <article key={n} className="bg-white rounded-3xl p-8 border border-line/40 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="h-12 w-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 group-hover:bg-blue/10 transition-colors">
                   <p className="text-[16px] font-bold text-blue font-mono">{n}</p>
                </div>
                <h3 className="text-[18px] font-bold text-ink">{title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
