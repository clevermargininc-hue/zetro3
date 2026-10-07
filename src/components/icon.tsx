import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
export type IconColor = "navy" | "secondary" | "accent" | "light" | "inherit";
export type IconChip = "navy" | "accent" | "surface" | "none";

interface IconProps {
  icon: IconDefinition;
  size?: IconSize;
  color?: IconColor;
  chip?: IconChip;
  className?: string;
  chipClassName?: string;
  title?: string;
  spin?: boolean;
}

const sizeClasses: Record<IconSize, string> = {
  xs: "w-3 h-3 text-[11px]",
  sm: "w-3.5 h-3.5 text-[13px]",
  md: "w-4 h-4 text-[15px]",
  lg: "w-5 h-5 text-[18px]",
  xl: "w-6 h-6 text-[22px]",
};

const colorClasses: Record<IconColor, string> = {
  navy: "text-[#061C52]",
  secondary: "text-[#334155]",
  accent: "text-[#04B6DA]",
  light: "text-[#FFFFFF]",
  inherit: "text-current",
};

const chipPresets: Record<Exclude<IconChip, "none">, { container: string; defaultColor: IconColor }> = {
  navy: {
    container: "grid h-9 w-9 place-items-center rounded-none bg-[#061C52] text-white shadow-xs",
    defaultColor: "light",
  },
  accent: {
    container: "inline-flex items-center justify-center w-5 h-5 rounded-none bg-[#04B6DA] text-white shadow-2xs",
    defaultColor: "light",
  },
  surface: {
    container: "grid h-6 w-6 place-items-center rounded-none bg-[#F3F6FD] border border-[#E3EBFB]",
    defaultColor: "accent",
  },
};

export function Icon({
  icon,
  size = "md",
  color,
  chip = "none",
  className = "",
  chipClassName = "",
  title,
  spin = false,
}: IconProps) {
  const resolvedColor = color || (chip !== "none" ? chipPresets[chip].defaultColor : "inherit");
  const colorClass = colorClasses[resolvedColor];
  const sizeClass = sizeClasses[size];

  if (chip !== "none") {
    const chipConfig = chipPresets[chip];
    return (
      <span className={`${chipConfig.container} ${chipClassName}`} title={title}>
        <FontAwesomeIcon
          icon={icon}
          className={`${sizeClass} ${colorClass} ${className}`}
          spin={spin}
          aria-hidden={!title}
        />
      </span>
    );
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      className={`inline-block ${sizeClass} ${colorClass} ${className}`}
      title={title}
      spin={spin}
      aria-hidden={!title}
    />
  );
}
