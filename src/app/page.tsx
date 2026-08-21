import Link from "next/link";
import { Logo } from "@/components/logo";
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
    <div className="min-h-full">
      <header className="border-b border-line bg-white/60 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-blue">
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted hover:text-blue transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-blue">
                  Start a workspace
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-mesh relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-32 relative z-10">
          <div>
            <p className="page-kicker">Contact center QA · Kiswahili & English</p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-6xl leading-[1.1]">
              Audit every customer conversation with enterprise-grade quality intelligence.
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-8 text-muted">
              Zetro transcribes bilingual call recordings, separates agent and customer, and scores
              service quality so operations leaders can coach from evidence—not guesswork.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href={signedIn ? "/upload" : "/signup"} className="btn btn-lg btn-blue shadow-lg shadow-blue/30">
                {signedIn ? "Upload a call" : "Create workspace"}
              </Link>
              <Link href={signedIn ? "/calls" : "/login"} className="btn btn-lg btn-ghost">
                View call inventory
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line/50 pt-8">
              {[
                ["2 speakers", "Agent vs customer"],
                ["SW / EN", "Native language kept"],
                ["QA score", "Coaching-ready audit"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm font-bold text-ink">{k}</dt>
                  <dd className="mt-1.5 text-xs text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel rounded-2xl p-6 shadow-2xl relative transform transition-transform duration-500 hover:-translate-y-2">
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-blue/10 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-teal/10 blur-2xl"></div>
            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between text-xs text-muted">
                <span className="font-medium">Sample audit · mixed language</span>
                <span className="badge bg-blue-soft text-blue shadow-sm">82 · Good service</span>
              </div>
              <div className="space-y-4 text-sm">
                <Bubble role="agent" text="Karibu. This is Amina. How can I help you today?" />
                <Bubble role="customer" text="Habari, my bundle imeisha na payment haijaingia." />
                <Bubble role="agent" text="Naelewa. Let me check the M-Pesa reference together." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/50 backdrop-blur-sm border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Ingest", "Upload mp3, wav, m4a, or mp4. Assign the agent at ingest."],
            [
              "02",
              "Transcribe",
              "Automated transcription and smart speaker separation. The system labels Agent vs Customer and keeps original Kiswahili and English.",
            ],
            [
              "03",
              "Standards",
              "Upload standard operating documents, a scorecard, and compliance rules for document scoring. Automatic auditing does not use these files.",
            ],
            [
              "04",
              "Audit",
              "Two paths: documents scoring reads your files first, or automatic auditing scores from automated criteria.",
            ],
          ].map(([n, title, body]) => (
            <article key={n} className="panel rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
              <p className="text-xs font-bold text-blue tracking-wider">{n}</p>
              <h2 className="mt-4 text-[16px] font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Bubble({ role, text }: { role: "agent" | "customer"; text: string }) {
  const agent = role === "agent";
  return (
    <div className={`flex ${agent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] rounded-xl px-4 py-3 shadow-sm transition-all duration-300 hover:scale-[1.02] ${
          agent ? "bg-blue-soft/80 text-ink" : "bg-surface-2 text-ink border border-line/50"
        }`}
      >
        <p
          className={`mb-1.5 text-[10px] font-bold uppercase tracking-wider ${
            agent ? "text-blue" : "text-muted"
          }`}
        >
          {agent ? "Agent" : "Customer"}
        </p>
        <span className="leading-relaxed">{text}</span>
      </div>
    </div>
  );
}
