export type DashboardLocale = "en" | "sw";

export const DEFAULT_TIMEZONE = "Africa/Dar_es_Salaam";
export const DEFAULT_CURRENCY = "TZS";

export type DashboardCopy = {
  nav: {
    groupOperations: string;
    groupQuality: string;
    groupAdmin: string;
    overview: string;
    calls: string;
    agents: string;
    teams: string;
    scorecards: string;
    compliance: string;
    coaching: string;
    reports: string;
    integrations: string;
    settings: string;
    admin: string;
  };
  topbar: {
    searchPlaceholder: string;
    searchShortcutHint: string;
    allTeams: string;
    allQueues: string;
    notificationsTitle: string;
    noNotifications: string;
    markAllRead: string;
    themeLight: string;
    themeDark: string;
    switchWorkspace: string;
    signOut: string;
  };
  overview: {
    breadcrumbSection: string;
    breadcrumbPage: string;
    title: string;
    description: string;
    primaryAction: string;
    newResultsChip: string;
    refreshChipAction: string;
    staleRefreshing: string;
    kpiCallsAnalyzed: string;
    kpiAvgScore: string;
    kpiComplianceRate: string;
    kpiCustomerSentiment: string;
    kpiNeedsReview: string;
    vsPriorPeriod: string;
    noPriorPeriod: string;
    trendTitle: string;
    trendSubtitle: string;
    targetLabel: string;
    noTargetConfigured: string;
    failureReasonsTitle: string;
    failureReasonsSubtitle: string;
    leaderboardTitle: string;
    leaderboardSubtitle: string;
    sentimentTitle: string;
    sentimentSubtitle: string;
    flaggedTableTitle: string;
    flaggedTableSubtitle: string;
    selectedCountSuffix: string;
    bulkApprove: string;
    bulkNeedsCoaching: string;
    bulkEscalate: string;
    columnsToggle: string;
    densityCompact: string;
    densityComfortable: string;
  };
  filters: {
    preset7d: string;
    preset30d: string;
    preset90d: string;
    allChannels: string;
    allAgents: string;
    needsReviewOnly: string;
    flaggedOnly: string;
    clearFilters: string;
    searchCallsPlaceholder: string;
  };
  states: {
    firstRunTitle: string;
    firstRunBody: string;
    firstRunPrimary: string;
    firstRunSecondary: string;
    filteredEmptyTitle: string;
    filteredEmptyBody: string;
    errorTitle: string;
    retry: string;
    requestIdLabel: string;
    forbiddenTitle: string;
    forbiddenBody: string;
  };
  drawer: {
    titlePrefix: string;
    summaryTab: string;
    transcriptTab: string;
    scorecardTab: string;
    coachingTab: string;
    audioRecording: string;
    audioExpired: string;
    refreshAudio: string;
    noAudioAvailable: string;
    noTranscript: string;
    aiHighlightedMoments: string;
    complianceChecks: string;
    assignCoachingTitle: string;
    coachingTitleLabel: string;
    coachingCriterionLabel: string;
    coachingPriorityLabel: string;
    coachingNotesLabel: string;
    coachingSubmit: string;
    coachingSubmitting: string;
    coachingSuccess: string;
    openFullAudit: string;
  };
};

