import Link from "next/link";

/** Brand glyph matching the Zetro landing page navbar mark. */
export function ZetroMark({
  className = "h-[30px] w-[30px]",
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 select-none ${className}`}
    >
      <rect width="36" height="36" rx="10" fill={invert ? "#2F6BFF" : "#0A1A3F"} />
      <path
        d="M9.5 11.5H22.5L13 24.5H26.5"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="23.5"
        y="9.5"
        width="3"
        height="7"
        rx="1.5"
        fill={invert ? "#DCE6FF" : "#2F6BFF"}
      />
      <rect
        x="27.5"
        y="11.5"
        width="3"
        height="5"
        rx="1.5"
        fill={invert ? "#DCE6FF" : "#2F6BFF"}
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  invert = false,
  collapsed = false,
  href = "/",
}: {
  size?: "sm" | "md" | "lg";
  invert?: boolean;
  collapsed?: boolean;
  href?: string;
}) {
  const mark =
    size === "lg"
      ? "h-10 w-10"
      : size === "sm"
        ? "h-[30px] w-[30px]"
        : "h-[34px] w-[34px]";
  const type =
    size === "lg"
      ? "text-[28px]"
      : size === "sm"
        ? "text-[22px]"
        : "text-[25px]";

  return (
    <Link
      href={href}
      aria-label="Zetro home"
      className="inline-flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2459E8]"
    >
      <ZetroMark className={mark} invert={invert} />
      {!collapsed && (
        <span
          className={`${type} font-bold leading-none tracking-[-0.04em] ${invert ? "text-white" : "text-[#0A1A3F]"}`}
          style={{
            fontFamily:
              'var(--font-space-grotesk), "Space Grotesk", var(--font-inter), system-ui, sans-serif',
          }}
        >
          Zetro
        </span>
      )}
    </Link>
  );
}
