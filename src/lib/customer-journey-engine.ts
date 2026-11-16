/**
 * Phases 3, 4, 5, 6, 7 & 9:
 * Core Customer Journey, Repeat Call Detection, Issue Lifecycle & Root-Cause Engine
 */

import {
  EVIDENCE_TYPE_LABELS,
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  JOURNEY_MODEL_VERSION,
  ROOT_CAUSE_LABELS,
  type IssueCategory,
  type IssueLifecycleStatus,
  type JourneyAiAnalysisOutput,
  type MatchClassification,
  type PriorIssueDigest,
  type ResolutionConfirmation,
  type RootCauseCategory,
  type RootCauseEvidenceType,
  type TranscriptEvidenceExcerpt,
} from "@/lib/ai/prompts/customer-journey";
import { cosineSimilarity } from "@/lib/embeddings";
import { extractCandidateIdentifiers } from "@/lib/customer-identity";

export interface RepeatDetectionThresholds {
  /** Minimum combined score (0..1) to classify as the exact same recurring issue */
  sameIssueThreshold: number;
  /** Minimum combined score (0..1) to classify as a related issue */
  relatedIssueThreshold: number;
  /** Minimum score below which it is a clear new issue; between this and relatedIssueThreshold -> needs_review */
  needsReviewFloor: number;
  /** Maximum days between calls before time decay reduces same-issue confidence */
  activeWindowDays: number;
}

export const DEFAULT_REPEAT_THRESHOLDS: RepeatDetectionThresholds = {
  sameIssueThreshold: 0.68,
  relatedIssueThreshold: 0.54,
  needsReviewFloor: 0.42,
  activeWindowDays: 45,
};

