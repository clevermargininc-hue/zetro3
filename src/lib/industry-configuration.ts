/**
 * Zetro Universal Intelligence Engine — Layer B: Industry Configuration Engine
 * Dynamic industry profiles, issue categories, KPIs, workflows, and prompt injection.
 * Follows CTO Specification Section 16.
 */

export interface IndustryProfile {
  id: string;
  name: string;
  description: string;
  defaultKpis: string[];
  entityTypes: string[];
  sampleCategories: Array<{
    code: string;
    name: string;
    description: string;
    severityDefault: "low" | "medium" | "high" | "critical";
    subcategories: string[];
  }>;
  commonRootCauses: string[];
  aiPromptContext: string;
}

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  telecom: {
    id: "telecom",
    name: "Telecommunications",
    description: "Mobile network operators, ISPs, data bundles, SIM registration, billing & field technicians.",
    defaultKpis: ["first_contact_resolution", "repeat_call_rate", "network_outage_delay", "agent_coaching_compliance"],
    entityTypes: ["agent", "technician", "service_provider", "technical_system", "product", "location"],
    sampleCategories: [
      {
        code: "network_connectivity",
        name: "Network & Coverage",
        description: "Voice dropping, 4G/5G data unavailability, cell tower congestion, or fiber cut.",
        severityDefault: "high",
        subcategories: ["data_speed", "call_drop", "coverage_blackspot", "fiber_cut"],
      },
      {
        code: "billing_airtime_bundle",
        name: "Airtime & Bundle Billing",
        description: "Premature bundle expiry, incorrect tariff deductions, or payment gateway timeouts.",
        severityDefault: "medium",
        subcategories: ["bundle_depletion", "tariff_dispute", "recharge_failure"],
      },
      {
        code: "sim_services",
        name: "SIM & KYC Services",
        description: "SIM swap verification, biometric verification issues, PUK lock, roaming activation.",
        severityDefault: "medium",
        subcategories: ["sim_swap", "biometric_kyc", "puk_unlock", "roaming"],
      },
      {
        code: "mobile_money_agent",
        name: "Mobile Financial Services",
        description: "Wallet reversals, agent cash-out timeouts, merchant QR failures.",
        severityDefault: "critical",
        subcategories: ["reversal_pending", "agent_float_shortage", "wrong_recipient"],
      },
    ],
    commonRootCauses: [
      "service_provider_technician",
      "network_technical",
      "operational_process",
      "agent_related",
    ],
    aiPromptContext:
      "Context: Telecommunications enterprise (MNO/ISP). Differentiate between RF network cell failures, billing gateway charging race conditions, agent lack of training on tariff bundles, and field technician dispatch delays.",
  },

  banking: {
    id: "banking",
    name: "Banking & Financial Services",
    description: "Retail banking, cards, mobile banking, failed transfers, ATM disputes, and fraud alerts.",
    defaultKpis: ["dispute_resolution_sla", "first_contact_resolution", "fraud_incident_rate", "regulatory_compliance"],
    entityTypes: ["agent", "department", "technical_system", "service_provider", "product"],
    sampleCategories: [
      {
        code: "card_pos_dispute",
        name: "Card & POS Transactions",
        description: "ATM declined cash dispensations, duplicate POS charges, international card block.",
        severityDefault: "high",
        subcategories: ["atm_unsettled_cash", "duplicate_charge", "pos_declined"],
      },
      {
        code: "digital_banking_transfer",
        name: "Transfers & Instant Payments",
        description: "Inter-bank transfer delays, mobile app login lockout, OTP delivery failure.",
        severityDefault: "high",
        subcategories: ["interbank_delay", "otp_timeout", "app_lockout"],
      },
      {
        code: "loan_account_services",
        name: "Loan & Credit Facilities",
        description: "Interest rate inquiry, early repayment processing, statement dispatch.",
        severityDefault: "medium",
        subcategories: ["interest_dispute", "statement_error", "clearance_delay"],
      },
    ],
    commonRootCauses: [
      "network_technical",
      "operational_process",
      "agent_related",
      "product_service",
    ],
    aiPromptContext:
      "Context: Banking and financial services. Focus on settlement switch latency, fraud prevention false positives, branch turnaround times, and regulatory compliance on customer financial disputes.",
  },

  insurance: {
    id: "insurance",
    name: "Insurance",
    description: "Policy underwriting, claims handling, claim assessment delays, premium payments, and partner garage SLAs.",
    defaultKpis: ["claim_turnaround_time", "repeat_contact_rate", "assessor_sla_compliance", "policy_lapse_rate"],
    entityTypes: ["agent", "contractor", "service_provider", "department", "product"],
    sampleCategories: [
      {
        code: "claim_assessment_delay",
        name: "Claim Assessment & Approval",
        description: "Assessor inspection delays, missing documentation disputes, garage approval hold.",
        severityDefault: "high",
        subcategories: ["garage_hold", "assessor_visit_delay", "payout_schedule"],
      },
      {
        code: "policy_premium_payment",
        name: "Policy & Premium Billing",
        description: "Direct debit failure, policy renewal lapse, certificate generation failure.",
        severityDefault: "medium",
        subcategories: ["debit_order_failed", "certificate_pending", "endorsement_request"],
      },
    ],
    commonRootCauses: [
      "service_provider_technician",
      "operational_process",
      "agent_related",
    ],
    aiPromptContext:
      "Context: Insurance provider. Emphasize third-party loss adjuster performance, partner garage repair timelines, policy endorsement backlogs, and customer communication on claim deductibles.",
  },

  logistics: {
    id: "logistics",
    name: "Logistics & Delivery",
    description: "Freight forwarding, parcel dispatch, courier delivery delays, customs clearance, and lost shipment claims.",
    defaultKpis: ["on_time_delivery_rate", "first_attempt_delivery", "lost_shipment_ratio", "courier_resolution_time"],
    entityTypes: ["technician", "contractor", "service_provider", "asset", "location"],
    sampleCategories: [
      {
        code: "delivery_delayed",
        name: "Delivery Delay & Misrouting",
        description: "Package held at sorting hub, incorrect address routing, missed delivery appointment.",
        severityDefault: "high",
        subcategories: ["hub_congestion", "misrouted_address", "driver_no_show"],
      },
      {
        code: "damaged_lost_item",
        name: "Damaged or Lost Shipment",
        description: "Broken in transit, missing items from sealed parcel, insurance investigation.",
        severityDefault: "critical",
        subcategories: ["damaged_packaging", "missing_content", "total_loss"],
      },
    ],
    commonRootCauses: [
      "service_provider_technician",
      "operational_process",
      "customer_related",
    ],
    aiPromptContext:
      "Context: Logistics and courier operations. Differentiate between last-mile driver routing failure, sorting facility bottleneck, customs clearance regulatory delay, and customer unavailability.",
  },

  retail_ecommerce: {
    id: "retail_ecommerce",
    name: "Retail & E-commerce",
    description: "Online orders, payment processing, product returns, warranty repairs, and refund disputes.",
    defaultKpis: ["return_turnaround_time", "refund_sla_compliance", "customer_effort_score", "order_cancellation_rate"],
    entityTypes: ["agent", "supplier", "product", "technical_system", "service_provider"],
    sampleCategories: [
      {
        code: "order_fulfillment",
        name: "Order Processing & Shipping",
        description: "Out-of-stock cancellation, split order confusion, delivery delay.",
        severityDefault: "medium",
        subcategories: ["stockout", "partial_shipment", "wrong_item_received"],
      },
      {
        code: "returns_refunds",
        name: "Returns & Refund Execution",
        description: "Return package received but refund not credited, store credit dispute.",
        severityDefault: "high",
        subcategories: ["refund_delayed", "return_rejected", "credit_discrepancy"],
      },
    ],
    commonRootCauses: [
      "operational_process",
      "supplier",
      "technical_system",
      "agent_related",
    ],
    aiPromptContext:
      "Context: E-commerce and retail customer care. Focus on payment gateway settlement times, warehouse inventory discrepancies, courier partner handover tracking, and return processing SLAs.",
  },

  utilities: {
    id: "utilities",
    name: "Utilities (Power, Water, Gas)",
    description: "Smart meters, token generation, line outages, leakage repairs, and field technician dispatch.",
    defaultKpis: ["outage_resolution_time", "technician_dispatch_sla", "meter_dispute_rate", "fcr"],
    entityTypes: ["technician", "asset", "technical_system", "location", "team"],
    sampleCategories: [
      {
        code: "outage_blackout",
        name: "Service Interruption / Outage",
        description: "Feeder trip, transformer blown, pipe burst, low water pressure.",
        severityDefault: "critical",
        subcategories: ["transformer_fault", "feeder_trip", "pipe_burst", "pressure_loss"],
      },
      {
        code: "token_metering_dispute",
        name: "Prepaid Token & Meter Readings",
        description: "Token purchase deduction without 20-digit token, faulty smart meter, estimated bill dispute.",
        severityDefault: "high",
        subcategories: ["token_generation_timeout", "meter_tamper_lock", "estimated_billing"],
      },
    ],
    commonRootCauses: [
      "network_technical",
      "service_provider_technician",
      "operational_process",
    ],
    aiPromptContext:
      "Context: Public and private utilities. Analyze substation trips, field maintenance crew dispatch backlogs, token vending switch latency, and meter inspection turnaround times.",
  },

  healthcare: {
    id: "healthcare",
    name: "Healthcare & Clinical Services",
    description: "Patient appointment booking, lab results dispatch, medical insurance pre-authorizations, and prescription refills.",
    defaultKpis: ["appointment_wait_time", "pre_auth_turnaround", "inquiry_resolution_rate", "patient_satisfaction"],
    entityTypes: ["employee", "department", "service_provider", "location", "technical_system"],
    sampleCategories: [
      {
        code: "insurance_pre_auth",
        name: "Insurance Pre-Authorization",
        description: "Delay in approval from private insurer, declined procedure coverage, co-pay dispute.",
        severityDefault: "critical",
        subcategories: ["coverage_declined", "approval_timeout", "co_pay_dispute"],
      },
      {
        code: "appointment_scheduling",
        name: "Appointment & Specialist Scheduling",
        description: "Double booking, specialist unavailability, canceled surgery notification.",
        severityDefault: "medium",
        subcategories: ["rescheduled_booking", "specialist_delayed", "records_missing"],
      },
    ],
    commonRootCauses: [
      "operational_process",
      "service_provider_technician",
      "agent_related",
    ],
    aiPromptContext:
      "Context: Healthcare clinic and hospital operations. Focus on external insurer pre-authorization wait times, diagnostic report turnarounds, and clinic scheduling adherence.",
  },

  hospitality: {
    id: "hospitality",
    name: "Hospitality & Travel",
    description: "Hotel bookings, flight reservations, baggage handling, check-in errors, and cancellation refunds.",
    defaultKpis: ["first_contact_resolution", "escalation_rate", "refund_turnaround", "guest_satisfaction"],
    entityTypes: ["employee", "service_provider", "location", "product", "team"],
    sampleCategories: [
      {
        code: "reservation_modification",
        name: "Booking & Cancellation Dispute",
        description: "Failed date modification, non-refundable tariff dispute, overbooked hotel room.",
        severityDefault: "high",
        subcategories: ["overbooking", "cancellation_fee", "upgrade_unfulfilled"],
      },
    ],
    commonRootCauses: [
      "operational_process",
      "service_provider_technician",
      "technical_system",
    ],
    aiPromptContext:
      "Context: Hospitality and travel operations. Analyze airline/hotel inventory sync delays, OTA partner booking mismatches, and guest refund approval workflows.",
  },
};

/**
 * Returns the active industry profile for a given workspace, falling back to 'telecom'.
 */
export function getIndustryProfile(industryId: string = "telecom"): IndustryProfile {
  return INDUSTRY_PROFILES[industryId] || INDUSTRY_PROFILES.telecom;
}

/**
 * Generates dynamic AI prompt instructions based on the tenant's industry configuration.
 */
export function buildIndustryAiPromptAddendum(industryId: string = "telecom"): string {
  const profile = getIndustryProfile(industryId);
  const categoriesList = profile.sampleCategories
    .map((c) => `- ${c.code} (${c.name}): ${c.description}`)
    .join("\n");

  return `
INDUSTRY-SPECIFIC INTELLIGENCE CONTEXT (${profile.name.toUpperCase()}):
${profile.aiPromptContext}

Standard ${profile.name} Issue Categories to evaluate:
${categoriesList}

Always align extracted categories and operational root causes with these domain-specific operational entities and processes.
`;
}

