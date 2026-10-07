import Link from "next/link";

/** The Z from Unbounded Bold, so the mark matches the wordmark and favicon without loading the font. */
const Z_PATH =
  "M17.54 17.75L6.46 17.75L6.46 15.45L13.98 8.07L16.27 8.75L6.50 8.75L6.50 6.25L17.50 6.25L17.50 8.55L9.98 15.94L8.00 15.25L17.54 15.25L17.54 17.75Z";

export function ZetroMark({
  className = "h-9 w-9",
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <span
      className={`shrink-0 grid place-items-center rounded-[4px] ${
        invert ? "bg-white text-blue" : "bg-blue text-white"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        <path d={Z_PATH} fill="currentColor" />
      </svg>
    </span>
  );
}

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
  const type = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[16px]" : "text-[19px]";

  return (
    <Link href="/" className="flex items-center gap-2.5">
      <ZetroMark className={mark} invert={invert} />
      {!collapsed && (
        <span
          className={`${type} font-brand font-bold leading-none tracking-[-0.01em] ${
            invert ? "text-white" : "text-ink"
          }`}
        >
          Zetro
        </span>
      )}
    </Link>
  );
}
