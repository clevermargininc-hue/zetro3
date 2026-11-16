export type BrandKey =
  | "amazon_connect"
  | "twilio"
  | "genesys"
  | "avaya"
  | "webex"
  | "asterisk"
  | "3cx"
  | "zendesk"
  | "salesforce"
  | "hubspot"
  | "freshdesk"
  | "intercom"
  | "shopify"
  | "stripe"
  | "slack"
  | "whatsapp"
  | "google"
  | "microsoft"
  | "apple"
  | "openai"
  | "linkedin"
  | "x"
  | "youtube"
  | "excel"
  | "webhook"
  | "generic"
  | "voice"
  | "email"
  | "chat";

export interface BrandMeta {
  key: BrandKey;
  label: string;
  badgeBg: string;
  accentColor: string;
  category: "telephony" | "crm" | "channel" | "cloud" | "social" | "file" | "api";
}

export const BRAND_CATALOGUE_META: Record<BrandKey, BrandMeta> = {
  amazon_connect: {
    key: "amazon_connect",
    label: "Amazon Connect",
    badgeBg: "#232F3E",
    accentColor: "#FF9900",
    category: "telephony",
  },
  twilio: {
    key: "twilio",
    label: "Twilio",
    badgeBg: "#FFF1F2",
    accentColor: "#F22F46",
    category: "telephony",
  },
  genesys: {
    key: "genesys",
    label: "Genesys Cloud",
    badgeBg: "#FFF4EF",
    accentColor: "#FF4F1F",
    category: "telephony",
  },
  avaya: {
    key: "avaya",
    label: "Avaya",
    badgeBg: "#FEF2F2",
    accentColor: "#DA291C",
    category: "telephony",
  },
  webex: {
    key: "webex",
    label: "Cisco Webex CC",
    badgeBg: "#0A2647",
    accentColor: "#00BCEB",
    category: "telephony",
  },
  asterisk: {
    key: "asterisk",
    label: "Asterisk / FreePBX",
    badgeBg: "#FFF7ED",
    accentColor: "#F68B1F",
    category: "telephony",
  },
  "3cx": {
    key: "3cx",
    label: "3CX Phone System",
    badgeBg: "#ECFDF5",
    accentColor: "#059669",
    category: "telephony",
  },
  zendesk: {
    key: "zendesk",
    label: "Zendesk Support",
    badgeBg: "#03363D",
    accentColor: "#78A300",
    category: "crm",
  },
  salesforce: {
    key: "salesforce",
    label: "Salesforce",
    badgeBg: "#EFF6FF",
    accentColor: "#00A1E0",
    category: "crm",
  },
  hubspot: {
    key: "hubspot",
    label: "HubSpot",
    badgeBg: "#FFF3EF",
    accentColor: "#FF7A59",
    category: "crm",
  },
  freshdesk: {
    key: "freshdesk",
    label: "Freshdesk",
    badgeBg: "#ECFDF5",
    accentColor: "#25C16F",
    category: "crm",
  },
  intercom: {
    key: "intercom",
    label: "Intercom",
    badgeBg: "#EFF6FF",
    accentColor: "#1F8DED",
    category: "crm",
  },
  shopify: {
    key: "shopify",
    label: "Shopify",
    badgeBg: "#F0FDF4",
    accentColor: "#95BF47",
    category: "crm",
  },
  stripe: {
    key: "stripe",
    label: "Stripe",
    badgeBg: "#EEF2FF",
    accentColor: "#635BFF",
    category: "crm",
  },
  slack: {
    key: "slack",
    label: "Slack",
    badgeBg: "#F5F3FF",
    accentColor: "#4A154B",
    category: "channel",
  },
  whatsapp: {
    key: "whatsapp",
    label: "WhatsApp",
    badgeBg: "#ECFDF5",
    accentColor: "#25D366",
    category: "channel",
  },
  google: {
    key: "google",
    label: "Google",
    badgeBg: "#F8FAFC",
    accentColor: "#4285F4",
    category: "cloud",
  },
  microsoft: {
    key: "microsoft",
    label: "Microsoft",
    badgeBg: "#F8FAFC",
    accentColor: "#00A4EF",
    category: "cloud",
  },
  apple: {
    key: "apple",
    label: "Apple",
    badgeBg: "#F8FAFC",
    accentColor: "#111827",
    category: "cloud",
  },
  openai: {
    key: "openai",
    label: "OpenAI",
    badgeBg: "#F0FDFA",
    accentColor: "#10A37F",
    category: "cloud",
  },
  linkedin: {
    key: "linkedin",
    label: "LinkedIn",
    badgeBg: "#EFF6FF",
    accentColor: "#0A66C2",
    category: "social",
  },
  x: {
    key: "x",
    label: "X",
    badgeBg: "#F8FAFC",
    accentColor: "#0F172A",
    category: "social",
  },
  youtube: {
    key: "youtube",
    label: "YouTube",
    badgeBg: "#FEF2F2",
    accentColor: "#FF0000",
    category: "social",
  },
  excel: {
    key: "excel",
    label: "Microsoft Excel",
    badgeBg: "#ECFDF5",
    accentColor: "#1D6F42",
    category: "file",
  },
  webhook: {
    key: "webhook",
    label: "Webhook",
    badgeBg: "#EEF2FF",
    accentColor: "#4F46E5",
    category: "api",
  },
  generic: {
    key: "generic",
    label: "REST API",
    badgeBg: "#EEF3FF",
    accentColor: "#2459E8",
    category: "api",
  },
  voice: {
    key: "voice",
    label: "Voice",
    badgeBg: "#EFF6FF",
    accentColor: "#2459E8",
    category: "channel",
  },
  email: {
    key: "email",
    label: "Email",
    badgeBg: "#F0F9FF",
    accentColor: "#0284C7",
    category: "channel",
  },
  chat: {
    key: "chat",
    label: "Live Chat",
    badgeBg: "#EEF2FF",
    accentColor: "#6366F1",
    category: "channel",
  },
};