const EN_COPY: DashboardCopy = {
  nav: {
    groupOperations: "Operations",
    groupQuality: "Quality & Compliance",
    groupAdmin: "Workspace",
    overview: "Overview",
    calls: "Calls",
    agents: "Agents",
    teams: "Teams",
    scorecards: "QA Scorecards",
    compliance: "Compliance",
    coaching: "Coaching",
    reports: "Reports",
    integrations: "Integrations",
    settings: "Settings",
    admin: "Platform Admin",
  },
  topbar: {
    searchPlaceholder: "Search calls, agents, compliance…",
    searchShortcutHint: "⌘K",
    allTeams: "All teams",
    allQueues: "All queues",
    notificationsTitle: "Alerts & review queue",
    noNotifications: "No new workspace alerts.",
    markAllRead: "Mark all read",
    themeLight: "Switch to light mode",
    themeDark: "Switch to navy dark mode",
    switchWorkspace: "Workspace",
    signOut: "Sign out",
  },
  overview: {
    breadcrumbSection: "Operations",
    breadcrumbPage: "Overview",
    title: "Quality Assurance Overview",
    description: "Real-time AI evaluation coverage, compliance posture, and agent coaching queue.",
    primaryAction: "Upload & score calls",
    newResultsChip: "New results available",
    refreshChipAction: "Refresh view",
    staleRefreshing: "Showing cached snapshot while refreshing…",
    kpiCallsAnalyzed: "Calls Analyzed",
    kpiAvgScore: "Average QA Score",
    kpiComplianceRate: "Compliance Rate",
    kpiCustomerSentiment: "Positive Sentiment",
    kpiNeedsReview: "Calls Needing Review",
    vsPriorPeriod: "vs previous period",
    noPriorPeriod: "No prior period data",
    trendTitle: "QA Score Trend",
    trendSubtitle: "Daily audited score average against organization target",
    targetLabel: "Org target",
    noTargetConfigured: "No target set",
    failureReasonsTitle: "Top Failure Reasons",
    failureReasonsSubtitle: "Most frequent rubric & compliance gaps in period",
    leaderboardTitle: "Agent Leaderboard",
    leaderboardSubtitle: "Scored performance and compliance by agent",
    sentimentTitle: "Sentiment Breakdown",
    sentimentSubtitle: "Audited call sentiment by channel or queue",
    flaggedTableTitle: "Flagged & Recent Calls",
    flaggedTableSubtitle: "Click any call to inspect transcript, audio, and assign coaching",
    selectedCountSuffix: "selected",
    bulkApprove: "Approve review",
    bulkNeedsCoaching: "Flag for coaching",
    bulkEscalate: "Escalate",
    columnsToggle: "Columns",
    densityCompact: "Compact",
    densityComfortable: "Comfortable",
  },
  filters: {
    preset7d: "7D",
    preset30d: "30D",
    preset90d: "90D",
    allChannels: "All channels",
    allAgents: "All agents",
    needsReviewOnly: "Needs review",
    flaggedOnly: "Compliance flagged",
    clearFilters: "Clear filters",
    searchCallsPlaceholder: "Filter table by agent, call title, or transcript…",
  },
  states: {
    firstRunTitle: "Connect calls to activate QA intelligence",
    firstRunBody:
      "Your organization has not uploaded or synced any recordings yet. Connect your telephony source or upload initial calls to generate real QA scores and compliance insights.",
    firstRunPrimary: "Upload your first calls",
    firstRunSecondary: "Connect call source",
    filteredEmptyTitle: "No results for these filters",
    filteredEmptyBody: "Adjust your date range, team, queue, channel, or search query to inspect matching calls.",
    errorTitle: "Could not load workspace data",
    retry: "Retry request",
    requestIdLabel: "Request ID",
    forbiddenTitle: "Permission denied (403)",
    forbiddenBody: "Your current workspace role does not include access to perform or view this resource.",
  },
  drawer: {
    titlePrefix: "Call QA Inspection",
    summaryTab: "Overview",
    transcriptTab: "Transcript",
    scorecardTab: "Scorecard",
    coachingTab: "Coaching",
    audioRecording: "Call recording",
    audioExpired: "Signed audio link expired.",
    refreshAudio: "Refresh link",
    noAudioAvailable: "No audio recording attached to this call.",
    noTranscript: "No transcript utterances stored for this call yet.",
    aiHighlightedMoments: "AI-Highlighted Moments",
    complianceChecks: "Compliance Findings",
    assignCoachingTitle: "Assign Coaching Task",
    coachingTitleLabel: "Coaching focus",
    coachingCriterionLabel: "Related criterion",
    coachingPriorityLabel: "Priority",
    coachingNotesLabel: "Instructions for agent",
    coachingSubmit: "Assign coaching",
    coachingSubmitting: "Assigning…",
    coachingSuccess: "Coaching task assigned.",
    openFullAudit: "Open full scorecard",
  },
};

