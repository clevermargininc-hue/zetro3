import Link from "next/link";
import { Metadata } from "next";
import { TanzaniaFlagIcon, WorldFlagIcon } from "@/components/country-region-picker";

export const metadata: Metadata = {
  title: "How it Works | Zetro",
  description:
    "Choose your region, upload calls, transcribe, and audit. Tanzania: Kiswahili and English. Other countries: English only.",
};

const steps = [
  {
    number: "01",
    title: "Choose where you operate",
    description:
      "At signup you pick Tanzania or another country or region — the same style of choice as picking team or solo. Tanzania workspaces audit in Kiswahili and English. Everywhere else runs English-only. Admins can change this later in Settings → Workspace.",
    icon: (
      <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Seamless audio ingestion",
    description:
      "Connect Zetro to your existing PBX or cloud telephony system via API, or upload audio and video files (mp3, wav, mp4) to the dashboard. Processing starts right away so the call is ready to transcribe and score.",
    icon: (
      <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Transcription & speaker separation",
    description:
      "Zetro turns speech into text and separates Agent vs Customer. In Tanzania it follows Kiswahili, English, or mixed calls. For other countries it stays on English-only — so teams outside Tanzania do not see a Swahili language picker.",
    icon: (
      <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Contextual auditing against SOPs",
    description:
      "Upload your company's SOPs, manuals, and scorecards. Zetro reads those documents and uses them as the standard to evaluate every call — your rules, not a generic checklist.",
    icon: (
      <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Automated scoring & coaching",
    description:
      "Each call gets a score on your metrics (empathy, resolution, greetings, compliance, and more). The dashboard shows where the agent succeeded or missed, with coaching tips tied to the transcript.",
    icon: (
      <svg className="w-8 h-8 text-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-20 lg:py-32">
      <div className="text-center mb-20 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl mb-6">
          How <span className="text-blue">Zetro</span> Works
        </h1>
        <p className="text-xl text-muted leading-relaxed">
          From choosing your country or region, to raw audio, to coaching insights. Used in Tanzania for
          Kiswahili and English — and English only elsewhere.
        </p>
      </div>

      <div className="mb-24 grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
        <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 text-left shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
            <TanzaniaFlagIcon className="h-11 w-11" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Tanzania</p>
            <p className="mt-1 text-sm text-muted">Kiswahili and English auditing</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 text-left shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-soft text-blue">
            <WorldFlagIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Another country / region</p>
            <p className="mt-1 text-sm text-muted">English only — type yours at signup</p>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Vertical line connecting the steps */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-line/50 -translate-x-1/2" />
        
        <div className="space-y-16 md:space-y-32">
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;
            return (
              <div key={step.number} className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16`}>
                
                {/* Visual side */}
                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="w-full max-w-md aspect-square bg-surface-2 rounded-3xl border border-line/40 flex items-center justify-center p-10 relative overflow-hidden group hover:border-blue/30 transition-colors">
                     <div className="absolute inset-0 bg-gradient-to-br from-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     {step.icon}
                  </div>
                </div>

                {/* Number badge on the center line */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white border-2 border-line/50 items-center justify-center z-10 font-bold text-blue font-mono shadow-sm">
                  {step.number}
                </div>

                {/* Text side */}
                <div className={`w-full md:w-1/2 ${isEven ? 'md:pr-16 text-left md:text-right' : 'md:pl-16 text-left'}`}>
                  <h3 className="text-2xl font-bold text-ink mb-4">{step.title}</h3>
                  <p className="text-[16px] text-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-32 text-center bg-blue/5 rounded-3xl p-12 border border-blue/10">
        <h3 className="text-3xl font-bold text-ink mb-6">Experience the magic on your own data.</h3>
        <p className="text-muted text-lg mb-8 max-w-2xl mx-auto">Upload a sample call and your company scorecard. We will show you the exact automated audit Zetro can produce.</p>
        <Link href="/talk-sales" className="btn btn-lg btn-blue shadow-xl shadow-blue/20 hover:-translate-y-1 transition-all px-10">
          Book a live Demo
        </Link>
      </div>
    </div>
  );
}