const BRAND_ALIAS_RULES: Array<[RegExp, BrandKey]> = [
  [/amazon[_\s-]*connect|\baws\b|amazon/i, "amazon_connect"],
  [/twilio/i, "twilio"],
  [/genesys/i, "genesys"],
  [/avaya/i, "avaya"],
  [/webex|cisco/i, "webex"],
  [/asterisk|freepbx/i, "asterisk"],
  [/\b3cx\b/i, "3cx"],
  [/zendesk/i, "zendesk"],
  [/salesforce/i, "salesforce"],
  [/hubspot/i, "hubspot"],
  [/freshdesk/i, "freshdesk"],
  [/intercom/i, "intercom"],
  [/shopify/i, "shopify"],
  [/stripe/i, "stripe"],
  [/slack/i, "slack"],
  [/whatsapp/i, "whatsapp"],
  [/google|gmail/i, "google"],
  [/microsoft|azure|teams/i, "microsoft"],
  [/openai|gpt/i, "openai"],
  [/linkedin/i, "linkedin"],
  [/youtube/i, "youtube"],
  [/excel|xlsx/i, "excel"],
  [/webhook/i, "webhook"],
  [/voice|sip|pbx|telephony/i, "voice"],
  [/email|smtp/i, "email"],
  [/chat/i, "chat"],
];

/**
 * Resolve a real-world brand key from explicit provider keys, profile tags, channel names, or human connection labels.
 */
export function resolveBrandKey(input: {
  provider?: string | null;
  providerProfile?: string | null;
  sourceSystemId?: string | null;
  name?: string | null;
  channel?: string | null;
  integrationType?: string | null;
}): BrandKey {
  const candidates = [
    input.providerProfile,
    input.channel,
    input.sourceSystemId,
    input.provider,
    input.name,
    input.integrationType,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());

  for (const raw of candidates) {
    const exact = raw.toLowerCase().replace(/[\s-]+/g, "_");
    if (exact === "zendesk_tickets") return "zendesk";
    if (Object.hasOwn(BRAND_CATALOGUE_META, exact) && exact !== "generic") {
      return exact as BrandKey;
    }
  }

  for (const raw of candidates) {
    for (const [pattern, key] of BRAND_ALIAS_RULES) {
      if (pattern.test(raw)) return key;
    }
  }

  return "generic";
}
