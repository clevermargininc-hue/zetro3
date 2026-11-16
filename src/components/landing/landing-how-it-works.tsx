"use client";

import { AudioLines, ChevronRight, CloudUpload, FileText, TrendingUp } from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      step: 1,
      title: "Upload Your Call",
      description: "Upload recordings in mp3, wav, m4a, mp4 and more.",
      icon: <CloudUpload className="h-6 w-6 text-[#2563EB]" />,
    },
    {
      step: 2,
      title: "Transcribe & Separate",
      description: "AssemblyAI identifies the agent and customer (EN/SW).",
      icon: <AudioLines className="h-6 w-6 text-[#2563EB]" strokeWidth={2.25} />,
    },
    {
      step: 3,
      title: "Score & Audit",
      description: "GPT-5 scores against your scorecard and compliance rules.",
      icon: <FileText className="h-6 w-6 text-[#2563EB]" />,
    },
    {
      step: 4,
      title: "Get Insights",
      description: "View results, track performance and improve quality.",
      icon: <TrendingUp className="h-6 w-6 text-[#2563EB]" strokeWidth={2.25} />,
    },
  ];

  return (
    <section className="bg-white py-20 sm:py-24" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/80 px-3.5 py-1 text-xs font-semibold text-blue-600 shadow-2xs">
          Simple. Powerful. Accurate.
        </div>

        {/* Section Title */}
        <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-slate-900">
          How Zetro Works
        </h2>

        {/* Subtitle */}
        <p className="mt-2 text-base text-slate-500 max-w-xl mx-auto">
          From call recording to actionable insights — in just a few steps.
        </p>

        {/* 4 Process Steps Workflow */}
        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-4 relative">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Step Number Circle */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D63ED] text-xs font-bold text-white shadow-sm mb-3">
                {item.step}
              </div>

              {/* Icon Container (Clean Blue Icon matching photo) */}
              <div className="flex h-12 w-12 items-center justify-center text-[#1D63ED] transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </div>

              {/* Step Title */}
              <h3 className="mt-3 text-lg font-bold text-slate-900 tracking-tight">
                {item.title}
              </h3>

              {/* Step Description */}
              <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-500 max-w-[220px]">
                {item.description}
              </p>

              {/* Connecting Chevron Arrow (Visible on desktop between items) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[36px] -right-4 translate-x-1/2 text-slate-300">
                  <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