export interface CallTranscriptTurn {
  speaker: string;
  role?: "agent" | "customer" | "unknown" | string;
  text: string;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface ExtractedCallIssue {
  title: string;
  category: IssueCategory;
  subcategory: string;
  product_service: string;
  symptoms: string[];
  location: string | null;
  service_provider: string | null;
  summary: string;
  extracted_phone: string | null;
  extracted_customer_id: string | null;
  embedding?: number[] | null;
}

export interface RepeatComparisonResult {
  isRepeatCustomer: boolean;
  isRepeatIssue: boolean;
  matchClassification: MatchClassification;
  matchedPreviousIssueId: string | null;
  matchedPreviousIssueCode: string | null;
  confidence: number;
  reason: string;
  attributeBreakdown: {
    categoryScore: number;
    productScore: number;
    semanticScore: number;
    symptomOverlap: number;
    timeProximityScore: number;
  };
  needsReview: boolean;
}

export interface LifecycleTransitionResult {
  previousStatus: IssueLifecycleStatus | null;
  newStatus: IssueLifecycleStatus;
  resolutionConfirmation: ResolutionConfirmation;
  callResolutionState:
    | "call_completed_issue_open"
    | "pending_external_action"
    | "escalated"
    | "agent_reported_resolved"
    | "customer_confirmed_resolved"
    | "operationally_verified_resolved"
    | "unconfirmed";
  isReopened: boolean;
  reason: string;
}

export interface RootCauseEvaluationResult {
  primaryCategory: RootCauseCategory;
  primarySubcategory: string;
  secondaryCategory: RootCauseCategory | null;
  secondarySubcategory: string | null;
  evidenceType: RootCauseEvidenceType;
  confidence: number;
  explanation: string;
  responsibleTeam: string;
  recommendedAction: string;
  transcriptExcerpts: TranscriptEvidenceExcerpt[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "have", "from", "your", "you",
  "are", "was", "were", "been", "has", "had", "not", "but", "what", "all",
  "can", "will", "just", "about", "call", "calling", "called", "hello", "thank",
  "thanks", "good", "morning", "afternoon", "evening", "agent", "customer",
  "please", "yes", "okay", "right", "now", "today", "yesterday", "days", "ago",
  "still", "my", "our", "me", "we", "they", "them", "their", "there", "here",
  "kwa", "ya", "na", "ni", "wa", "katika", "hii", "huyo", "sana", "lakini",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function tokenJaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Extracts structured issue attributes from a call transcript + metadata when
 * LLM output is unavailable or as a structured baseline prior to LLM refinement.
 */
export function extractStructuredIssueFromCall(input: {
  title?: string | null;
  fileName?: string | null;
  qaSummary?: string | null;
  utterances: CallTranscriptTurn[];
  callerPhone?: string | null;
  externalCustomerId?: string | null;
  location?: string | null;
  serviceProvider?: string | null;
  productCategory?: string | null;
  defaultCountry?: string | null;
}): ExtractedCallIssue {
  const customerTurns = input.utterances.filter(
    (u) => u.role === "customer" || /customer|caller|client/i.test(u.speaker),
  );
  const allText = [
    input.title || "",
    input.qaSummary || "",
    ...input.utterances.map((u) => u.text),
  ].join(" ");
  const lower = allText.toLowerCase();

  let category: IssueCategory = "general_inquiry";
  let subcategory = "general_support";
  let productService = input.productCategory || "General Service";
  const symptoms: string[] = [];

  // Category & symptom rules
  if (
    /\b(internet|wifi|wi-fi|fiber|fibre|broadband|data\s*connection|no\s*connection|offline|slow\s*speed|browsing|network\s*down|router\s*blinking|red\s*light|mtandao)\b/.test(
      lower,
    )
  ) {
    category = "internet_connectivity";
    productService = /\b(fiber|fibre|home\s*broadband|router)\b/.test(lower)
      ? "Home Fiber & Broadband"
      : "Mobile Data & Internet";
    if (/\b(red\s*light|los|blinking)\b/.test(lower)) {
      subcategory = "fiber_signal_loss";
      symptoms.push("Router LOS / red blinking light");
    } else if (/\b(slow|buffering|speed)\b/.test(lower)) {
      subcategory = "slow_internet_speed";
      symptoms.push("Slow internet throughput");
    } else {
      subcategory = "connectivity_outage";
      symptoms.push("Internet connection unavailable");
    }
  } else if (
    /\b(bill|billing|overcharg|invoice|charged\s*twice|wrong\s*amount|statement|postpaid\s*bill|tariff|malipo|ankara|makato)\b/.test(
      lower,
    )
  ) {
    category = "billing_charging";
    productService = "Billing & Account Balance";
    subcategory = /\b(twice|double)\b/.test(lower)
      ? "duplicate_charge"
      : "incorrect_bill_amount";
    symptoms.push("Disputed bill or unexpected balance deduction");
  } else if (
    /\b(airtel\s*money|m-pesa|mpesa|mobile\s*money|wallet|reversal|wrong\s*number|cash\s*out|agent\s*float|pin\s*reset|muamala|kutuma\s*pesa)\b/.test(
      lower,
    )
  ) {
    category = "mobile_money";
    productService = "Airtel Money / Mobile Wallet";
    subcategory = /\b(reversal|wrong\s*number|sent\s*to)\b/.test(lower)
      ? "transaction_reversal"
      : "wallet_transaction_issue";
    symptoms.push("Mobile money transaction or reversal issue");
  } else if (
    /\b(sim\s*swap|sim\s*card|nida|kyc|biometric|blocked\s*sim|puk|registration|usajili\s*wa\s*laini)\b/.test(
      lower,
    )
  ) {
    category = "sim_kyc_registration";
    productService = "SIM & KYC Registration";
    subcategory = "sim_registration_or_unblock";
    symptoms.push("SIM registration, KYC, or PUK block");
  } else if (
    /\b(call\s*drop|cannot\s*make\s*calls|voice\s*signal|no\s*service|network\s*bars|coverage)\b/.test(
      lower,
    )
  ) {
    category = "voice_network_coverage";
    productService = "Mobile Voice Network";
    subcategory = "voice_coverage_issue";
    symptoms.push("Voice call drops or weak signal coverage");
  } else if (
    /\b(router|modem|cpe|device\s*faulty|power\s*adapter|hardware)\b/.test(lower)
  ) {
    category = "device_router_hardware";
    productService = "CPE / Router Hardware";
    subcategory = "hardware_fault";
    symptoms.push("Customer premises equipment / router malfunction");
  } else if (
    /\b(bundle|package|subscription|auto-renew|plan\s*upgrade|kifurushi)\b/.test(lower)
  ) {
    category = "package_subscription";
    productService = "Data / Voice Bundles";
    subcategory = "bundle_subscription_issue";
    symptoms.push("Bundle activation or renewal issue");
  }

  if (/\b(technician|fundi|field\s*team|engineer\s*visit|dispatch)\b/.test(lower)) {
    symptoms.push("Requires or awaiting field technician visit");
  }
  if (/\b(two\s*days\s*ago|called\s*yesterday|called\s*earlier|third\s*time|still\s*not\s*working|bado)\b/.test(lower)) {
    symptoms.push("Customer reports unresolved issue from prior contact");
  }

  // Extract location if mentioned
  let location = input.location || null;
  if (!location) {
    const locMatch = allText.match(
      /\b(?:in|at|from|area|location|eneo\s*la)\s+(Dar\s*es\s*Salaam|Mikocheni|Masaki|Kinondoni|Ilala|Temeke|Mbezi|Arusha|Mwanza|Dodoma|Mbeya|Zanzibar|Nairobi|Westlands|Kampala|Kigali|Lusaka|Lilongwe)\b/i,
    );
    if (locMatch) location = locMatch[1];
  }

  // Extract service provider / field team if mentioned
  let serviceProvider = input.serviceProvider || null;
  if (!serviceProvider && /\b(technician|field\s*team|fiber\s*team|contractor|fundi)\b/i.test(allText)) {
    serviceProvider = "Field Technician Dispatch";
  }

  // Extract identifiers
  const candidates = extractCandidateIdentifiers({
    explicitCustomerId: input.externalCustomerId,
    callerPhone: input.callerPhone,
    fileName: input.fileName,
    title: input.title,
    utterances: input.utterances,
    defaultCountry: input.defaultCountry,
  });
  const phoneCand = candidates.find(
    (c) => c.idType === "msisdn" || c.idType === "extracted_phone",
  );
  const idCand = candidates.find(
    (c) => c.idType === "customer_id" || c.idType === "extracted_id",
  );

  // Build concise title & summary
  const firstCustomerQuote = customerTurns[0]?.text || input.utterances[0]?.text || "";
  const categoryLabel = ISSUE_CATEGORY_LABELS[category] || "Customer Support";
  const title =
    input.title && !/\.(mp3|wav|m4a|ogg|webm)$/i.test(input.title) && input.title.length > 6
      ? input.title
      : `${categoryLabel} — ${subcategory.replace(/_/g, " ")}`;

  const summary =
    input.qaSummary?.trim() ||
    (firstCustomerQuote
      ? `Customer reported ${categoryLabel.toLowerCase()} (${subcategory.replace(/_/g, " ")}): "${firstCustomerQuote.slice(0, 180)}"`
      : `Customer contacted support regarding ${categoryLabel.toLowerCase()}.`);

  return {
    title,
    category,
    subcategory,
    product_service: productService,
    symptoms: symptoms.length ? symptoms : [subcategory.replace(/_/g, " ")],
    location,
    service_provider: serviceProvider,
    summary,
    extracted_phone: phoneCand?.normalizedValue || null,
    extracted_customer_id: idCand?.normalizedValue || null,
  };
}

/**
 * Phase 4: Intelligent Repeated-Call Detection
 * Compares the current call's extracted issue against all prior issues for the same customer.
 * Distinguishes Repeat Customer Contact vs. Repeat Issue.
 */
export function compareWithPreviousIssues(params: {
  currentIssue: ExtractedCallIssue;
  currentCallDate: string;
  currentTranscriptText: string;
  priorIssues: Array<
    PriorIssueDigest & {
      summary_embedding?: number[] | null;
    }
  >;
  thresholds?: RepeatDetectionThresholds;
}): RepeatComparisonResult {
  const thresholds = params.thresholds || DEFAULT_REPEAT_THRESHOLDS;
  const { currentIssue, priorIssues, currentTranscriptText } = params;

  // If the customer has no prior issues at all, this is their first recorded interaction
  if (!priorIssues.length) {
    return {
      isRepeatCustomer: false,
      isRepeatIssue: false,
      matchClassification: "new_issue",
      matchedPreviousIssueId: null,
      matchedPreviousIssueCode: null,
      confidence: 0.98,
      reason: "First recorded call for this customer; created a new issue lifecycle.",
      attributeBreakdown: {
        categoryScore: 0,
        productScore: 0,
        semanticScore: 0,
        symptomOverlap: 0,
        timeProximityScore: 0,
      },
      needsReview: false,
    };
  }

  // The customer HAS prior issues -> Repeat Customer Contact is YES!
  const explicitRepeatPhrase =
    /\b(called\s*(?:yesterday|two\s*days\s*ago|three\s*days\s*ago|earlier|before|last\s*week)|still\s*not\s*(?:working|resolved|fixed)|technician\s*has\s*not\s*(?:visited|come|arrived)|follow(?:ing)?\s*up\s*on\s*my|same\s*(?:issue|problem)|bado\s*haijafanyiwa\s*kazi)\b/i.test(
      currentTranscriptText,
    );

  let bestCandidate: (typeof priorIssues)[number] | null = null;
  let bestScore = -1;
  let bestBreakdown = {
    categoryScore: 0,
    productScore: 0,
    semanticScore: 0,
    symptomOverlap: 0,
    timeProximityScore: 0,
  };

  const currentTs = new Date(params.currentCallDate).getTime() || Date.now();

  for (const prior of priorIssues) {
    const categoryMatch = prior.category === currentIssue.category;
    const categoryScore = categoryMatch ? 1.0 : 0.0;

    const productScore =
      prior.product_service &&
      currentIssue.product_service &&
      prior.product_service.toLowerCase() === currentIssue.product_service.toLowerCase()
        ? 1.0
        : categoryMatch && (!prior.product_service || !currentIssue.product_service)
          ? 0.5
          : categoryMatch
            ? 0.25
            : 0.0;

    // Semantic similarity: use embedding cosine similarity if both have vectors, else token Jaccard
    const priorText = `${prior.title} ${prior.category} ${prior.subcategory || ""} ${prior.summary} ${prior.symptoms.join(" ")}`;
    const currText = `${currentIssue.title} ${currentIssue.category} ${currentIssue.subcategory} ${currentIssue.summary} ${currentIssue.symptoms.join(" ")}`;

    let semanticScore = tokenJaccardSimilarity(priorText, currText);
    if (
      currentIssue.embedding?.length &&
      prior.summary_embedding?.length &&
      currentIssue.embedding.length === prior.summary_embedding.length
    ) {
      const cos = cosineSimilarity(currentIssue.embedding, prior.summary_embedding);
      // Normalize typical OpenAI embedding cosine range [0.35..0.90] to [0..1]
      const normalizedCos = Math.max(0, Math.min(1, (cos - 0.3) / 0.55));
      semanticScore = Math.max(semanticScore, normalizedCos);
    }

    // Symptom & subcategory overlap
    const priorSymText = `${prior.subcategory || ""} ${prior.symptoms.join(" ")}`;
    const currSymText = `${currentIssue.subcategory} ${currentIssue.symptoms.join(" ")}`;
    const symptomOverlap =
      prior.subcategory && prior.subcategory === currentIssue.subcategory
        ? 0.95
        : tokenJaccardSimilarity(priorSymText, currSymText);

    // Time proximity score
    const priorTs = new Date(prior.latest_reported_at).getTime() || currentTs;
    const daysDiff = Math.max(0, Math.abs(currentTs - priorTs) / (1000 * 3600 * 24));
    const timeProximityScore =
      daysDiff <= 7
        ? 1.0
        : daysDiff <= thresholds.activeWindowDays
          ? Math.max(0.4, 1 - daysDiff / (thresholds.activeWindowDays * 1.5))
          : 0.25;

    // Combined weighted score
    // Notice: if category is completely different (e.g. internet_connectivity vs billing_charging),
    // cap the score so a different issue is NEVER falsely marked as the same issue!
    let combined =
      categoryScore * 0.42 +
      productScore * 0.16 +
      Math.max(semanticScore, symptomOverlap) * 0.28 +
      timeProximityScore * 0.14;

    if (categoryMatch && explicitRepeatPhrase && daysDiff <= 21) {
      combined = Math.min(0.98, combined + 0.18);
    }

    if (!categoryMatch) {
      // Different primary category (e.g. Internet vs Billing) -> cannot be same_issue
      combined = Math.min(combined, 0.32);
    }

    if (combined > bestScore) {
      bestScore = combined;
      bestCandidate = prior;
      bestBreakdown = {
        categoryScore: Number(categoryScore.toFixed(2)),
        productScore: Number(productScore.toFixed(2)),
        semanticScore: Number(semanticScore.toFixed(2)),
        symptomOverlap: Number(symptomOverlap.toFixed(2)),
        timeProximityScore: Number(timeProximityScore.toFixed(2)),
      };
    }
  }

  if (!bestCandidate || bestScore < thresholds.needsReviewFloor) {
    const priorCategories = Array.from(
      new Set(priorIssues.map((p) => ISSUE_CATEGORY_LABELS[p.category] || p.category)),
    ).join(", ");
    return {
      isRepeatCustomer: true,
      isRepeatIssue: false,
      matchClassification: "new_issue",
      matchedPreviousIssueId: null,
      matchedPreviousIssueCode: null,
      confidence: Number(Math.max(0.85, 1 - Math.max(0, bestScore)).toFixed(2)),
      reason: `Repeat customer calling about a new, distinct issue (${ISSUE_CATEGORY_LABELS[currentIssue.category] || currentIssue.category}). Prior interaction history involved: ${priorCategories}.`,
      attributeBreakdown: bestBreakdown,
      needsReview: false,
    };
  }

  const confidence = Number(Math.min(0.99, Math.max(0.4, bestScore)).toFixed(2));

  if (bestScore >= thresholds.sameIssueThreshold) {
    const wasResolvedOrClosed =
      bestCandidate.status === "resolved" || bestCandidate.status === "closed";
    const classification: MatchClassification = wasResolvedOrClosed
      ? "reopened_issue"
      : "same_issue";

    return {
      isRepeatCustomer: true,
      isRepeatIssue: true,
      matchClassification: classification,
      matchedPreviousIssueId: bestCandidate.issue_id,
      matchedPreviousIssueCode: bestCandidate.issue_code,
      confidence,
      reason: wasResolvedOrClosed
        ? `Customer returned with the same ${ISSUE_CATEGORY_LABELS[currentIssue.category] || currentIssue.category} issue (${bestCandidate.issue_code}) after it was previously marked ${bestCandidate.status}. Classified as Reopened Issue.`
        : `Customer is contacting again regarding the same unresolved ${ISSUE_CATEGORY_LABELS[currentIssue.category] || currentIssue.category} issue (${bestCandidate.issue_code}, contact #${bestCandidate.total_calls + 1}).`,
      attributeBreakdown: bestBreakdown,
      needsReview: false,
    };
  }

  if (bestScore >= thresholds.relatedIssueThreshold) {
    return {
      isRepeatCustomer: true,
      isRepeatIssue: true,
      matchClassification: "related_issue",
      matchedPreviousIssueId: bestCandidate.issue_id,
      matchedPreviousIssueCode: bestCandidate.issue_code,
      confidence,
      reason: `Issue shares product/category context with prior issue ${bestCandidate.issue_code} (${bestCandidate.title}) with moderate similarity (${Math.round(confidence * 100)}%).`,
      attributeBreakdown: bestBreakdown,
      needsReview: confidence < 0.62,
    };
  }

  // Low/ambiguous confidence between needsReviewFloor and relatedIssueThreshold
  return {
    isRepeatCustomer: true,
    isRepeatIssue: false,
    matchClassification: "needs_review",
    matchedPreviousIssueId: bestCandidate.issue_id,
    matchedPreviousIssueCode: bestCandidate.issue_code,
    confidence,
    reason: `Ambiguous similarity (${Math.round(confidence * 100)}%) with prior issue ${bestCandidate.issue_code}; flagged as Needs Review instead of making an unsupported match.`,
    attributeBreakdown: bestBreakdown,
    needsReview: true,
  };
}

/**
 * Phase 5: Issue Lifecycle Management
 * Evaluates the issue status independently of whether the call itself was completed.
 */
export function evaluateIssueLifecycle(params: {
  matchClassification: MatchClassification;
  previousIssueStatus: IssueLifecycleStatus | null;
  utterances: CallTranscriptTurn[];
  interactionNumber: number;
  aiSuggestedStatus?: IssueLifecycleStatus | null;
  aiResolutionConfirmation?: ResolutionConfirmation | null;
  aiCallResolutionState?: LifecycleTransitionResult["callResolutionState"] | null;
  aiReason?: string | null;
}): LifecycleTransitionResult {
  const fullText = params.utterances.map((u) => u.text).join(" ");
  const customerText = params.utterances
    .filter((u) => u.role === "customer" || /customer|caller|client/i.test(u.speaker))
    .map((u) => u.text)
    .join(" ");
  const agentText = params.utterances
    .filter((u) => u.role === "agent" || /agent|support|rep/i.test(u.speaker))
    .map((u) => u.text)
    .join(" ");

  const prevStatus = params.previousIssueStatus;

  // Check if customer explicitly confirms the issue is resolved now
  const customerConfirmedFixed =
    /\b(it\s*is\s*working\s*now|internet\s*is\s*back|thank\s*you\s*it\s*works|problem\s*is\s*solved|received\s*the\s*reversal|balance\s*is\s*corrected|imekaa\s*sawa\s*sasa|inafanya\s*kazi\s*sasa)\b/i.test(
      customerText,
    ) &&
    !/\b(still\s*not\s*working|not\s*working|has\s*not\s*visited|not\s*resolved|bado)\b/i.test(
      customerText,
    );

  // Check if agent promises external/technician action or escalation
  const pendingTechnicianOrExternal =
    /\b(technician\s*will\s*(?:visit|come|call)|dispatch(?:ed|ing)?\s*(?:a\s*)?technician|field\s*team\s*will|wait\s*24\s*hours|within\s*(?:24|48)\s*hours|technician\s*has\s*not\s*yet\s*visited|technician\s*was\s*assigned)\b/i.test(
      fullText,
    );

  const escalatedMention =
    /\b(escalat(?:e|ed|ing)\s*(?:this|to)|technical\s*team|back\s*office|supervisor|level\s*2|priority\s*ticket|urgent\s*escalation)\b/i.test(
      fullText,
    );

  const customerSaysUnresolved =
    /\b(still\s*not\s*(?:working|resolved|fixed)|not\s*been\s*resolved|nobody\s*(?:came|called)|technician\s*(?:never|has\s*not)\s*(?:came|visited)|third\s*time\s*calling|called\s*two\s*days\s*ago)\b/i.test(
      fullText,
    );

  const agentReportsImmediateFix =
    /\b(i\s*have\s*(?:reset|activated|credited|refunded|unblocked|refreshed\s*your\s*line)|your\s*line\s*is\s*now\s*active|i\s*have\s*resolved)\b/i.test(
      agentText,
    ) && !pendingTechnicianOrExternal && !customerSaysUnresolved;

  // 1. Reopened check: If prior status was resolved/closed and customer is back with same issue
  if (
    params.matchClassification === "reopened_issue" ||
    ((prevStatus === "resolved" || prevStatus === "closed") &&
      params.matchClassification === "same_issue" &&
      !customerConfirmedFixed)
  ) {
    return {
      previousStatus: prevStatus,
      newStatus: "reopened",
      resolutionConfirmation: "unconfirmed",
      callResolutionState: pendingTechnicianOrExternal
        ? "pending_external_action"
        : escalatedMention
          ? "escalated"
          : "call_completed_issue_open",
      isReopened: true,
      reason:
        "Issue was previously marked resolved, but customer contacted again reporting the same problem persists or recurred. Automatically transitioned to Reopened.",
    };
  }

  // 2. Customer explicitly confirmed resolution during the call
  if (customerConfirmedFixed) {
    return {
      previousStatus: prevStatus,
      newStatus: "resolved",
      resolutionConfirmation: "customer_confirmed",
      callResolutionState: "customer_confirmed_resolved",
      isReopened: false,
      reason: "Customer explicitly confirmed during the call that the issue is now working/resolved.",
    };
  }

  // 3. Repeat call (3+ interactions) or explicit escalation -> Escalated
  if (
    (params.interactionNumber >= 3 && customerSaysUnresolved) ||
    (escalatedMention && params.interactionNumber >= 2)
  ) {
    return {
      previousStatus: prevStatus,
      newStatus: "escalated",
      resolutionConfirmation: "unconfirmed",
      callResolutionState: "escalated",
      isReopened: false,
      reason:
        params.interactionNumber >= 3
          ? `Issue remains unresolved after ${params.interactionNumber} customer contacts; escalated for urgent resolution.`
          : "Agent escalated the recurring issue to technical/back-office operations; resolution remains unconfirmed.",
    };
  }

  // 4. Technician visit or external action promised -> Pending External Action (NOT resolved!)
  if (pendingTechnicianOrExternal) {
    return {
      previousStatus: prevStatus,
      newStatus: "pending_external_action",
      resolutionConfirmation: "unconfirmed",
      callResolutionState: "pending_external_action",
      isReopened: false,
      reason:
        "Call completed, but resolution depends on a field technician visit or external team action. Marked Pending External Action (Resolution Unconfirmed).",
    };
  }

  // 5. Escalated on first call
  if (escalatedMention) {
    return {
      previousStatus: prevStatus,
      newStatus: params.interactionNumber > 1 ? "escalated" : "in_progress",
      resolutionConfirmation: "unconfirmed",
      callResolutionState: "escalated",
      isReopened: false,
      reason:
        "Agent escalated the issue to the technical/specialist team. Call completed while underlying issue remains in progress.",
    };
  }

  // 6. Agent performed immediate action on the call, but customer hasn't verified long-term fix
  if (agentReportsImmediateFix) {
    return {
      previousStatus: prevStatus,
      newStatus: "resolved",
      resolutionConfirmation: "agent_reported",
      callResolutionState: "agent_reported_resolved",
      isReopened: false,
      reason:
        "Agent reported completing the fix during the call (Agent-Reported Resolution; awaiting customer confirmation).",
    };
  }

  // 7. Respect AI suggestion if valid and consistent with rules
  if (params.aiSuggestedStatus) {
    return {
      previousStatus: prevStatus,
      newStatus: params.aiSuggestedStatus,
      resolutionConfirmation: params.aiResolutionConfirmation || "unconfirmed",
      callResolutionState:
        params.aiCallResolutionState || "call_completed_issue_open",
      isReopened: params.aiSuggestedStatus === "reopened",
      reason:
        params.aiReason ||
        `Issue status set to ${ISSUE_STATUS_LABELS[params.aiSuggestedStatus]} (${params.aiResolutionConfirmation || "unconfirmed"}).`,
    };
  }

  // Default for repeat vs first call
  const fallbackStatus: IssueLifecycleStatus =
    params.interactionNumber > 1 ? "in_progress" : "open";
  return {
    previousStatus: prevStatus,
    newStatus: fallbackStatus,
    resolutionConfirmation: "unconfirmed",
    callResolutionState: "call_completed_issue_open",
    isReopened: false,
    reason:
      params.interactionNumber > 1
        ? `Customer followed up (contact #${params.interactionNumber}); issue remains in progress with resolution unconfirmed.`
        : "Initial issue logged and open; resolution unconfirmed.",
  };
}

/**
 * Phase 6: Root Cause & Responsibility Intelligence Engine
 * Analyzes the entire issue history across all calls to classify the root cause,
 * responsibility, and evidence type without inventing facts.
 */
export function evaluateRootCauseIntelligence(params: {
  category: IssueCategory;
  utterances: CallTranscriptTurn[];
  priorCallSummaries: Array<{
    call_id?: string;
    date?: string;
    summary: string;
    agent_name?: string | null;
  }>;
  interactionNumber: number;
  qaScore?: number | null;
  qaComplianceFindings?: Array<{
    rule: string;
    passed: boolean;
    severity?: string;
    evidence_quote?: string;
  }> | null;
  aiRootCause?: JourneyAiAnalysisOutput["root_cause"] | null;
}): RootCauseEvaluationResult {
  const combinedHistoryText = [
    ...params.priorCallSummaries.map((c) => c.summary),
    ...params.utterances.map((u) => u.text),
  ].join(" ");

  const excerpts: TranscriptEvidenceExcerpt[] = [];
  for (const turn of params.utterances) {
    if (
      /\b(technician|not\s*visited|assigned|escalat|still\s*not\s*working|two\s*days|bill|overcharg|outage|red\s*light|wrong\s*information|nobody\s*called|bado|fundi)\b/i.test(
        turn.text,
      )
    ) {
      excerpts.push({
        speaker: turn.role || turn.speaker,
        quote: turn.text.slice(0, 260),
        relevance: "Key statement indicating operational/service failure or issue status",
      });
      if (excerpts.length >= 4) break;
    }
  }
  if (!excerpts.length && params.utterances.length) {
    excerpts.push({
      speaker: params.utterances[0].role || params.utterances[0].speaker,
      quote: params.utterances[0].text.slice(0, 260),
      relevance: "Initial customer statement on call",
    });
  }

  // 1. Check for Service Provider / Technician delay or failure (e.g. Phase 6 & TEST 5 scenario)
  const techDelayEvidence =
    /\b(technician\s*(?:has\s*not\s*(?:yet\s*)?visited|did\s*not\s*(?:come|visit|show)|was\s*assigned\s*but|delayed|never\s*arrived)|fundi\s*hajafika)\b/i.test(
      combinedHistoryText,
    );
  const techIncompleteEvidence =
    /\b(technician\s*came\s*but|repair\s*was\s*incomplete|stopped\s*working\s*again\s*after\s*technician)\b/i.test(
      combinedHistoryText,
    );

  if (techDelayEvidence || techIncompleteEvidence) {
    const hasOperationalFollowUpGap =
      params.interactionNumber >= 2 ||
      /\b(assigned\s*but\s*the\s*issue\s*has\s*not\s*been\s*resolved|no\s*follow[- ]?up|escalate\s*this)\b/i.test(
        combinedHistoryText,
      );

    return {
      primaryCategory: "service_provider_technician",
      primarySubcategory: techIncompleteEvidence
        ? "incomplete_repair"
        : "technician_delayed_service",
      secondaryCategory: hasOperationalFollowUpGap ? "operational_process" : null,
      secondarySubcategory: hasOperationalFollowUpGap ? "missing_follow_up" : null,
      evidenceType: "confirmed_evidence",
      confidence: 0.92,
      explanation: `Multiple interactions confirm that a field technician was promised/assigned, but the technician failed to visit or complete the repair on schedule${hasOperationalFollowUpGap ? ", compounded by missing operational follow-up." : "."}`,
      responsibleTeam: "Field Technician Dispatch & Service Partner Operations",
      recommendedAction:
        "Trigger SLA breach escalation to Field Dispatch Lead, assign priority technician visit window, and require operational follow-up call to confirm restoration.",
      transcriptExcerpts: params.aiRootCause?.transcript_excerpts?.length
        ? params.aiRootCause.transcript_excerpts
        : excerpts,
    };
  }

  // 2. Check for Agent-Related failure (incorrect info, failed to escalate, poor procedure)
  const agentFailedProcedure =
    /\b(previous\s*agent\s*(?:told\s*me\s*wrong|gave\s*wrong|did\s*not\s*log|never\s*created\s*a\s*ticket|hung\s*up)|no\s*ticket\s*was\s*logged|failed\s*to\s*escalate)\b/i.test(
      combinedHistoryText,
    ) ||
    (params.qaScore != null && params.qaScore < 55) ||
    Boolean(
      params.qaComplianceFindings?.some(
        (f) => !f.passed && f.severity === "high",
      ),
    );

  if (agentFailedProcedure) {
    return {
      primaryCategory: "agent_related",
      primarySubcategory: /\bno\s*ticket|never\s*created|failed\s*to\s*escalate\b/i.test(
        combinedHistoryText,
      )
        ? "failure_to_escalate"
        : "failure_to_follow_procedure",
      secondaryCategory:
        params.interactionNumber > 1 ? "operational_process" : null,
      secondarySubcategory:
        params.interactionNumber > 1 ? "missing_follow_up" : null,
      evidenceType:
        /\bno\s*ticket|previous\s*agent\b/i.test(combinedHistoryText)
          ? "confirmed_evidence"
          : "ai_inference",
      confidence: 0.85,
      explanation:
        "Call record or QA audit indicates agent procedure/escalation gap (e.g., prior contact was not properly ticketed/escalated or incorrect guidance was provided).",
      responsibleTeam: "Contact Center QA & Team Supervisor",
      recommendedAction:
        "Coach handling agent on escalation SOP, verify ticket logging compliance, and fast-track customer resolution.",
      transcriptExcerpts: params.aiRootCause?.transcript_excerpts?.length
        ? params.aiRootCause.transcript_excerpts
        : excerpts,
    };
  }

  // 3. Check for Operational / Process coordination delay
  if (
    /\b(ticket\s*is\s*still\s*pending\s*assignment|back\s*office\s*has\s*not\s*responded|waiting\s*for\s*approval|delayed\s*ticket\s*assignment|poor\s*coordination)\b/i.test(
      combinedHistoryText,
    )
  ) {
    return {
      primaryCategory: "operational_process",
      primarySubcategory: "delayed_ticket_assignment",
      secondaryCategory: null,
      secondarySubcategory: null,
      evidenceType: "confirmed_evidence",
      confidence: 0.86,
      explanation:
        "Transcript confirms internal ticket routing or back-office SLA delay prevented timely resolution.",
      responsibleTeam: "Back-Office Operations & SLA Management",
      recommendedAction:
        "Audit ticket queue handoff SLA between Tier-1 support and Back-Office fulfillment.",
      transcriptExcerpts: excerpts,
    };
  }

  // 4. Check for Network / Technical failure
  if (
    params.category === "internet_connectivity" ||
    params.category === "voice_network_coverage" ||
    params.category === "device_router_hardware"
  ) {
    const confirmedOutage =
      /\b(outage\s*in\s*your\s*area|fiber\s*cut|mast\s*is\s*down|network\s*maintenance|los\s*red\s*light|signal\s*loss)\b/i.test(
        combinedHistoryText,
      );
    if (confirmedOutage || params.interactionNumber >= 2) {
      return {
        primaryCategory: "network_technical",
        primarySubcategory: confirmedOutage
          ? "network_outage"
          : "repeated_technical_failure",
        secondaryCategory:
          params.interactionNumber >= 2 ? "operational_process" : null,
        secondarySubcategory:
          params.interactionNumber >= 2 ? "slow_internal_resolution" : null,
        evidenceType: confirmedOutage ? "confirmed_evidence" : "ai_inference",
        confidence: confirmedOutage ? 0.9 : 0.78,
        explanation: confirmedOutage
          ? "Transcript confirms a network/fiber infrastructure outage or signal loss affecting the customer's line."
          : "Customer experienced repeated connectivity/technical failure across contacts.",
        responsibleTeam: "Network Operations Center (NOC) & Engineering",
        recommendedAction:
          "Run line diagnostics on customer MSISDN/ONT port and link call to regional NOC outage ticket.",
        transcriptExcerpts: excerpts,
      };
    }
  }

  // 5. Check for Product / Service / Billing configuration problem
  if (
    params.category === "billing_charging" ||
    params.category === "package_subscription" ||
    params.category === "mobile_money"
  ) {
    const confirmedBilling =
      /\b(overcharged|duplicate\s*charge|wrong\s*bill|tariff\s*error|reversal\s*pending|system\s*deducted)\b/i.test(
        combinedHistoryText,
      );
    if (confirmedBilling) {
      return {
        primaryCategory: "product_service",
        primarySubcategory: "billing_configuration_problem",
        secondaryCategory: null,
        secondarySubcategory: null,
        evidenceType: "ai_inference",
        confidence: 0.8,
        explanation:
          "Customer reported a billing, charging, or wallet transaction discrepancy requiring billing/product reconciliation.",
        responsibleTeam: "Billing, Revenue Assurance & Mobile Money Ops",
        recommendedAction:
          "Reconcile ledger charges on customer account and issue automated SMS confirmation once adjusted.",
        transcriptExcerpts: excerpts,
      };
    }
  }

  // 6. Check for Customer-Related action required
  if (
    /\b(need\s*your\s*nida|bring\s*your\s*id|visit\s*our\s*shop|customer\s*was\s*unavailable|phone\s*was\s*switched\s*off\s*when\s*technician\s*called|wrong\s*apn\s*settings)\b/i.test(
      combinedHistoryText,
    )
  ) {
    return {
      primaryCategory: "customer_related",
      primarySubcategory: "customer_action_required",
      secondaryCategory: null,
      secondarySubcategory: null,
      evidenceType: "confirmed_evidence",
      confidence: 0.84,
      explanation:
        "Resolution requires customer-side action, verification document (e.g., KYC/NIDA), or availability.",
      responsibleTeam: "Customer / Frontline Verification",
      recommendedAction:
        "Send clear SMS checklist of required customer steps so customer does not need to call back repeatedly.",
      transcriptExcerpts: excerpts,
    };
  }

  // 7. If AI provided a high-confidence root cause backed by evidence, use it
  if (
    params.aiRootCause &&
    params.aiRootCause.primary_category !== "unknown_insufficient_evidence" &&
    params.aiRootCause.confidence >= 0.7
  ) {
    return {
      primaryCategory: params.aiRootCause.primary_category,
      primarySubcategory: params.aiRootCause.primary_subcategory || "general",
      secondaryCategory: params.aiRootCause.secondary_category,
      secondarySubcategory: params.aiRootCause.secondary_subcategory,
      evidenceType: params.aiRootCause.evidence_type,
      confidence: params.aiRootCause.confidence,
      explanation: params.aiRootCause.explanation,
      responsibleTeam: params.aiRootCause.responsible_team || "Operations",
      recommendedAction:
        params.aiRootCause.recommended_action ||
        "Review call transcript and follow up with customer.",
      transcriptExcerpts: params.aiRootCause.transcript_excerpts?.length
        ? params.aiRootCause.transcript_excerpts
        : excerpts,
    };
  }

  // 8. Default: Unknown / Insufficient Evidence (never fabricate root causes!)
  return {
    primaryCategory: "unknown_insufficient_evidence",
    primarySubcategory: "insufficient_evidence",
    secondaryCategory: null,
    secondarySubcategory: null,
    evidenceType: "insufficient_evidence",
    confidence: 0.45,
    explanation:
      "Insufficient evidence in the available transcript(s) to attribute root cause to a specific team or failure mode without speculation.",
    responsibleTeam: "Pending Investigation",
    recommendedAction:
      "Monitor for repeat contact or review linked ticket notes before assigning accountability.",
    transcriptExcerpts: excerpts,
  };
}

/**
 * Computes customer risk level based on unresolved issues, repeat calls, and reopened issues.
 */
export function computeCustomerRiskLevel(stats: {
  repeatCallCount: number;
  unresolvedIssueCount: number;
  reopenedIssueCount: number;
  escalatedIssueCount: number;
}): "low" | "medium" | "high" | "critical" {
  if (
    stats.repeatCallCount >= 3 ||
    stats.reopenedIssueCount >= 1 ||
    (stats.escalatedIssueCount >= 1 && stats.repeatCallCount >= 2)
  ) {
    return "critical";
  }
  if (
    stats.repeatCallCount >= 2 ||
    stats.unresolvedIssueCount >= 2 ||
    stats.escalatedIssueCount >= 1
  ) {
    return "high";
  }
  if (stats.repeatCallCount >= 1 || stats.unresolvedIssueCount >= 1) {
    return "medium";
  }
  return "low";
}

export {
  ISSUE_CATEGORY_LABELS,
  ISSUE_STATUS_LABELS,
  ROOT_CAUSE_LABELS,
  EVIDENCE_TYPE_LABELS,
  JOURNEY_MODEL_VERSION,
};

