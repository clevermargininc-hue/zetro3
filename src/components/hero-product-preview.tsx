const ROWS = [
  { name: "Security & verification", weight: "25%", note: "ID confirmed", score: "5.0", ok: true, pct: 100 },
  { name: "Regulatory disclosure", weight: "30%", note: "Privacy script delivered", score: "5.0", ok: true, pct: 100 },
  { name: "Empathy & bilingual tone", weight: "20%", note: "Swahili greeting held", score: "4.5", ok: false, pct: 90 },
  { name: "First contact resolution", weight: "25%", note: "Ticket sent and confirmed", score: "4.8", ok: true, pct: 96 },
];

export function HeroProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl transition-all duration-300">
      {/* Soft ambient atmospheric glow */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(199, 210, 254, 0.4), rgba(243, 232, 255, 0.4) 60%, transparent 80%)",
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white/90 shadow-2xl shadow-indigo-500/8 backdrop-blur-xl">
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] bg-neutral-50/80 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* macOS subtle window dots */}
            <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="truncate text-[13px] font-semibold text-[#0f172a]">Agent Sarah K.</p>
              </div>
              <p className="truncate text-[11px] font-normal text-neutral-500">
                Inbound · 4m 12s · Mobile money · SWA + ENG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              94%
            </span>
          </div>
        </div>

        {/* Audio waveform mockup bar */}
        <div className="flex items-center justify-between border-b border-black/[0.04] bg-indigo-50/30 px-5 py-2">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-blue" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v18M8 6v12M4 9v6M16 7v10M20 10v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue">Automated Audit Stream</span>
          </div>
          <div className="flex items-end gap-1 h-3.5">
            {[40, 70, 30, 90, 60, 100, 45, 80, 65, 95, 40, 85, 55, 75, 90, 60].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-blue/70 transition-all duration-300"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Criteria Rows with micro progress visual */}
        <div className="divide-y divide-black/[0.04]">
          {ROWS.map((row) => (
            <div
              key={row.name}
              className="group flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-neutral-50/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      row.ok ? "bg-emerald-500" : "bg-blue"
                    }`}
                  />
                  <p className="truncate text-[13px] font-medium text-[#0f172a]">
                    {row.name}{" "}
                    <span className="ml-1 inline-block rounded border border-black/[0.06] bg-neutral-100/80 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500">
                      {row.weight}
                    </span>
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-[13px] font-semibold tabular-nums ${
                    row.ok ? "text-emerald-700" : "text-[#0f172a]"
                  }`}
                >
                  {row.score}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pl-3.5">
                <p className="truncate text-[12px] text-neutral-500">{row.note}</p>
                {/* Visual score micro-bar */}
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 shrink-0">
                  <div
                    className={`h-full rounded-full ${row.ok ? "bg-emerald-500" : "bg-blue"}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Verified Quote Player Snippet */}
        <div className="border-t border-black/[0.05] bg-gradient-to-r from-indigo-50/40 via-white to-purple-50/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-white shadow-xs">
              <svg className="h-3.5 w-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2.5 py-0.5 text-[11px] font-medium text-neutral-700 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                  01:14 · Kiswahili
                </span>
              </div>
              <p className="mt-1.5 text-[13px] font-normal leading-relaxed text-[#0f172a] italic">
                “Pole sana kwa kuchelewa, nimefungua taarifa yako sasa hivi.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
