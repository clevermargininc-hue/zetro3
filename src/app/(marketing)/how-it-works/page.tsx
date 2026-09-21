import Link from "next/link";
import { Metadata } from "next";
import { TanzaniaFlagIcon, WorldFlagIcon } from "@/components/country-region-picker";

export const metadata: Metadata = {
  title: "How it works | Zetro",
  description:
    "Add a call, read who spoke, score it against your scorecard. Tanzania: English and Kiswahili. Other countries: English.",
};

const STEPS = [
  {
    number: "01",
    title: "Choose where you work",
    description:
      "At signup, pick Tanzania or another country. Tanzania scores in Kiswahili and English. Everywhere else scores in English. You can change this later in Settings.",
  },
  {
    number: "02",
    title: "Add the recording",
    description:
      "Upload audio or video (mp3, wav, mp4). We get the file ready to read and score. If your phone system already records, sales can set up auto-send — that is not a switch in the app today.",
  },
  {
    number: "03",
    title: "Read who spoke",
    description:
      "Zetro writes the call as text and splits agent from customer. In Tanzania it follows Kiswahili, English, or mixed talk. Other countries stay on English.",
  },
  {
    number: "04",
    title: "Score against your scorecard",
    description:
      "Add the scorecard you already use. Zetro marks the call with those rules — greeting, resolution, compliance — not a generic list.",
  },
  {
    number: "05",
    title: "Coach the floor",
    description:
      "Each call gets a score, notes, and quotes. Take them to the huddle. The dashboard shows who is strong and who needs a conversation.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">How it works</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          From a recording to a score you can coach with
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          Five steps. No new way of judging quality — your scorecard stays in charge.
        </p>
      </header>

      <div className="mt-10 grid border border-line bg-white sm:grid-cols-2">
        <div className="flex items-start gap-4 border-b border-line p-6 sm:border-b-0 sm:border-r">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-line bg-white">
            <TanzaniaFlagIcon className="h-10 w-10" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Tanzania</p>
            <p className="mt-1 text-[13px] text-muted">Kiswahili and English on the same call</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden border border-line bg-white text-slate-500">
            <WorldFlagIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink">Another country</p>
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
          <p className="text-[15px] font-semibold text-ink">Want to see it on your own calls?</p>
          <p className="mt-1 text-[13px] text-muted">
            Bring one recording and your scorecard. We will walk you through the score.
          </p>
        </div>
        <Link href="/talk-sales" className="btn btn-blue shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
