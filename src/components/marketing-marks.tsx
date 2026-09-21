export function MicMark() {
  return (
    <svg viewBox="0 0 200 200" className="mark-svg" aria-hidden>
      <circle cx="100" cy="56" r="40" fill="#1a56db" />
      <circle cx="100" cy="56" r="27" fill="none" stroke="#dbe7ff" strokeWidth="3.5" />
      <circle cx="100" cy="56" r="14" fill="none" stroke="#dbe7ff" strokeWidth="3.5" />
      <path
        d="M60 64c0 24 18 42 40 42s40-18 40-42"
        fill="none"
        stroke="#111827"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="90" y="104" width="20" height="40" rx="6" fill="#111827" />
      <path d="M100 144v24" fill="none" stroke="#111827" strokeWidth="7" strokeLinecap="round" />
      <path d="M70 172h60" fill="none" stroke="#111827" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M152 40c12 10 18 22 18 36s-6 26-18 36"
        fill="none"
        stroke="#1a56db"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M168 28c16 14 24 30 24 48s-8 34-24 48"
        fill="none"
        stroke="#1a56db"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.2"
      />
    </svg>
  );
}
