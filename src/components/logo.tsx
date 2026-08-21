import Link from "next/link";

export function Logo({
  size = "md",
  invert = false,
  collapsed = false,
}: {
  size?: "sm" | "md" | "lg";
  invert?: boolean;
  collapsed?: boolean;
}) {
  const mark = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const type = size === "lg" ? "text-2xl" : size === "sm" ? "text-[18px]" : "text-xl";

  return (
    <Link href="/" className="flex items-center gap-3">
      <span
        className={`${mark} shrink-0 grid place-items-center rounded-[0.4rem] ${
          invert ? "bg-white text-blue" : "bg-gradient-to-br from-blue to-blue-2 text-white shadow-sm"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6.5 7.5L17.5 7.5L6.5 16.5L17.5 16.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!collapsed && (
        <span className="leading-tight flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200">
          <span
            className={`${type} block font-bold tracking-tight ${
              invert ? "text-white" : "text-ink"
            }`}
          >
            Zetro
          </span>
        </span>
      )}
    </Link>
  );
}
