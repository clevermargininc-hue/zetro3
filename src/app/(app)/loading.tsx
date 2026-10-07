export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse py-4">
      <div className="h-8 w-48 rounded-lg bg-[var(--bg-surface-alt)]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--bg-surface-alt)]" />
            <div className="h-6 w-16 rounded bg-[var(--bg-surface-alt)]" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]" />
    </div>
  );
}
