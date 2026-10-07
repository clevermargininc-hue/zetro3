"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Can we upload our existing Excel, Word, or PDF scorecard?",
    answer:
      "Yes. You do not need to rewrite your scorecard or conform to a rigid template. Upload your existing .xlsx, .docx, or .pdf files in the Standards section. Zetro extracts every single category, sub-criterion, weight percentage, and auto-zero trigger, scoring calls strictly to your company rules.",
  },
  {
    question: "How does Zetro handle mixed English and Kiswahili?",
    answer:
      "Tanzanian agents and customers often mix English and Kiswahili in the same sentence. Zetro scores that talk as one call, so greetings, compliance lines, and dispute work are not dropped just because the language switched.",
  },
  {
    question: "Do we need to replace our telephony or CRM system?",
    answer:
      "No. Keep your phone system. Upload recordings (.mp3, .wav, .m4a, .webm, or video). If your floor already stores calls, sales can talk about auto-send — that is not a switch in the app today.",
  },
  {
    question: "How is sensitive customer data (PII) protected?",
    answer:
      "Audio and transcripts are processed in encrypted environments using enterprise-grade security protocols. You maintain complete ownership of all audio and scoring data, and your call recordings are never used to train public LLM models.",
  },
  {
    question: "What happens if a call breaches an Auto-Zero compliance rule?",
    answer:
      "If your company policy defines critical zero-tolerance triggers (such as failing mandatory authentication, abusive language, or unauthorized promises), Zetro flags the exact violation with timestamped audio evidence and automatically applies your organization's override score.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="border border-line bg-white divide-y divide-line">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={faq.question} className="transition-colors hover:bg-surface-2/60">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4.5 text-left focus:outline-hidden"
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold text-ink sm:text-[16px]">
                {faq.question}
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center border border-line bg-surface-2 text-ink transition-transform duration-150 ${
                  isOpen ? "rotate-180 bg-blue text-white border-blue" : ""
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="px-6 pb-5 pt-1 text-[13px] leading-relaxed text-muted animate-in fade-in duration-150">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
