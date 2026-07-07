export type EvidenceId =
  | "commercialOperatingSystem"
  | "executiveDecisionSupport"
  | "aiAssistedWorkflows"
  | "icpPipelineRedesign"
  | "rifRetentionPromotion"
  | "jjForecastingBackorders"
  | "healthcareLifeSciencesBridge"

export type EvidenceItem = {
  id: EvidenceId
  label: string
  usableClaim: string
  supportingDetails: string[]
  allowedAngles: string[]
  avoidClaims: string[]
}

export const EVIDENCE: Record<EvidenceId, EvidenceItem> = {
  commercialOperatingSystem: {
    id: "commercialOperatingSystem",
    label: "Commercial operating system",
    usableClaim:
      "At Akadeum, Sam built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution.",
    supportingDetails: [
      "Connected NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on.",
      "Supported forecasting, pipeline strategy, executive reporting, and commercial operating cadence.",
      "Helped leadership see pipeline quality, forecast movement, customer behavior, and commercial execution more clearly.",
    ],
    allowedAngles: ["chief_of_staff", "strategic_operations", "commercial_strategy", "gtm_strategy", "revenue_intelligence"],
    avoidClaims: [
      "Do not say Sam owned CEO-level decision rights.",
      "Do not say Sam led clinical operations, payer operations, or Medicare Advantage operations.",
      "Do not say Sam presented to the board.",
    ],
  },
  executiveDecisionSupport: {
    id: "executiveDecisionSupport",
    label: "Executive decision support",
    usableClaim:
      "Sam partnered closely with the CEO, COO, CFO, VP Sales & Marketing, and commercial leadership on forecasting, pipeline strategy, executive reporting, and board/investor reporting preparation.",
    supportingDetails: [
      "Prepared the numbers, dashboards, analysis, and narratives leadership used across approximately ten board and investor reporting cycles.",
      "Translated fragmented commercial data and ambiguous market signals into clearer operating decisions.",
      "Worked as a trusted operating partner to leadership without claiming formal CEO-proxy authority.",
    ],
    allowedAngles: ["chief_of_staff", "strategic_operations", "executive_operations", "commercial_strategy"],
    avoidClaims: [
      "Do not say Sam attended board meetings.",
      "Do not say Sam led board meetings or investor meetings.",
      "Do not say Sam was a CEO proxy, trusted proxy, or strategic proxy.",
    ],
  },
  aiAssistedWorkflows: {
    id: "aiAssistedWorkflows",
    label: "AI-assisted workflows",
    usableClaim:
      "Sam built AI-assisted lead routing and sales dossier workflows that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours.",
    supportingDetails: [
      "Used AI as a practical operating lever, not as a separate identity or engineering specialty.",
      "Reduced manual drag and made commercial teams faster and more focused.",
      "Useful proof for roles that value AI-enabled execution, workflow design, or operational leverage.",
    ],
    allowedAngles: ["ai_operations", "strategic_operations", "gtm_strategy", "chief_of_staff", "commercial_operations"],
    avoidClaims: [
      "Do not over-position Sam as an AI engineer.",
      "Do not claim Sam built enterprise-grade AI infrastructure.",
    ],
  },
  icpPipelineRedesign: {
    id: "icpPipelineRedesign",
    label: "ICP and pipeline redesign",
    usableClaim:
      "Sam redesigned the Ideal Customer Profile around cell therapy and adjacent markets, improving MQL-to-SQL conversion from 11% to 20% and SQL-to-Opportunity conversion from 26% to 43%.",
    supportingDetails: [
      "Useful proof for prioritization, commercial strategy, GTM strategy, and pipeline-quality work.",
      "Shows ability to turn messy market signals into a sharper operating model for sales and marketing.",
      "Should not be used as proof of formal sales management.",
    ],
    allowedAngles: ["commercial_strategy", "gtm_strategy", "revenue_intelligence", "strategic_operations"],
    avoidClaims: [
      "Do not say Sam formally managed salespeople.",
      "Do not imply Sam owned the full sales organization.",
    ],
  },
  rifRetentionPromotion: {
    id: "rifRetentionPromotion",
    label: "Retained and promoted after first RIF",
    usableClaim:
      "Sam was retained after Akadeum's October 2024 commercial RIF, expanded scope, and was promoted to Commercial Strategy & Operations Lead in January 2025.",
    supportingDetails: [
      "Useful in interviews as proof of executive trust and operating judgment under pressure.",
      "Usually not needed in cover letters unless the role explicitly emphasizes volatility or turnaround conditions.",
      "A separate May 2026 RIF later ended Sam's time at Akadeum.",
    ],
    allowedAngles: ["strategic_operations", "chief_of_staff", "turnaround", "startup_operations"],
    avoidClaims: [
      "Do not say Sam was retained or promoted through two RIFs.",
      "Do not overuse RIF language in cover letters.",
    ],
  },
  jjForecastingBackorders: {
    id: "jjForecastingBackorders",
    label: "J&J / DePuy forecasting",
    usableClaim:
      "At DePuy Synthes / Johnson & Johnson, Sam built forecasting work that reduced backorders by 8% and supported Power BI adoption across multiple business units.",
    supportingDetails: [
      "Useful proof for healthcare, supply chain, forecasting, and operational analytics roles.",
      "Secondary proof point, not usually the main cover-letter spine.",
    ],
    allowedAngles: ["healthcare_operations", "analytics", "forecasting", "strategic_operations"],
    avoidClaims: [
      "Do not overstate this as executive-level ownership.",
    ],
  },
  healthcareLifeSciencesBridge: {
    id: "healthcareLifeSciencesBridge",
    label: "Healthcare and life sciences bridge",
    usableClaim:
      "Sam has worked across healthcare, life sciences, and complex technical markets, including Akadeum, DePuy Synthes / Johnson & Johnson, Stryker, and Spectrum Health.",
    supportingDetails: [
      "Useful to bridge into healthcare-adjacent or regulated markets.",
      "For Medicare Advantage, be honest: Sam has healthcare and life sciences exposure, not direct payer or Medicare Advantage experience.",
    ],
    allowedAngles: ["healthcare", "life_sciences", "regulated_markets", "domain_bridge"],
    avoidClaims: [
      "Do not claim direct Medicare Advantage experience.",
      "Do not claim payer operations experience.",
      "Do not claim clinical operations leadership.",
    ],
  },
}

export const DEFAULT_PRIMARY_EVIDENCE: EvidenceId = "commercialOperatingSystem"
export const DEFAULT_SUPPORTING_EVIDENCE: EvidenceId = "aiAssistedWorkflows"

export function isEvidenceId(value: unknown): value is EvidenceId {
  return typeof value === "string" && value in EVIDENCE
}

export function getEvidence(ids: EvidenceId[]): EvidenceItem[] {
  return ids.map(id => EVIDENCE[id])
}
