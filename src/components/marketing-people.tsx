import Image from "next/image";

export function MarketingPeople() {
  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">The people</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
            How Zetro sits with the floor.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            Agents, coaches, and QA leads — the seats that already own the calls.
          </p>
        </div>

        <div className="people-collage mt-14">
          <figure className="photo-circle photo-lg">
            <Image
              src="/marketing/floor.jpg"
              alt="An agent on the floor taking notes while wearing a headset"
              fill
              sizes="(min-width: 1024px) 30rem, 90vw"
              className="object-cover object-[center_40%]"
            />
          </figure>

          <div className="people-story max-w-md justify-self-center lg:justify-self-start">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue">The floor</p>
            <h3 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">Hear the call as it happened</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Headsets, bilingual talk, real moments quoted on the scorecard.
            </p>
            <figure className="photo-oval mt-8 w-[min(100%,16rem)]">
              <Image
                src="/marketing/agent.jpg"
                alt="A contact-center agent on a live call with a headset"
                fill
                sizes="16rem"
                className="object-cover object-[center_42%]"
              />
            </figure>
            <p className="mt-3 text-[13px] font-medium text-ink">The agent — every conversation, scored.</p>
          </div>

          <figure className="people-collage-wide">
            <div className="photo-soft relative aspect-[16/8] min-h-[14rem] w-full">
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
              <p className="mt-1 font-display text-[22px] font-semibold tracking-tight text-ink">
                Brief the floor from evidence
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                Print the briefing. Coach from scores and customer voice — not a handful of random recordings.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
