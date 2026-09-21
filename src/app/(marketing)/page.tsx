import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MicMark } from "@/components/marketing-marks";

const STEPS = [
  ["01", "Upload", "Drop in a recording from the floor."],
  ["02", "Prepare", "Read the call in English, Kiswahili, or both."],
  ["03", "Score", "Mark it on your scorecard, with the notes a coach can use."],
] as const;

const SCORE_ROWS = [
  ["Greeting", "5"],
  ["Resolution", "4"],
  ["Compliance", "5"],
  ["Hold time", "4"],
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
            <h1 className="reveal max-w-xl font-display text-[2.4rem] font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
              Every conversation, scored against your scorecard.
            </h1>
            <p className="reveal reveal-delay-1 mt-6 max-w-lg text-[17px] font-semibold leading-relaxed text-ink">
              Too many important calls for one QA shift. Zetro marks them against the scorecard you
              already use — with notes and quotes coaches can take to the huddle. English, Kiswahili,
              or both.
            </p>
            <div className="reveal reveal-delay-2 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
                {signedIn ? "Open workspace" : "Try it on one call"}
              </Link>
              <Link href="/how-it-works" className="btn btn-lg btn-ghost px-8">
                See how it works
              </Link>
            </div>
          </div>

          <div className="hero-art reveal reveal-delay-2 lg:col-span-6">
            <span className="art-shape art-shape-a" aria-hidden />
            <figure className="photo-blob photo-hero">
              <Image
                src="/marketing/agent.jpg"
                alt="A contact-center agent on a live call, wearing a headset at her desk"
                fill
                preload
                sizes="(min-width: 1024px) 26rem, 90vw"
                className="object-cover object-[center_42%]"
              />
            </figure>
            <figure className="photo-blob photo-blob-alt photo-float" aria-hidden>
              <Image
                src="/marketing/floor.jpg"
                alt=""
                fill
                sizes="10rem"
                className="object-cover object-[center_40%]"
              />
            </figure>
          </div>
        </div>
      </section>

      <section id="features" className="band-story">
        <div className="band-story-stack mx-auto max-w-7xl px-6 lg:px-8">
          <div className="split">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">Your rules</p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Your scorecard.
              </h2>
              <p className="mt-4 max-w-lg text-[17px] font-semibold leading-relaxed text-ink">
                Greeting, resolution, compliance — marked the way you already judge a call. You keep
                your own points and weighting. Zetro follows that scorecard, so every coach on the
                floor marks the same way.
              </p>
            </div>
            <div className="split-media">
              <div className="art-panel art-panel-blue art-scorecard">
                <span className="art-shape art-shape-a" aria-hidden />
                <ul>
                  {SCORE_ROWS.map(([label, score]) => (
                    <li key={label}>
                      <span>{label}</span>
                      <b>{score}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="split split-rev">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">Two languages</p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                English and Kiswahili.
              </h2>
              <p className="mt-4 max-w-lg text-[17px] font-semibold leading-relaxed text-ink">
                Agents mix them on the same call. That is fine. Zetro reads both, so a greeting, a
                promise, or a risk is not missed when the language changes mid-sentence.
              </p>
            </div>
            <div className="split-media">
              <div className="art-panel art-panel-blue">
                <span className="art-shape art-shape-a" aria-hidden />
                <span className="art-line art-line-a" aria-hidden />
                <span className="art-line art-line-b" aria-hidden />
                <MicMark />
              </div>
            </div>
          </div>

          <div className="split">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">The huddle</p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Notes you can take.
              </h2>
              <p className="mt-4 max-w-lg text-[17px] font-semibold leading-relaxed text-ink">
                Each score comes with a quote from the call — the moment it refers to, not a guess.
                A coach can walk into the huddle with the words the agent used, and the point that
                needs work.
              </p>
            </div>
            <div className="split-media">
              <div className="split-visual">
                <span className="art-shape art-shape-a" aria-hidden />
                <figure className="photo-blob photo-split">
                  <Image
                    src="/marketing/review.jpg"
                    alt="A quality team in a briefing"
                    fill
                    sizes="(min-width: 1024px) 24rem, 90vw"
                    className="object-cover object-[center_78%]"
                  />
                </figure>
              </div>
            </div>
          </div>

          <div className="split split-rev">
            <div className="split-copy">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">How to start</p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Three steps.
              </h2>
              <ol className="path-rail mt-8">
                {STEPS.map(([n, title, body]) => (
                  <li key={n}>
                    <span>{n}</span>
                    <div>
                      <h3 className="font-display text-[20px] font-bold text-ink">{title}</h3>
                      <p className="mt-1 text-[15px] font-semibold text-ink">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="split-media">
              <div className="split-visual">
                <span className="art-shape art-shape-a" aria-hidden />
                <figure className="photo-blob photo-split">
                  <Image
                    src="/marketing/hand.jpg"
                    alt="A real hand on a desk beside a headset"
                    fill
                    sizes="(min-width: 1024px) 24rem, 90vw"
                    className="object-cover object-[center_45%]"
                  />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy-2 px-6 py-16 text-white lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Try it on one call.
            </h2>
            <p className="mt-4 max-w-lg text-[16px] font-semibold leading-relaxed text-white">
              Score one recording against your scorecard, then decide if the floor should run on
              Zetro.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-lg btn-blue px-8">
                {signedIn ? "Open workspace" : "Start a workspace"}
              </Link>
              <Link href="/talk-sales" className="btn btn-lg btn-ghost px-8">
                Talk to sales
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="close-art">
              <span className="art-shape art-shape-a" aria-hidden />
              <figure className="photo-blob photo-close">
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
