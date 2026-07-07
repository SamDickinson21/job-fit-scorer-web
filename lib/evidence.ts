export type EvidenceId =
  | "commercialOperatingSystem"
  | "executiveDecisionSupport"
  | "aiAssistedWorkflows"
  | "icpPipelineRedesign"
  | "rifRetentionPromotion"
  | "jjForecastingBackorders"
  | "healthcarePayerBridge"
  | "lifeSciencesClinicalDevelopmentBridge"
  | "revOpsSalesforceDealDeskBridge"
  | "authorityStretchBridge"
  | "pharmaSalesOpsAnalyticsBridge"
  | "enterpriseAiDeliveryBridge"

export type EvidenceItem = {
  id: EvidenceId
  label: string
  usableClaim: string
  letterParagraph: string
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
    letterParagraph:
      "At Akadeum Life Sciences, I built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution. I connected NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on to understand pipeline quality, forecast movement, customer behavior, and commercial execution.",
    supportingDetails: [
      "Connected NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on.",
      "Supported forecasting, pipeline strategy, executive reporting, and commercial operating cadence.",
      "Helped leadership see pipeline quality, forecast movement, customer behavior, and commercial execution more clearly.",
    ],
    allowedAngles: ["chief_of_staff", "strategic_operations", "commercial_strategy", "gtm_strategy", "revenue_intelligence", "revenue_operations"],
    avoidClaims: [
      "Do not say Sam owned CEO-level decision rights.",
      "Do not say Sam led clinical operations, payer operations, or Medicare Advantage operations.",
      "Do not say Sam presented to the board.",
      "Do not say Sam owned Salesforce architecture.",
    ],
  },
  executiveDecisionSupport: {
    id: "executiveDecisionSupport",
    label: "Executive decision support",
    usableClaim:
      "Sam partnered closely with the CEO, COO, CFO, VP Sales & Marketing, and commercial leadership on forecasting, pipeline strategy, executive reporting, and board/investor reporting preparation.",
    letterParagraph:
      "That system was not reporting for its own sake. I partnered closely with the CEO, COO, CFO, VP Sales & Marketing, and commercial leadership to turn fragmented systems and ambiguous market signals into clearer operating decisions. I also prepared the numbers, dashboards, analysis, and narratives leadership used in board and investor conversations, translating complex pipeline and forecasting data into material they could act on.",
    supportingDetails: [
      "Prepared the numbers, dashboards, analysis, and narratives leadership used across approximately ten board and investor reporting cycles.",
      "Translated fragmented commercial data and ambiguous market signals into clearer operating decisions.",
      "Worked as a trusted operating partner to leadership without claiming formal CEO-proxy authority.",
    ],
    allowedAngles: ["chief_of_staff", "strategic_operations", "executive_operations", "commercial_strategy", "revenue_operations"],
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
    letterParagraph:
      "I also built AI-assisted lead routing and sales dossier workflows that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours. I do not see AI as a separate lane. I see it as a practical way to reduce manual drag, sharpen prioritization, and help teams move faster on the work that matters.",
    supportingDetails: [
      "Used AI as a practical operating tool, not as a separate identity or engineering specialty.",
      "Reduced manual drag and made commercial teams faster and more focused.",
      "Useful proof for roles that value AI-enabled execution, workflow design, or operating leverage.",
    ],
    allowedAngles: ["ai_operations", "strategic_operations", "gtm_strategy", "chief_of_staff", "commercial_operations", "revenue_operations"],
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
    letterParagraph:
      "A second example is the ICP and pipeline work I led at Akadeum. I redesigned the Ideal Customer Profile around cell therapy and adjacent markets, improving MQL-to-SQL conversion from 11% to 20% and SQL-to-Opportunity conversion from 26% to 43%. That work required turning messy market signals into a sharper operating model for where the commercial team should focus.",
    supportingDetails: [
      "Useful proof for prioritization, commercial strategy, GTM strategy, and pipeline-quality work.",
      "Shows ability to turn messy market signals into a sharper operating model for sales and marketing.",
      "Should not be used as proof of formal sales management.",
    ],
    allowedAngles: ["commercial_strategy", "gtm_strategy", "revenue_intelligence", "strategic_operations", "revenue_operations"],
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
    letterParagraph:
      "During a volatile period at Akadeum, I was retained after the October 2024 commercial RIF, expanded scope, and was promoted to Commercial Strategy & Operations Lead in January 2025. I would use this story selectively because it is most useful when a role emphasizes volatility, ambiguity, or operating judgment under pressure.",
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
    letterParagraph:
      "Earlier in my career at DePuy Synthes / Johnson & Johnson, I built forecasting work that reduced backorders by 8% and supported Power BI adoption across multiple business units. I would use this as secondary evidence for roles where forecasting, healthcare operations, or operational analytics matter.",
    supportingDetails: [
      "Useful proof for healthcare, supply chain, forecasting, and operational analytics roles.",
      "Secondary proof point, not usually the main cover-letter spine.",
    ],
    allowedAngles: ["healthcare_operations", "analytics", "forecasting", "strategic_operations"],
    avoidClaims: ["Do not overstate this as executive-level ownership."],
  },
  healthcarePayerBridge: {
    id: "healthcarePayerBridge",
    label: "Healthcare payer bridge",
    usableClaim:
      "Sam has healthcare and life sciences exposure, but not direct Medicare Advantage or payer operations experience.",
    letterParagraph:
      "I have not worked directly in Medicare Advantage or payer operations, but I have worked across healthcare, life sciences, and complex technical markets, including Akadeum, DePuy Synthes / Johnson & Johnson, Stryker, and Spectrum Health. I am comfortable learning high-context environments quickly, especially when the work depends on systems thinking, clear communication, and disciplined execution.",
    supportingDetails: [
      "Use only when the role is explicitly Medicare Advantage, payer, health insurance, or member-health oriented.",
      "This is not appropriate for life sciences SaaS or clinical development finance infrastructure unless payer/insurance is explicit.",
    ],
    allowedAngles: ["healthcare", "payer", "regulated_markets", "domain_bridge"],
    avoidClaims: [
      "Do not claim direct Medicare Advantage experience.",
      "Do not claim payer operations experience.",
      "Do not claim clinical operations leadership.",
    ],
  },
  lifeSciencesClinicalDevelopmentBridge: {
    id: "lifeSciencesClinicalDevelopmentBridge",
    label: "Life sciences / clinical development bridge",
    usableClaim:
      "Sam has worked in life sciences and healthcare-adjacent environments, including Akadeum, DePuy Synthes / Johnson & Johnson, Stryker, and Spectrum Health.",
    letterParagraph:
      "Condor's life sciences focus is close to the markets I have worked in, even though I have not owned clinical development finance infrastructure directly. My experience is strongest where commercial systems, technical markets, and leadership reporting need to come together into a clearer operating model.",
    supportingDetails: [
      "Use for life sciences, biopharma, clinical development, medical device, pharma, or healthcare technology roles.",
      "Do not use Medicare Advantage language unless payer/insurance is explicit.",
    ],
    allowedAngles: ["life_sciences", "clinical_development", "healthcare_technology", "domain_bridge"],
    avoidClaims: [
      "Do not claim direct clinical trial finance ownership.",
      "Do not claim payer operations experience.",
    ],
  },
  revOpsSalesforceDealDeskBridge: {
    id: "revOpsSalesforceDealDeskBridge",
    label: "RevOps / Salesforce / deal desk bridge",
    usableClaim:
      "Sam has built commercial systems and revenue visibility, but has not owned Salesforce architecture or a formal deal desk end to end.",
    letterParagraph:
      "I have not owned Salesforce architecture or a formal deal desk end to end, so I would not position myself as a traditional Salesforce-first RevOps admin. My strength is building the commercial systems, reporting infrastructure, and operating cadences that connect field activity to leadership visibility. For a first RevOps hire, that distinction matters: the work has to make Sales, Marketing, and Finance operate from the same truth, not just produce cleaner reports.",
    supportingDetails: [
      "Use when Salesforce architecture, deal desk, quote-to-close, commissions, or SaaS RevOps are central requirements.",
      "This bridge should be honest and may make the letter more selective rather than aggressive.",
    ],
    allowedAngles: ["revenue_operations", "revops", "sales_operations", "commercial_systems"],
    avoidClaims: [
      "Do not claim Salesforce architecture ownership.",
      "Do not claim direct deal desk ownership.",
      "Do not claim commission validation ownership.",
    ],
  },

  pharmaSalesOpsAnalyticsBridge: {
    id: "pharmaSalesOpsAnalyticsBridge",
    label: "Pharma sales ops / analytics bridge",
    usableClaim:
      "Sam has built commercial systems and revenue visibility in life sciences, but has not directly owned pharma field sales operations mechanics such as incentive compensation, territory/roster management, or oncology launch.",
    letterParagraph:
      "I have not directly owned pharma field sales operations mechanics such as incentive compensation, territory/roster management, or oncology launch planning. The bridge is the commercial operating work I have done: building the systems, reporting cadence, and decision infrastructure that helped Sales, Marketing, Finance, and leadership operate from a clearer view of pipeline quality, forecast movement, customer behavior, and commercial execution.",
    supportingDetails: [
      "Use for biotech/pharma sales operations, commercial analytics, field enablement, QBR, incentive compensation, territory/roster, and oncology-launch-adjacent roles.",
      "This bridge should be honest and should not claim direct pharma sales operations ownership.",
    ],
    allowedAngles: ["pharma_sales_ops_analytics", "sales_operations", "commercial_analytics", "field_enablement", "life_sciences"],
    avoidClaims: [
      "Do not claim incentive compensation ownership.",
      "Do not claim territory or roster management ownership.",
      "Do not claim oncology launch experience.",
      "Do not claim formal pharma field sales operations ownership.",
    ],
  },
  enterpriseAiDeliveryBridge: {
    id: "enterpriseAiDeliveryBridge",
    label: "Enterprise AI delivery bridge",
    usableClaim:
      "Sam has built practical AI-assisted commercial workflows, but is not an enterprise AI/data science, ML production, or AI governance leader.",
    letterParagraph:
      "I would not position myself as an enterprise AI/data science leader or ML production owner. My AI experience is practical and operational: I built AI-assisted commercial workflows that reduced manual drag, improved prioritization, and helped the team move faster. That is most useful where the challenge is adoption, workflow design, and business translation rather than pure model development or enterprise AI governance.",
    supportingDetails: [
      "Use for roles centered on enterprise AI adoption, AI governance, production analytics, or technical AI delivery where Sam is a partial fit only.",
      "This should usually lower application priority unless the role clearly values operational adoption over technical AI ownership.",
    ],
    allowedAngles: ["ai_operations", "technical_operations", "business_translation", "workflow_automation"],
    avoidClaims: [
      "Do not claim ML engineering experience.",
      "Do not claim enterprise AI governance ownership.",
      "Do not claim production AI platform ownership.",
      "Do not claim formal data science team management.",
    ],
  },
  authorityStretchBridge: {
    id: "authorityStretchBridge",
    label: "Formal authority stretch bridge",
    usableClaim:
      "Sam has operated as a trusted executive-facing operator, but has not held a formal EVP, Deputy COO, or company-wide operating authority seat.",
    letterParagraph:
      "I have not held a formal EVP or Deputy COO title, so I would be direct that this is a step up in formal authority. The bridge is the work itself: building operating systems leadership relied on, preparing decision-ready materials, and creating the visibility and cadence that made accountability easier across the commercial organization.",
    supportingDetails: [
      "Use when the JD requires formal operating authority, leader accountability, Deputy COO, EVP, VP Operations, or company-wide operations ownership.",
      "Do not use for normal strategic operations roles where it would over-emphasize a gap.",
    ],
    allowedAngles: ["evp_operations", "deputy_coo", "authority_bridge", "strategic_operations"],
    avoidClaims: [
      "Do not claim formal operating authority over department leaders.",
      "Do not claim Sam covered the COO seat.",
    ],
  },
}

export const DEFAULT_PRIMARY_EVIDENCE: EvidenceId = "commercialOperatingSystem"
export const DEFAULT_SUPPORTING_EVIDENCE: EvidenceId = "aiAssistedWorkflows"

export function isEvidenceId(value: unknown): value is EvidenceId {
  return typeof value === "string" && value in EVIDENCE
}

export function getEvidence(ids: EvidenceId[]): EvidenceItem[] {
  const seen = new Set<EvidenceId>()
  const out: EvidenceItem[] = []
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id)
      out.push(EVIDENCE[id])
    }
  }
  return out
}
