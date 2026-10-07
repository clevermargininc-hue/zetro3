import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Who Zetro is for | Zetro",
  description: "Zetro helps QA leads, operations, and agents score calls fairly — against the scorecard you already use.",
};

function Check({ inverted }: { inverted?: boolean }) {
  return (
    <svg className={`mt-0.5 h-4 w-4 shrink-0 ${inverted ? "text-white" : "text-[#04B6DA]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const ROLES = [
  {
    title: "QA leads",
    kicker: "Stop hunting for tapes. Start coaching.",
    body: "You should not spend the day picking which 1% of calls to hear. Zetro scores the calls you choose every day, flags weak calls, and shows the moment that went wrong.",
    points: ["Score as many calls as you choose", "Notes you can take to the huddle", "Marks against your scorecard"],
    featured: false,
  },
  {
    title: "Operations",
    kicker: "See if the floor is following the rules.",
    body: "Know whether agents greet, resolve, and stay inside policy — without waiting for a monthly sample. Spot risk while you can still coach it.",
    points: ["Clear pass and fail on the scorecard", "Who is strong this week", "What customers keep repeating"],
    featured: true,
  },
  {
    title: "Agents",
    kicker: "Fair scores. Clear feedback.",
    body: "Nobody should be judged on one bad call that happened to be listened to. Zetro scores enough of each person’s work that the mark is typical, not unlucky.",
    points: ["The same rules for everyone", "Quotes from the actual call", "Praise when the call was good"],
    featured: false,
  },
] as const;

const INDUSTRIES = [
  {
    title: "Telecom",
    body: "Check that sales agents say the real terms when they sell data or mobile money — in English and Kiswahili.",
  },
  {
    title: "Banks and finance",
    body: "Score collections and service calls for empathy and the rules you must follow.",
  },
  {
    title: "BPO and outsourcing",
    body: "Show clients the scores, not a promise. Share a simple view of campaign quality.",
  },
  {
    title: "E-commerce",
    body: "Catch delivery complaints and weak resolutions without listening to every tape by hand.",
  },
] as const;

export default function SolutionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <header className="max-w-2xl">
        <p className="page-kicker">Who it is for</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Built for the whole floor
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          From the person on the headset to the person who owns the SLA. Same calls. Same scorecard.
          Evidence you can act on.
        </p>
      </header>

      <div className="mt-12 grid border border-[#E3EBFB] bg-white rounded-none overflow-hidden lg:grid-cols-3 shadow-xs">
        {ROLES.map((role) => (
          <article
            key={role.title}
            className={`flex flex-col border-b border-[#E3EBFB] p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${
              role.featured ? "bg-[#04B6DA] text-white shadow-md relative" : "bg-white text-[#061C52]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className={`font-display text-[16px] font-bold ${role.featured ? "text-white" : "text-ink"}`}>{role.title}</h2>
              {role.featured ? <span className="chip bg-white text-[#061C52] border-white font-bold">Featured</span> : null}
            </div>
            <p className={`mt-2 text-[13px] font-bold ${role.featured ? "text-[#E3EBFB]" : "text-[#061C52]"}`}>{role.kicker}</p>
            <p className={`mt-3 flex-1 text-[13px] leading-relaxed ${role.featured ? "text-[#E3EBFB]" : "text-muted"}`}>{role.body}</p>
            <ul className={`mt-5 space-y-2.5 border-t ${role.featured ? "border-white/20" : "border-[#E3EBFB]"} pt-5`}>
              {role.points.map((item) => (
                <li key={item} className={`flex items-start gap-2.5 text-[13px] ${role.featured ? "text-white" : "text-ink"}`}>
                  <Check inverted={role.featured} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-[16px] font-bold text-ink">Where it fits</h2>
        <p className="mt-1 text-[13px] text-muted">The same three steps — upload, prepare, score — on busy service lines.</p>
        <div className="mt-4 grid border border-[#E3EBFB] bg-white rounded-none overflow-hidden sm:grid-cols-2 shadow-xs">
          {INDUSTRIES.map((item, index) => (
            <article
              key={item.title}
              className={`p-6 ${index % 2 === 0 ? "sm:border-r border-[#E3EBFB]" : ""} ${
                index < 2 ? "border-b border-[#E3EBFB]" : ""
              }`}
            >
              <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border border-[#039EBE] bg-[#04B6DA] text-white rounded-none px-6 py-6 sm:flex-row shadow-md">
        <div>
          <p className="text-[16px] font-bold text-white">Not sure it fits your floor?</p>
          <p className="mt-1 text-[13px] text-[#E3EBFB]">Tell us the languages, the volume, and how you score today.</p>
        </div>
        <Link href="/talk-sales" className="btn bg-white text-[#061C52] hover:bg-[#F3F6FD] font-bold border-none shrink-0">
          Talk to sales
        </Link>
      </div>
    </div>
  );
}
