const ROWS = [
  { name: "Security & verification", weight: "25%", note: "ID confirmed", score: "5.0", ok: true },
  { name: "Regulatory disclosure", weight: "30%", note: "Privacy script delivered", score: "5.0", ok: true },
  { name: "Empathy & bilingual tone", weight: "20%", note: "Swahili greeting held", score: "4.5", ok: false },
  { name: "First contact resolution", weight: "25%", note: "Ticket sent and confirmed", score: "4.8", ok: true },
];

export function HeroProductPreview() {
  return (
    <div className="frame w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">Agent Sarah K.</p>
          <p className="truncate text-[11px] text-muted">Inbound · 4m 12s · Mobile money · SWA + ENG</p>
        </div>
        <span className="chip chip-ok shrink-0 font-semibold">94%</span>
      </div>

      <div className="divide-y divide-line text-[13px]">
        {ROWS.map((row) => (
          <div key={row.name} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {row.name} <span className="font-normal text-muted">{row.weight}</span>
              </p>
              <p className="truncate text-[12px] text-muted">{row.note}</p>
            </div>
            <span className={`shrink-0 tabular-nums font-semibold ${row.ok ? "text-good" : "text-ink"}`}>
              {row.score}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="text-[11px] font-semibold text-blue">01:14 · Kiswahili</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">
          “Pole sana kwa kuchelewa, nimefungua taarifa yako sasa hivi.”
        </p>
      </div>
    </div>
  );
}
