import Link from "next/link";
import { Metadata } from "next";
import { TanzaniaFlagIcon, WorldFlagIcon } from "@/components/country-region-picker";

export const metadata: Metadata = {
  title: "How it Works | Zetro",
  description:
    "Choose your region, upload calls, transcribe, and audit. Tanzania: Kiswahili and English. Other countries: English only.",
};

const STEPS = [
  {
    number: "01",
    title: "Choose where you operate",
    description:
      "At signup you pick Tanzania or another country or region — the same style of choice as picking team or solo. Tanzania workspaces audit in Kiswahili and English. Everywhere else runs English-only. Admins can change this later in Settings → Workspace.",
  },
  {
    number: "02",
    title: "Ingest audio",
    description:
      "Upload audio and video files (mp3, wav, mp4) to the dashboard. Processing starts so the call is ready to transcribe and score. PBX or cloud telephony ingest is quoted on Floor contracts — it is not a self-serve switch today.",
  },
  {
    number: "03",
    title: "Transcribe and separate speakers",
    description:
      "Zetro turns speech into text and separates agent vs customer. In Tanzania it follows Kiswahili, English, or mixed calls. For other countries it stays on English-only — so teams outside Tanzania do not see a Swahili language picker.",
  },
  {
    number: "04",
    title: "Audit against your SOPs",
    description:
      "Upload your company's SOPs, manuals, and scorecards. Zetro reads those documents and uses them as the standard to evaluate every call — your rules, not a generic checklist.",
  },
  {
    number: "05",
    title: "Score and coach",
    description:
      "Each call gets a score on your metrics (empathy, resolution, greetings, compliance, and more). The dashboard shows where the agent succeeded or missed, with coaching tips tied to the transcript.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">How it works</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          From region and audio to a scored call
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Used in Tanzania for Kiswahili and English — and English only elsewhere.
        </p>
      </header>

      <div className="mt-10 grid border border-line bg-white sm:grid-cols-2">
        <div className="flex items-start gap-4 border-b border-line p-6 sm:border-b-0 sm:border-r">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-line bg-white">
            <TanzaniaFlagIcon className="h-10 w-10" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Tanzania</p>
            <p className="mt-1 text-[13px] text-muted">Kiswahili and English auditing</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-line bg-white text-slate-500">
            <WorldFlagIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Another country / region</p>
            <p className="mt-1 text-[13px] text-muted">English only — type yours at signup</p>
          </div>
        </div>
      </div>

      <ol className="mt-10 border border-line bg-white">
        {STEPS.map((step, index) => (
          <li
            key={step.number}
            className={`grid gap-4 p-6 sm:grid-cols-[4.5rem_1fr] ${
              index < STEPS.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{step.number}</span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-center justify-between gap-4 border border-line bg-white px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[15px] font-semibold text-ink">See an audit on your own data</p>
          <p className="mt-1 text-[13px] text-muted">
            Upload a sample call and your company scorecard. We will show the automated audit Zetro produces.
          </p>
        </div>
        <Link href="/talk-sales" className="btn btn-blue shrink-0">
          Book a live demo
        </Link>
      </div>
    </div>
  );
}