const SW_COPY: DashboardCopy = {
  nav: {
    groupOperations: "Uendeshaji",
    groupQuality: "Ubora na Uzingatiaji",
    groupAdmin: "Kituo cha Kazi",
    overview: "Muhtasari",
    calls: "Simu",
    agents: "Mawakala",
    teams: "Timu",
    scorecards: "Kadi za Alama",
    compliance: "Uzingatiaji",
    coaching: "Mafunzo",
    reports: "Ripoti",
    integrations: "Miunganisho",
    settings: "Mipangilio",
    admin: "Usimamizi Mkuu",
  },
  topbar: {
    searchPlaceholder: "Tafuta simu, mawakala, uzingatiaji…",
    searchShortcutHint: "⌘K",
    allTeams: "Timu zote",
    allQueues: "Foleni zote",
    notificationsTitle: "Arifa na ukaguzi",
    noNotifications: "Hakuna arifa mpya.",
    markAllRead: "Weka zote zimesomwa",
    themeLight: "Tumia mwonekano mwangaza",
    themeDark: "Tumia mwonekano wa giza",
    switchWorkspace: "Shirika",
    signOut: "Ondoka",
  },
  overview: {
    breadcrumbSection: "Uendeshaji",
    breadcrumbPage: "Muhtasari",
    title: "Muhtasari wa Ubora wa Simu",
    description: "Ufuatiliaji wa ukaguzi wa AI, uzingatiaji wa kanuni, na foleni ya mafunzo.",
    primaryAction: "Pakia na ukague simu",
    newResultsChip: "Matokeo mapya yanapatikana",
    refreshChipAction: "Onyesha upya",
    staleRefreshing: "Inaonyesha nakala ya awali wakati inasasisha…",
    kpiCallsAnalyzed: "Simu Zilizokaguliwa",
    kpiAvgScore: "Wastani wa Alama ya QA",
    kpiComplianceRate: "Kiwango cha Uzingatiaji",
    kpiCustomerSentiment: "Hisia Chanya za Wateja",
    kpiNeedsReview: "Zinazohitaji Mapitio",
    vsPriorPeriod: "dhidi ya kipindi kilichopita",
    noPriorPeriod: "Hakuna data ya kipindi kilichopita",
    trendTitle: "Mwenendo wa Alama ya QA",
    trendSubtitle: "Wastani wa alama za kila siku dhidi ya lengo la shirika",
    targetLabel: "Lengo la shirika",
    noTargetConfigured: "Hakuna lengo",
    failureReasonsTitle: "Sababu Kuu za Kushindwa",
    failureReasonsSubtitle: "Mapungufu ya mara kwa mara ya kanuni na vigezo",
    leaderboardTitle: "Orodha ya Mawakala",
    leaderboardSubtitle: "Utendaji na uzingatiaji wa kila wakala",
    sentimentTitle: "Mgawanyo wa Hisia",
    sentimentSubtitle: "Hisia za wateja kwa njia ya mawasiliano au foleni",
    flaggedTableTitle: "Simu Zenye Tahadhari na za Hivi Karibuni",
    flaggedTableSubtitle: "Bofya simu kuona nakala, sauti, na kupanga mafunzo",
    selectedCountSuffix: "zimechaguliwa",
    bulkApprove: "Idhinisha mapitio",
    bulkNeedsCoaching: "Weka kwa mafunzo",
    bulkEscalate: "Pandisha ngazi",
    columnsToggle: "Safu wima",
    densityCompact: "Ndogo",
    densityComfortable: "Kawaida",
  },
  filters: {
    preset7d: "Siku 7",
    preset30d: "Siku 30",
    preset90d: "Siku 90",
    allChannels: "Njia zote",
    allAgents: "Mawakala wote",
    needsReviewOnly: "Zinahitaji mapitio",
    flaggedOnly: "Zenye tahadhari",
    clearFilters: "Ondoa vichujio",
    searchCallsPlaceholder: "Chuja kwa wakala, jina la simu, au nakala…",
  },
  states: {
    firstRunTitle: "Unganisha simu kuanza ukaguzi wa ubora",
    firstRunBody:
      "Shirika lako halijapakia rekodi za simu bado. Unganisha mfumo wa simu au pakia rekodi zako za kwanza kuona alama halisi.",
    firstRunPrimary: "Pakia simu za kwanza",
    firstRunSecondary: "Unganisha chanzo cha simu",
    filteredEmptyTitle: "Hakuna matokeo kwa vichujio hivi",
    filteredEmptyBody: "Badilisha tarehe, timu, foleni, au maneno ya utafutaji.",
    errorTitle: "Imeshindwa kupakia data",
    retry: "Jaribu tena",
    requestIdLabel: "Kitambulisho cha ombi",
    forbiddenTitle: "Ruhusa imekataliwa (403)",
    forbiddenBody: "Wajibu wako hauruhusu kufikia au kubadilisha sehemu hii.",
  },
  drawer: {
    titlePrefix: "Ukaguzi wa Simu",
    summaryTab: "Muhtasari",
    transcriptTab: "Nakala",
    scorecardTab: "Alama",
    coachingTab: "Mafunzo",
    audioRecording: "Rekodi ya sauti",
    audioExpired: "Kiungo cha sauti kimeisha muda.",
    refreshAudio: "Sasisha kiungo",
    noAudioAvailable: "Hakuna rekodi ya sauti kwa simu hii.",
    noTranscript: "Hakuna nakala iliyohifadhiwa kwa simu hii bado.",
    aiHighlightedMoments: "Matukio Muhimu ya AI",
    complianceChecks: "Matokeo ya Uzingatiaji",
    assignCoachingTitle: "Panga Mafunzo kwa Wakala",
    coachingTitleLabel: "Kipaumbele cha mafunzo",
    coachingCriterionLabel: "Kigezo husika",
    coachingPriorityLabel: "Umuhimu",
    coachingNotesLabel: "Maelekezo kwa wakala",
    coachingSubmit: "Panga mafunzo",
    coachingSubmitting: "Inatuma…",
    coachingSuccess: "Mafunzo yamepangwa.",
    openFullAudit: "Fungua ripoti kamili",
  },
};

export function getDashboardCopy(locale: DashboardLocale): DashboardCopy {
  return locale === "sw" ? SW_COPY : EN_COPY;
}

function intlLocale(locale: DashboardLocale) {
  return locale === "sw" ? "sw-TZ" : "en-TZ";
}

export function formatNumberLocale(value: number | null | undefined, locale: DashboardLocale): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatPercentLocale(
  value: number | null | undefined,
  locale: DashboardLocale,
  decimals = 0,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function formatTzsLocale(amount: number | null | undefined, locale: DashboardLocale): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTimeInTz(
  iso: string | null | undefined,
  timezone = DEFAULT_TIMEZONE,
  locale: DashboardLocale = "en",
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-TZ", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: DEFAULT_TIMEZONE,
    }).format(date);
  }
}

export function formatShortDateInTz(
  iso: string | null | undefined,
  timezone = DEFAULT_TIMEZONE,
  locale: DashboardLocale = "en",
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), {
      month: "short",
      day: "numeric",
      timeZone: timezone || DEFAULT_TIMEZONE,
    }).format(date);
  } catch {
    return iso.slice(0, 10);
  }
}

