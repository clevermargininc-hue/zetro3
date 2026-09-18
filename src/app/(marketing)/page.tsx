import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MarketingPeople } from "@/components/marketing-people";

const FEATURES = [
  {
    n: "01",
    title: "Seamless ingest",
    body: "Upload audio or video. Zetro extracts the recording and queues it for prepare — scoring never starts until you ask.",
    tone: "a" as const,
  },
  {
    n: "02",
    title: "Speaker-aware prepare",
    body: "Diarization keeps Agent vs Customer turns, including mixed Kiswahili and English, ready for audit.",
    tone: "b" as const,
  },
  {
    n: "03",
    title: "Your scorecard, not a generic rubric",
    body: "Audits follow the way you already judge quality — greeting, resolution, compliance, and the rest.",
    tone: "b" as const,
  },
  {
    n: "04",
    title: "Evidence-backed scores",
    body: "Each parameter earns a mark with notes and quotes so coaches can act on real moments in the call.",
    tone: "a" as const,
  },
] as const;

const PROOF = [
  ["Your scorecard", "is how every call is judged"],
  ["Every call", "can be prepared and audited"],
  ["Two languages", "English and Kiswahili, one recording"],
] as const;

const STEPS = [
  ["01", "Upload", "Bring recordings into the workspace. Scoring starts when you ask."],
  ["02", "Prepare", "Separate speakers. Read the conversation before anyone scores it."],
  ["03", "Audit", "Score the call with notes and quotes coaches can use on the floor."],
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
      <section className="hero-mesh relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="lg:col-span-6">
            <h1 className="reveal max-w-xl font-display text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
              Every conversation, scored against your scorecard.
            </h1>
            <p className="reveal reveal-delay-1 mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
              Transcribe bilingual calls, prepare each speaker, and score the conversation with evidence coaches can trust.
            </p>
            <div className="reveal reveal-delay-2 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
                {signedIn ? "Go to Dashboard" : "Start a workspace"}
              </Link>
              <Link href="/talk-sales" className="btn btn-lg btn-ghost px-8">
                Talk to sales
              </Link>
            </div>
          </div>

          <div className="hero-art reveal reveal-delay-2 lg:col-span-6">
            <div className="hero-blob" aria-hidden />
            <figure className="photo-circle photo-hero">
              <Image
                src="/marketing/agent.jpg"
                alt="A contact-center agent on a live call, wearing a headset at her desk"
                fill
                preload
                sizes="(min-width: 1024px) 26rem, 90vw"
                className="object-cover object-[center_42%]"
              />
            </figure>
            <figure className="photo-circle photo-float" aria-hidden>
              <Image
                src="/marketing/floor.jpg"
                alt=""
                fill
                sizes="9rem"
                className="object-cover object-[center_40%]"
              />
            </figure>
            <p className="hero-art-caption">On a live floor — prepared for a documents audit.</p>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">What we do</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
              Simple tools for coaches, agents, and QA leads.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              One path from upload to prepare to documents audit — always against your uploaded scorecard.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((item) => (
              <article
                key={item.n}
                className={`art-solution ${item.tone === "a" ? "art-solution-a" : "art-solution-b"}`}
              >
                <p className="text-[12px] font-semibold tabular-nums text-blue">{item.n}</p>
                <h3 className="mt-8 font-display text-[22px] font-semibold tracking-tight text-ink">{item.title}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">{item.body}</p>
                <Link href="/how-it-works" className="mt-6 text-[14px] font-semibold text-blue hover:text-blue-2">
                  See how it works →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="art-proof py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-3 lg:px-8">
          {PROOF.map(([title, hint]) => (
            <div key={title}>
              <p className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingPeople />

      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">How to get started</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Three steps. Then the floor has evidence.
          </h2>
          <ol className="mt-12 grid gap-8 lg:grid-cols-3">
            {STEPS.map(([n, title, body]) => (
              <li key={n} className="border-t border-line pt-6">
                <p className="text-[12px] font-semibold tabular-nums text-blue">{n}</p>
                <h3 className="mt-3 font-display text-[22px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-navy-2 px-6 py-16 text-white lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Start a workspace. Score every conversation.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-slate-300">
              Upload a scorecard. Prepare a call. Coach from the moment that mattered.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
                {signedIn ? "Open workspace" : "Get started"}
              </Link>
              <Link href="/talk-sales" className="btn btn-lg btn-ghost px-8">
                Talk to sales
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="close-ring">
              <figure className="photo-circle">
                <Image
                  src="/marketing/coach.jpg"
                  alt="A quality lead ready to brief the floor"
                  fill
                  sizes="22rem"
                  className="object-cover object-[center_30%]"
                />
              </figure>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
