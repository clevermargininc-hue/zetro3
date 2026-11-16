import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faApple,
  faAws,
  faHubspot,
  faIntercom,
  faLinkedinIn,
  faOpenai,
  faSalesforce,
  faShopify,
  faSlack,
  faStripeS,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { Globe, Mail, MessageSquare, PhoneCall, Webhook } from "lucide-react";
import { BRAND_CATALOGUE_META, resolveBrandKey, type BrandKey } from "@/lib/brand-icons";

function FaBrandSvg({
  def,
  size,
  color = "currentColor",
  className = "",
}: {
  def: IconDefinition;
  size: number;
  color?: string;
  className?: string;
}) {
  const [width, height, , , rawPath] = def.icon;
  const paths = Array.isArray(rawPath) ? rawPath : [rawPath];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      fill={color}
      className={className}
      aria-hidden="true"
    >
      {paths.map((d, idx) => (
        <path key={idx} d={d} />
      ))}
    </svg>
  );
}

function BrandGlyph({
  brand,
  size,
  onDarkBadge,
}: {
  brand: BrandKey;
  size: number;
  onDarkBadge?: boolean;
}) {
  switch (brand) {
    case "amazon_connect":
      return (
        <span className="relative inline-flex items-center justify-center">
          <FaBrandSvg
            def={faAws}
            size={Math.round(size * 1.08)}
            color={onDarkBadge ? "#FFFFFF" : "#232F3E"}
          />
        </span>
      );

    case "twilio":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="#F22F46" strokeWidth="2.4" />
          <circle cx="9.2" cy="9.2" r="1.75" fill="#F22F46" />
          <circle cx="14.8" cy="9.2" r="1.75" fill="#F22F46" />
          <circle cx="9.2" cy="14.8" r="1.75" fill="#F22F46" />
          <circle cx="14.8" cy="14.8" r="1.75" fill="#F22F46" />
        </svg>
      );

    case "genesys":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3a9 9 0 1 0 9 9h-3.2a5.8 5.8 0 1 1-5.8-5.8V3Z"
            fill="#FF4F1F"
          />
          <circle cx="15.5" cy="7" r="2.2" fill="#FF4F1F" />
          <circle cx="12" cy="12" r="2.5" fill="#FF4F1F" />
        </svg>
      );

    case "avaya":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12.2 3L4 20h3.6l4.6-9.8L16.7 20H20.3L12.2 3Z" fill="#DA291C" />
          <path d="M8.8 14.2h6.8l-1.3 2.7H7.5l1.3-2.7Z" fill="#DA291C" />
        </svg>
      );

    case "webex":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8c2.45 0 4.65-1.1 6.12-2.84"
            stroke="#00BCEB"
            strokeWidth="3.1"
            strokeLinecap="round"
          />
          <path
            d="M18.12 6.84A7.96 7.96 0 0 0 12 4c-2.6 0-4.91 1.24-6.37 3.16"
            stroke="#07C160"
            strokeWidth="3.1"
            strokeLinecap="round"
          />
          <circle cx="17.8" cy="12" r="2.2" fill="#00BCEB" />
        </svg>
      );

    case "asterisk":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.5v19M3.8 7.25l16.4 9.5M20.2 7.25l-16.4 9.5"
            stroke="#F68B1F"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "3cx":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.5 14.5c2.2 3.4 6 5.2 9.8 4.4a9.2 9.2 0 0 0 6.5-5.6"
            stroke="#059669"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M7.5 10.5a5.5 5.5 0 0 1 8.8-2.2"
            stroke="#10B981"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="15" cy="12" r="2" fill="#059669" />
        </svg>
      );

    case "zendesk":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <polygon points="3,5 11.5,5 3,15.5" fill={onDarkBadge ? "#FFFFFF" : "#03363D"} />
          <path
            d="M11.5 19a4.25 4.25 0 0 1-8.5 0h8.5Z"
            fill={onDarkBadge ? "#78A300" : "#03363D"}
          />
          <path
            d="M12.5 5a4.25 4.25 0 0 1 8.5 0h-8.5Z"
            fill={onDarkBadge ? "#FFFFFF" : "#03363D"}
          />
          <polygon points="21,19 12.5,19 21,8.5" fill={onDarkBadge ? "#78A300" : "#03363D"} />
        </svg>
      );

    case "freshdesk":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.5C6.75 2.5 2.5 6.75 2.5 12v7a2.5 2.5 0 0 0 2.5 2.5h7c5.25 0 9.5-4.25 9.5-9.5S17.25 2.5 12 2.5Z"
            fill="#25C16F"
          />
          <path
            d="M9.5 16V9.2c0-.7.5-1.2 1.2-1.2h4.8v2.2H12v1.6h2.8v2.1H12V16H9.5Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case "google":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      );

    case "microsoft":
      return (
        <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
      );

    case "excel":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="20" height="18" rx="2.5" fill="#1D6F42" />
          <path d="M13 3v18M13 9h9M13 15h9" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.3" />
          <path
            d="m5.5 8.5 4.8 7M10.3 8.5l-4.8 7"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "salesforce":
      return <FaBrandSvg def={faSalesforce} size={size} color="#00A1E0" />;
    case "hubspot":
      return <FaBrandSvg def={faHubspot} size={size} color="#FF7A59" />;
    case "intercom":
      return <FaBrandSvg def={faIntercom} size={size} color="#1F8DED" />;
    case "shopify":
      return <FaBrandSvg def={faShopify} size={size} color="#95BF47" />;
    case "stripe":
      return <FaBrandSvg def={faStripeS} size={size} color="#635BFF" />;
    case "slack":
      return <FaBrandSvg def={faSlack} size={size} color="#4A154B" />;
    case "whatsapp":
      return <FaBrandSvg def={faWhatsapp} size={size} color="#25D366" />;
    case "apple":
      return <FaBrandSvg def={faApple} size={size} color="currentColor" />;
    case "openai":
      return <FaBrandSvg def={faOpenai} size={size} color="#10A37F" />;
    case "linkedin":
      return <FaBrandSvg def={faLinkedinIn} size={size} color="currentColor" />;
    case "x":
      return <FaBrandSvg def={faXTwitter} size={size} color="currentColor" />;
    case "youtube":
      return <FaBrandSvg def={faYoutube} size={size} color="currentColor" />;

    case "webhook":
      return <Webhook style={{ width: size, height: size }} className="text-[#4F46E5]" aria-hidden="true" />;
    case "voice":
      return <PhoneCall style={{ width: size, height: size }} className="text-[#2459E8]" aria-hidden="true" />;
    case "email":
      return <Mail style={{ width: size, height: size }} className="text-[#0284C7]" aria-hidden="true" />;
    case "chat":
      return <MessageSquare style={{ width: size, height: size }} className="text-[#6366F1]" aria-hidden="true" />;
    case "generic":
    default:
      return <Globe style={{ width: size, height: size }} className="text-[#2459E8]" aria-hidden="true" />;
  }
}

