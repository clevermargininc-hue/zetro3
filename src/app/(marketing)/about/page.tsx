import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Zetro",
  description: "Learn about Zetro's mission to bring AI-powered Quality Assurance to bilingual contact centers.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20 lg:py-32">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl mb-6">
          Pioneering <span className="text-blue">Bilingual</span> AI for Africa
        </h1>
        <p className="text-xl text-muted leading-relaxed max-w-2xl mx-auto">
          We built Zetro because traditional Quality Assurance leaves a massive blind spot in contact centers, especially where multiple languages are spoken.
        </p>
      </div>

      <div className="space-y-12 text-lg text-ink/80 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-ink mb-4">The 2% Problem</h2>
          <p className="mb-4">
            In most contact centers today, Quality Assurance (QA) teams manually listen to a random sample of calls. Given the sheer volume of customer interactions, they can physically only audit about 1% to 2% of total calls. 
          </p>
          <p>
            What happens to the other 98%? They vanish into the void. Compliance risks go undetected, brilliant customer service goes unrewarded, and agents don't get the consistent coaching they deserve.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-ink mb-4">The Bilingual Challenge</h2>
          <p className="mb-4">
            In East Africa and many emerging markets, conversations aren't neatly confined to one language. A single call can switch fluidly between English and Kiswahili, often in the same sentence. Off-the-shelf transcription software fails miserably at this "code-switching."
          </p>
          <p>
            Zetro is built from the ground up to understand this reality. Our proprietary acoustic systems are trained on real-world, noisy, bilingual audio to provide unprecedented accuracy in transcription and speaker diarization.
          </p>
        </section>

        <section className="bg-surface-2 p-8 md:p-10 rounded-3xl border border-line/40">
          <h2 className="text-2xl font-bold text-ink mb-4">Our Mission: Better Customer Service</h2>
          <p className="mb-4">
            At our core, we believe that every company should provide exceptional customer service. We are on a mission to give contact centers <strong>100% visibility</strong> into their operations to make this a reality. 
          </p>
          <p className="mb-0">
            By automating the heavy lifting of transcription and basic compliance scoring, we free up QA managers to do what they do best: coach, mentor, and elevate human performance. When agents improve, the ultimate winner is the customer.
          </p>
        </section>
      </div>

      <div className="mt-20 text-center">
        <h3 className="text-2xl font-bold text-ink mb-6">Ready to see it in action?</h3>
        <Link href="/talk-sales" className="btn btn-lg btn-blue shadow-xl shadow-blue/20 hover:-translate-y-1 transition-all px-8">
          Request a Demo
        </Link>
      </div>
    </div>
  );
}
