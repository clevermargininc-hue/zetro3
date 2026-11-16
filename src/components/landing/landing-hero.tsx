"use client";

import Link from "next/link";
import { ArrowRight, Globe, Play, Shield, Zap } from "lucide-react";
import { LandingTabletShowcase } from "@/components/landing/landing-tablet-showcase";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#081E44] via-[#091E42] to-[#06152F] pt-6 pb-24 sm:pb-32 lg:pb-36 text-white">
      {/* Concentric Orbital Radar Arcs (Top-Right Placement as in Reference Photo) */}
      <div className="pointer-events-none absolute -top-32 -right-24 w-[1100px] h-[1100px] overflow-hidden opacity-60 z-0">
        <svg
          className="absolute -top-[50px] -right-[50px] w-[1200px] h-[1200px]"
          viewBox="0 0 1000 1000"
          fill="none"
        >
          <circle cx="750" cy="380" r="220" stroke="rgba(0, 123, 255, 0.45)" strokeWidth="1" />
          <circle cx="750" cy="380" r="360" stroke="rgba(37, 99, 235, 0.35)" strokeWidth="1.25" />
          <circle cx="750" cy="380" r="500" stroke="rgba(0, 123, 255, 0.32)" strokeWidth="1" />
          <circle cx="750" cy="380" r="660" stroke="rgba(37, 99, 235, 0.25)" strokeWidth="1.25" />
          <circle cx="750" cy="380" r="840" stroke="rgba(56, 189, 248, 0.14)" strokeWidth="1" />
        </svg>
      </div>

      {/* Atmospheric Royal Blue & Cyan Radiant Spotlight Glow behind tablet */}
      <div
        className="pointer-events-none absolute top-4 right-0 lg:right-4 h-[620px] w-[620px] rounded-full opacity-70 blur-[130px] z-0"
        style={{
          background: "radial-gradient(circle at 60% 60%, #0063FF 0%, #0758C5 28%, rgba(0,80,220,0.18) 58%, transparent 75%)",
        }}
      />
      {/* Soft Ambient Midnight Blue Floor Glow */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/4 h-[380px] w-[580px] rounded-full opacity-30 blur-[120px] z-0"
        style={{
          background: "radial-gradient(ellipse, #1E40AF 0%, rgba(8,27,58,0) 70%)",
        }}
      />

      {/* Main Hero Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20 pt-2">
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 xl:col-span-6 text-left max-w-xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-[#172554]/70 px-3.5 py-1 text-xs font-semibold text-blue-300 shadow-sm backdrop-blur-md">
              <span>Call Quality + Customer Intelligence</span>
            </div>

            {/* Giant Headline (Strict 3 Lines matching Reference Photo) */}
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-extrabold tracking-tight text-white leading-[1.14]">
              <span className="block whitespace-nowrap">Every Conversation.</span>
              <span className="block text-[#38BDF8]">Understood.</span>
              <span className="block whitespace-nowrap">Every Agent. Improving.</span>
            </h1>

            {/* Supporting Subtext */}
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-200 max-w-lg">
              Zetro analyzes your call recordings using advanced AI — separating
              agent and customer, scoring performance, and revealing why customers
              call again — in both English and Kiswahili.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/talk-sales"
                className="inline-flex items-center gap-2 rounded-full bg-[#1665D8] px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-900/50 transition-all duration-200 hover:bg-[#1D63ED] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Request a Demo</span>
                <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.5} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2.5 rounded-full border border-blue-400/30 bg-[#132240]/80 px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-[#132240] hover:border-blue-400/50"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white">
                  <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                </span>
                <span>Explore the Platform</span>
              </a>
            </div>

            {/* Trust Badges Strip */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs sm:text-[13px] font-medium text-slate-200">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#38BDF8]" strokeWidth={2.25} />
                <span>Secure &amp; Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#38BDF8]" strokeWidth={2.25} />
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#38BDF8]" strokeWidth={2.25} />
                <span>Bilingual (EN / SW)</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Perspective Real Tablet Product Showcase */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-center justify-center lg:justify-end">
            <LandingTabletShowcase />
          </div>
        </div>
      </div>

      {/* Hero Bottom Gentle Curve Wave Transition */}
      <div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
        <svg
          className="relative block w-full h-[35px] sm:h-[50px] lg:h-[70px]"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            d="M0,45 Q720,80 1440,45 L1440,80 L0,80 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    </section>
  );
}
