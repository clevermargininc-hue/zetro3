"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

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

export function FaqAccordion({ dark = false }: { dark?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  void dark;

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={faq.question}
            className="group relative overflow-hidden rounded-xl border border-line bg-white transition-all duration-200 hover:border-[#CBD5E1]"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left focus:outline-hidden"
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold tracking-tight text-navy sm:text-[16px]">
                {faq.question}
              </span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
                  isOpen
                    ? "rotate-180 border-blue bg-blue text-white"
                    : "border-line bg-surface-2 text-muted group-hover:border-blue group-hover:text-blue"
                }`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-line bg-surface-2 px-6 pb-5 pt-3.5 text-[14px] leading-relaxed text-ink-soft">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