export function BrandIcon({
  brand,
  size = 20,
  variant = "badge",
  className = "",
}: {
  brand: BrandKey;
  size?: number;
  variant?: "badge" | "mark";
  className?: string;
}) {
  const meta = BRAND_CATALOGUE_META[brand] || BRAND_CATALOGUE_META.generic;
  const darkBadge = brand === "amazon_connect" || brand === "webex" || brand === "zendesk";

  if (variant === "mark") {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
        <BrandGlyph brand={brand} size={size} onDarkBadge={false} />
      </span>
    );
  }

  const boxSize = Math.max(size + 10, 26);
  return (
    <span
      title={meta.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border shadow-2xs ${
        brand === "amazon_connect"
          ? "border-[#FF9900]/50"
          : darkBadge
            ? "border-slate-700/60"
            : "border-slate-200/90"
      } ${className}`}
      style={{
        width: boxSize,
        height: boxSize,
        backgroundColor: meta.badgeBg,
      }}
    >
      <BrandGlyph brand={brand} size={Math.round(size * 0.86)} onDarkBadge={darkBadge} />
    </span>
  );
}

export function IntegrationBrandIcon({
  provider,
  providerProfile,
  sourceSystemId,
  name,
  integrationType,
  size = 22,
  variant = "badge",
  className = "",
}: {
  provider?: string | null;
  providerProfile?: string | null;
  sourceSystemId?: string | null;
  name?: string | null;
  integrationType?: string | null;
  size?: number;
  variant?: "badge" | "mark";
  className?: string;
}) {
  const brand = resolveBrandKey({
    provider,
    providerProfile,
    sourceSystemId,
    name,
    integrationType,
  });
  return <BrandIcon brand={brand} size={size} variant={variant} className={className} />;
}

export function BrandChannelPill({ channel }: { channel: string | null | undefined }) {
  const key = resolveBrandKey({ channel: channel || "voice" });
  const labelMap: Record<string, string> = {
    whatsapp: "WhatsApp",
    voice: "Voice",
    email: "Email",
    chat: "Chat",
  };
  const label = labelMap[key] || channel || "Other";

  return (
    <span className="inline-flex items-center gap-1 rounded bg-[var(--z-surface-muted)] px-1.5 py-0.5 font-medium text-[var(--z-ink-secondary)]">
      <BrandIcon brand={key} size={12} variant="mark" />
      <span>{label}</span>
    </span>
  );
}

