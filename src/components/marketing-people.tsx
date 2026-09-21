import Image from "next/image";

export function MarketingPeople() {
  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">On the floor</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
            Made for the people who already sit with the calls.
          </h2>
          <p className="mt-4 text-[16px] font-semibold leading-relaxed text-ink">
            Agents on the headset. Coaches in the huddle. QA leads who need more than a handful of
            random tapes.
          </p>
        </div>

        <div className="people-collage mt-14">
          <div className="people-stack">
            <span className="art-shape art-shape-a" aria-hidden />
            <figure className="photo-blob photo-lg">
              <Image
                src="/marketing/floor.jpg"
                alt="An agent on the floor taking notes while wearing a headset"
                fill
                sizes="(min-width: 1024px) 30rem, 90vw"
                className="object-cover object-[center_40%]"
              />
            </figure>
            <figure className="photo-blob photo-blob-alt photo-inset" aria-hidden>
              <Image
                src="/marketing/agent.jpg"
                alt=""
                fill
                sizes="16rem"
                className="object-cover object-[center_42%]"
              />
            </figure>
          </div>

          <div className="people-story max-w-md justify-self-center lg:justify-self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">The agent</p>
            <h3 className="mt-2 text-[28px] font-bold tracking-tight text-ink">Hear the call as it happened</h3>
            <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
              Headsets, two languages, real sentences quoted on the scorecard — not a summary that
              hides the moment.
            </p>
            <p className="mt-5 text-[14px] font-semibold text-ink">
              Every person on the headset can be scored fairly.
            </p>
          </div>

          <figure className="people-collage-wide">
            <div className="photo-blob photo-wide relative min-h-[14rem] w-full">
              <Image
                src="/marketing/review.jpg"
                alt="A quality team in a briefing around a conference table"
                fill
                sizes="100vw"
                className="object-cover object-[center_78%]"
              />
            </div>
            <figcaption className="mt-4 max-w-xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">The huddle</p>
              <p className="mt-1 font-display text-[22px] font-bold tracking-tight text-ink">
                Brief the floor from proof
              </p>
              <p className="mt-1 text-[15px] font-semibold leading-relaxed text-ink">
                Print the briefing. Coach from scores and the customer’s own words — not from the two
                calls someone happened to listen to.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
