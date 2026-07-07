import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type ScoreRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
}

type Risk = "low" | "medium" | "high"
type Verdict = "strong_pursue" | "pursue" | "selective_pursue" | "maybe" | "skip"
type Roi = "high_touch" | "tailored_application" | "light_application" | "skip"

type ScoreResult = {
  verdict: Verdict
  application_roi_tier: Roi
  role_fit_score: number
  opportunity_quality_score: number
  underleveling_risk: Risk
  stretch_risk: Risk
  credential_risk: Risk
  domain_risk: Risk
  authority_risk: Risk
  pursuit_summary: string
  best_positioning_angle: string
  green_flags: string[]
  red_flags: string[]
  compounding_gaps: string[]
  hard_pass_triggers_fired: string[]
  bright_spots: string[]
  gaps_to_address: string[]
  comp_opacity_flag: boolean
  reasoning: string
  application_strategy: string
  recommended_resume_bullets: string[]
  cover_letter_angle: string
  interview_proof_points: string[]
  extraction_mode?: "ai_extractor" | "deterministic_fallback"
  extraction_notes?: string[]
}

type Metadata = { title: string; company: string; role: string }

type RoleFamily =
  | "chief_of_staff"
  | "evp_operations"
  | "revenue_operations"
  | "pharma_sales_ops_analytics"
  | "enterprise_ai_delivery"
  | "commercial_strategy"
  | "strategic_operations"
  | "revenue_intelligence"
  | "bi_analytics"
  | "technical_operations"
  | "general"

type Seniority = "analyst" | "manager" | "senior_manager" | "associate_director" | "director" | "vp_exec" | "unknown"

type Signals = {
  role_family: RoleFamily
  seniority: Seniority
  role_center: string
  must_have_requirements: string[]
  strong_match_signals: string[]
  hard_gap_signals: string[]
  text: string

  chiefOfStaff: boolean
  evpOperations: boolean
  revenueOperations: boolean
  pharmaSalesOpsAnalytics: boolean
  enterpriseAiDelivery: boolean
  strategicOps: boolean
  commercialStrategy: boolean
  revIntelligence: boolean
  biOnly: boolean
  salesforceAdminOnly: boolean
  operatingSystems: boolean
  executiveAccess: boolean
  ceoProxy: boolean
  formalAuthority: boolean
  leaderAccountability: boolean
  boardMaterials: boolean
  ai: boolean
  enterpriseAi: boolean
  productionAiMl: boolean
  aiGovernance: boolean
  technicalTeamManagement: boolean
  gtm: boolean
  forecasting: boolean
  hubspot: boolean
  netSuite: boolean
  deepSalesforce: boolean
  crm: boolean
  dealDesk: boolean
  quoteToClose: boolean
  commissions: boolean
  incentiveComp: boolean
  territoryRoster: boolean
  qbrs: boolean
  fieldEnablement: boolean
  salesEnablement: boolean
  revenueDefinitions: boolean
  saasRevOps: boolean
  earlyStageSaas: boolean
  lifeSciences: boolean
  clinicalDevelopment: boolean
  healthcareTech: boolean
  biotechPharma: boolean
  oncologyLaunch: boolean
  payer: boolean
  medicare: boolean
  tenPlus: boolean
  eightPlusSpecific: boolean
  sevenPlusRevOps: boolean
  directorOrAboveRequired: boolean
  compVisible: boolean
  compMin?: number
  compMax?: number
}

type ExtractedSignals = Partial<Omit<Signals, "text" | "compVisible" | "compMin" | "compMax">> & {
  role_family?: RoleFamily
  seniority?: Seniority
  role_center?: string
  must_have_requirements?: string[]
  strong_match_signals?: string[]
  hard_gap_signals?: string[]
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const SCORE_MODEL = process.env.OPENROUTER_SCORE_MODEL || process.env.OPENROUTER_PLAN_MODEL || process.env.OPENROUTER_LETTER_MODEL || "openai/gpt-4.1-mini"

function lowerText(jdText: string, metadata: Metadata): string {
  return `${metadata.title} ${metadata.company} ${metadata.role}\n${jdText}`.toLowerCase()
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term))
}

function hasRegex(text: string, pattern: RegExp): boolean {
  return pattern.test(text)
}

function pushUnique(arr: string[], value: string) {
  if (!arr.some(item => item.toLowerCase() === value.toLowerCase())) arr.push(value)
}

function firstNonEmpty<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find(v => v !== undefined && v !== null && v !== "") as T | undefined
}

function boolFrom(...values: unknown[]): boolean {
  return values.some(Boolean)
}

function extractComp(jdText: string): { compVisible: boolean; compMin?: number; compMax?: number } {
  const patterns = [
    /\$\s*([0-9]{2,3})(?:\s?K|k|,?000)?\s*(?:-|–|—|to)\s*\$?\s*([0-9]{2,3})(?:\s?K|k|,?000)?/g,
    /([0-9]{2,3})\s?K\s*(?:-|–|—|to)\s*([0-9]{2,3})\s?K/gi,
  ]

  for (const pattern of patterns) {
    const matches = [...jdText.matchAll(pattern)]
    if (matches.length > 0) {
      const m = matches[0]
      const a = Number(m[1]) * 1000
      const b = Number(m[2]) * 1000
      return { compVisible: true, compMin: Math.min(a, b), compMax: Math.max(a, b) }
    }
  }

  return { compVisible: /\$\s*[0-9]|[0-9]{2,3}\s?K/i.test(jdText) }
}

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String).map(s => s.trim()).filter(Boolean).slice(0, 12)
}

function inferSeniority(text: string): Seniority {
  if (hasAny(text, ["evp", "executive vice president", "vp ", "vice president", "deputy coo"])) return "vp_exec"
  if (hasAny(text, ["associate director"])) return "associate_director"
  if (hasAny(text, ["senior director", "director"])) return "director"
  if (hasAny(text, ["senior manager"])) return "senior_manager"
  if (hasAny(text, ["manager"])) return "manager"
  if (hasAny(text, ["analyst", "specialist", "coordinator"])) return "analyst"
  return "unknown"
}

function deterministicAnalyze(jdText: string, metadata: Metadata): Signals {
  const text = lowerText(jdText, metadata)
  const comp = extractComp(jdText)

  const revenueOperations = hasAny(text, ["revenue operations", "revops", "sales operations", "sales ops", "deal desk", "quote-to-close", "quote to close", "arr", "carr"])
  const pharmaSalesOpsAnalytics = revenueOperations && hasAny(text, ["biotechnology", "pharmaceutical", "biotech", "pharma", "oncology", "field teams", "field sales", "incentive compensation", "territory/roster", "roster management", "qbr", "qbrs", "omnichannel", "market access"])
  const evpOperations = hasAny(text, ["evp of operations", "deputy coo", "operating deputy", "number-two operating seat", "number two operating seat", "coo's operating", "coo’s operating"])
  const chiefOfStaff = hasAny(text, ["chief of staff", "chief-of-staff"])
  const deepSalesforce = hasAny(text, ["own the salesforce", "salesforce instance", "salesforce architecture", "salesforce administration", "salesforce architect", "built or rebuilt", "deep salesforce", "salesforce admin"])
  const enterpriseAiDelivery = hasAny(text, ["ai manager", "innovation and ai manager", "ai platforms", "ai governance", "responsible ai", "model risk", "machine learning", "data science", "advanced analytics", "production", "technical quality", "mentor practitioners", "ai literacy"])
  const strategicOps = hasAny(text, ["strategic operations", "business operations", "operating cadence", "operating rhythm", "operating systems", "decision cadence"])
  const commercialStrategy = hasAny(text, ["commercial strategy", "gtm strategy", "go-to-market", "market strategy", "pipeline strategy"])
  const revIntelligence = hasAny(text, ["revenue intelligence", "pipeline analytics", "forecasting", "funnel analysis"])
  const biOnly = hasAny(text, ["bi analyst", "business intelligence analyst", "dashboard developer", "report developer"]) && !hasAny(text, ["executive team", "ceo", "coo", "strategy", "operating system"])
  const salesforceAdminOnly = hasAny(text, ["salesforce administrator", "salesforce admin"]) && !hasAny(text, ["strategy", "leadership", "executive"])

  let role_family: RoleFamily = "general"
  if (enterpriseAiDelivery) role_family = "enterprise_ai_delivery"
  else if (evpOperations) role_family = "evp_operations"
  else if (chiefOfStaff) role_family = "chief_of_staff"
  else if (pharmaSalesOpsAnalytics) role_family = "pharma_sales_ops_analytics"
  else if (revenueOperations) role_family = "revenue_operations"
  else if (commercialStrategy) role_family = "commercial_strategy"
  else if (revIntelligence) role_family = "revenue_intelligence"
  else if (strategicOps) role_family = "strategic_operations"
  else if (biOnly) role_family = "bi_analytics"
  else if (hasAny(text, ["automation", " ai ", "systems", "analytics", "business intelligence"])) role_family = "technical_operations"

  return {
    role_family,
    seniority: inferSeniority(text),
    role_center: "",
    must_have_requirements: [],
    strong_match_signals: [],
    hard_gap_signals: [],
    text,
    chiefOfStaff,
    evpOperations,
    revenueOperations,
    pharmaSalesOpsAnalytics,
    enterpriseAiDelivery,
    strategicOps,
    commercialStrategy,
    revIntelligence,
    biOnly,
    salesforceAdminOnly,
    operatingSystems: hasAny(text, ["operating system", "operating systems", "operating cadence", "operating rhythm", "decision cadence", "accountability mechanism", "systems, workflows", "data infrastructure", "source of truth", "operational frameworks", "governance models"]),
    executiveAccess: hasAny(text, ["ceo", "coo", "cfo", "founder", "executive team", "vp of finance", "vp finance", "senior director", "leadership team", "board-level", "board level"]),
    ceoProxy: hasAny(text, ["trusted proxy", "strategic proxy", "represent her", "represent him", "make decisions on her behalf", "make decisions on his behalf", "decision-making on behalf", "ceo proxy"]),
    formalAuthority: evpOperations || hasAny(text, ["real operating authority", "make real decisions", "consequential decisions", "decision authority", "own real outcomes", "covering the coo", "step in for the coo"]),
    leaderAccountability: hasAny(text, ["hold leaders accountable", "hold department leaders accountable", "drive execution through leaders", "senior leaders accountable", "productive friction"]),
    boardMaterials: hasAny(text, ["board materials", "board-level metrics", "board level metrics", "board", "investor"]),
    ai: hasAny(` ${text} `, [" ai ", "ai-first", "ai-enabled", "ai-powered", "artificial intelligence", "automation", "workflow automation", "claude", "chatgpt", "genai", "llm"]),
    enterpriseAi: enterpriseAiDelivery,
    productionAiMl: hasAny(text, ["production", "end-to-end implementation", "concept through production", "model", "machine learning", "data science", "technical quality", "ai platforms"]),
    aiGovernance: hasAny(text, ["governance", "responsible ai", "model risk", "security", "standards"]),
    technicalTeamManagement: hasAny(text, ["manage day-to-day execution of ai and analytics teams", "mentoring practitioners", "technical teams", "assigning work", "overseeing technical quality"]),
    gtm: hasAny(text, ["gtm", "go-to-market", "sales", "marketing", "pipeline", "funnel", "commercial", "revenue", "field teams"]),
    forecasting: hasAny(text, ["forecast", "forecasting", "pipeline review", "funnel analysis", "performance dashboards"]),
    hubspot: hasAny(text, ["hubspot"]),
    netSuite: hasAny(text, ["netsuite"]),
    deepSalesforce,
    crm: hasAny(text, ["crm", "salesforce", "hubspot"]),
    dealDesk: hasAny(text, ["deal desk", "structuring", "pricing", "proposal review", "deal review", "deals"]),
    quoteToClose: hasAny(text, ["quote-to-close", "quote to close", "closed-won", "billing", "invoice review"]),
    commissions: hasAny(text, ["commission", "commissions", "comp plan", "quota setting", "territory planning", "incentive compensation"]),
    incentiveComp: hasAny(text, ["incentive compensation", "ic plan", "ic plans", "compensation plans", "fair incentive"]),
    territoryRoster: hasAny(text, ["territory", "roster", "territory/roster", "territory management", "roster management", "account/business planning", "business planning"]),
    qbrs: hasAny(text, ["qbr", "qbrs", "quarterly business review"]),
    fieldEnablement: hasAny(text, ["field enablement", "field teams", "field sales", "home office", "customer engagement", "onboarding", "training"]),
    salesEnablement: hasAny(text, ["sales enablement", "training", "documentation", "rep adoption", "field enablement"]),
    revenueDefinitions: hasAny(text, ["arr", "carr", "opportunity stages", "pipeline categories", "revenue definitions", "deal terms"]),
    saasRevOps: revenueOperations && hasAny(text, ["b2b saas", "saas", "series a", "series b", "series c"]),
    earlyStageSaas: hasAny(text, ["series a", "series b", "series c", "first dedicated", "first revops", "first revenue operations", "early-stage", "early stage"]),
    lifeSciences: hasAny(text, ["life sciences", "biopharma", "pharma", "new therapies", "r&d", "clinical development", "medical device", "biotechnology", "diagnostics", "genomics"]),
    clinicalDevelopment: hasAny(text, ["clinical development", "clinical trial", "clinical trials", "clinical operations", "late-stage clinical"]),
    healthcareTech: hasAny(text, ["healthcare", "health tech", "health technology", "rpm", "ccm", "bhi", "remote patient monitoring", "chronic care management", "behavioral health"]),
    biotechPharma: hasAny(text, ["biotech", "biotechnology", "pharma", "pharmaceutical", "oncology company", "therapies"]),
    oncologyLaunch: hasAny(text, ["oncology launch", "oral oncolytics", "nsclc", "gi", "oncology", "ras-addicted cancers", "ras(on)"]),
    payer: hasAny(text, ["payer", "health insurance", "member health", "members healthier"]),
    medicare: hasAny(text, ["medicare advantage"]),
    tenPlus: hasRegex(text, /10\+|10 years|ten\+|ten years/),
    eightPlusSpecific: hasRegex(text, /8\+|8 years|8 or more years|eight\+|eight years|eight or more years/) && hasAny(text, ["sales operations", "commercial analytics", "biotechnology", "pharmaceutical", "ai", "data science", "advanced analytics"]),
    sevenPlusRevOps: revenueOperations && hasRegex(text, /7\+|7 or more years|seven\+|seven or more years/),
    directorOrAboveRequired: hasAny(text, ["associate director", "director", "senior director", "vp operations", "evp", "deputy coo", "chief of staff"]),
    ...comp,
  }
}

function normalizeExtracted(raw: unknown): ExtractedSignals | null {
  if (typeof raw !== "object" || raw === null) return null
  const obj = raw as Record<string, unknown>
  return {
    role_family: typeof obj.role_family === "string" ? obj.role_family as RoleFamily : undefined,
    seniority: typeof obj.seniority === "string" ? obj.seniority as Seniority : undefined,
    role_center: typeof obj.role_center === "string" ? obj.role_center : undefined,
    must_have_requirements: cleanArray(obj.must_have_requirements),
    strong_match_signals: cleanArray(obj.strong_match_signals),
    hard_gap_signals: cleanArray(obj.hard_gap_signals),
    chiefOfStaff: Boolean(obj.chiefOfStaff),
    evpOperations: Boolean(obj.evpOperations),
    revenueOperations: Boolean(obj.revenueOperations),
    pharmaSalesOpsAnalytics: Boolean(obj.pharmaSalesOpsAnalytics),
    enterpriseAiDelivery: Boolean(obj.enterpriseAiDelivery),
    strategicOps: Boolean(obj.strategicOps),
    commercialStrategy: Boolean(obj.commercialStrategy),
    revIntelligence: Boolean(obj.revIntelligence),
    biOnly: Boolean(obj.biOnly),
    salesforceAdminOnly: Boolean(obj.salesforceAdminOnly),
    operatingSystems: Boolean(obj.operatingSystems),
    executiveAccess: Boolean(obj.executiveAccess),
    ceoProxy: Boolean(obj.ceoProxy),
    formalAuthority: Boolean(obj.formalAuthority),
    leaderAccountability: Boolean(obj.leaderAccountability),
    boardMaterials: Boolean(obj.boardMaterials),
    ai: Boolean(obj.ai),
    enterpriseAi: Boolean(obj.enterpriseAi),
    productionAiMl: Boolean(obj.productionAiMl),
    aiGovernance: Boolean(obj.aiGovernance),
    technicalTeamManagement: Boolean(obj.technicalTeamManagement),
    gtm: Boolean(obj.gtm),
    forecasting: Boolean(obj.forecasting),
    hubspot: Boolean(obj.hubspot),
    netSuite: Boolean(obj.netSuite),
    deepSalesforce: Boolean(obj.deepSalesforce),
    crm: Boolean(obj.crm),
    dealDesk: Boolean(obj.dealDesk),
    quoteToClose: Boolean(obj.quoteToClose),
    commissions: Boolean(obj.commissions),
    incentiveComp: Boolean(obj.incentiveComp),
    territoryRoster: Boolean(obj.territoryRoster),
    qbrs: Boolean(obj.qbrs),
    fieldEnablement: Boolean(obj.fieldEnablement),
    salesEnablement: Boolean(obj.salesEnablement),
    revenueDefinitions: Boolean(obj.revenueDefinitions),
    saasRevOps: Boolean(obj.saasRevOps),
    earlyStageSaas: Boolean(obj.earlyStageSaas),
    lifeSciences: Boolean(obj.lifeSciences),
    clinicalDevelopment: Boolean(obj.clinicalDevelopment),
    healthcareTech: Boolean(obj.healthcareTech),
    biotechPharma: Boolean(obj.biotechPharma),
    oncologyLaunch: Boolean(obj.oncologyLaunch),
    payer: Boolean(obj.payer),
    medicare: Boolean(obj.medicare),
    tenPlus: Boolean(obj.tenPlus),
    eightPlusSpecific: Boolean(obj.eightPlusSpecific),
    sevenPlusRevOps: Boolean(obj.sevenPlusRevOps),
    directorOrAboveRequired: Boolean(obj.directorOrAboveRequired),
  }
}

function mergeSignals(fallback: Signals, extracted: ExtractedSignals | null): Signals {
  if (!extracted) return fallback

  const merged: Signals = {
    ...fallback,
    role_family: firstNonEmpty(extracted.role_family, fallback.role_family) as RoleFamily,
    seniority: firstNonEmpty(extracted.seniority, fallback.seniority) as Seniority,
    role_center: firstNonEmpty(extracted.role_center, fallback.role_center) || "",
    must_have_requirements: cleanArray(extracted.must_have_requirements).length ? cleanArray(extracted.must_have_requirements) : fallback.must_have_requirements,
    strong_match_signals: cleanArray(extracted.strong_match_signals).length ? cleanArray(extracted.strong_match_signals) : fallback.strong_match_signals,
    hard_gap_signals: cleanArray(extracted.hard_gap_signals).length ? cleanArray(extracted.hard_gap_signals) : fallback.hard_gap_signals,
  }

  const booleanKeys: Array<keyof Signals> = [
    "chiefOfStaff", "evpOperations", "revenueOperations", "pharmaSalesOpsAnalytics", "enterpriseAiDelivery", "strategicOps", "commercialStrategy", "revIntelligence", "biOnly", "salesforceAdminOnly", "operatingSystems", "executiveAccess", "ceoProxy", "formalAuthority", "leaderAccountability", "boardMaterials", "ai", "enterpriseAi", "productionAiMl", "aiGovernance", "technicalTeamManagement", "gtm", "forecasting", "hubspot", "netSuite", "deepSalesforce", "crm", "dealDesk", "quoteToClose", "commissions", "incentiveComp", "territoryRoster", "qbrs", "fieldEnablement", "salesEnablement", "revenueDefinitions", "saasRevOps", "earlyStageSaas", "lifeSciences", "clinicalDevelopment", "healthcareTech", "biotechPharma", "oncologyLaunch", "payer", "medicare", "tenPlus", "eightPlusSpecific", "sevenPlusRevOps", "directorOrAboveRequired"
  ]

  for (const key of booleanKeys) {
    ;(merged as Record<string, unknown>)[key] = boolFrom((fallback as Record<string, unknown>)[key], (extracted as Record<string, unknown>)[key])
  }

  // Force important family corrections after merge.
  if (merged.enterpriseAiDelivery) merged.role_family = "enterprise_ai_delivery"
  else if (merged.pharmaSalesOpsAnalytics) merged.role_family = "pharma_sales_ops_analytics"
  else if (merged.evpOperations || merged.formalAuthority || merged.leaderAccountability) merged.role_family = "evp_operations"
  else if (merged.chiefOfStaff || merged.ceoProxy) merged.role_family = "chief_of_staff"
  else if (merged.revenueOperations) merged.role_family = "revenue_operations"

  return merged
}

function stripJsonFence(content: string): string {
  return content.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/i, "").trim()
}

async function callExtractor(apiKey: string, jdText: string, metadata: Metadata): Promise<ExtractedSignals | null> {
  const prompt = `You are extracting job-description signals for a career-fit scorer. Return JSON only. Do not score the candidate.

Candidate context, for calibration only:
- Sam is strongest in strategic operations, commercial/GTM operating systems, executive decision support, HubSpot/NetSuite/Power BI/R/reporting, pipeline/forecasting visibility, life sciences/healthcare-adjacent markets, and practical AI-assisted commercial workflows.
- Sam should NOT be treated as a Salesforce architect, formal deal desk owner, pharma field sales operations veteran, oncology launch leader, enterprise AI/data science manager, ML engineer, formal EVP/Deputy COO, or payer/Medicare Advantage operator.

Use this schema exactly:
{
  "role_family": "chief_of_staff | evp_operations | revenue_operations | pharma_sales_ops_analytics | enterprise_ai_delivery | commercial_strategy | strategic_operations | revenue_intelligence | bi_analytics | technical_operations | general",
  "seniority": "analyst | manager | senior_manager | associate_director | director | vp_exec | unknown",
  "role_center": "one short phrase describing the real center of gravity of the role",
  "must_have_requirements": ["specific must-have requirements from the JD"],
  "strong_match_signals": ["requirements that strongly match Sam's evidence"],
  "hard_gap_signals": ["requirements that are hard gaps or likely screening risks for Sam"],
  "chiefOfStaff": false,
  "evpOperations": false,
  "revenueOperations": false,
  "pharmaSalesOpsAnalytics": false,
  "enterpriseAiDelivery": false,
  "strategicOps": false,
  "commercialStrategy": false,
  "revIntelligence": false,
  "biOnly": false,
  "salesforceAdminOnly": false,
  "operatingSystems": false,
  "executiveAccess": false,
  "ceoProxy": false,
  "formalAuthority": false,
  "leaderAccountability": false,
  "boardMaterials": false,
  "ai": false,
  "enterpriseAi": false,
  "productionAiMl": false,
  "aiGovernance": false,
  "technicalTeamManagement": false,
  "gtm": false,
  "forecasting": false,
  "hubspot": false,
  "netSuite": false,
  "deepSalesforce": false,
  "crm": false,
  "dealDesk": false,
  "quoteToClose": false,
  "commissions": false,
  "incentiveComp": false,
  "territoryRoster": false,
  "qbrs": false,
  "fieldEnablement": false,
  "salesEnablement": false,
  "revenueDefinitions": false,
  "saasRevOps": false,
  "earlyStageSaas": false,
  "lifeSciences": false,
  "clinicalDevelopment": false,
  "healthcareTech": false,
  "biotechPharma": false,
  "oncologyLaunch": false,
  "payer": false,
  "medicare": false,
  "tenPlus": false,
  "eightPlusSpecific": false,
  "sevenPlusRevOps": false,
  "directorOrAboveRequired": false
}

Important classification rules:
- If the role is sales operations/commercial analytics within biotech/pharma and includes field enablement, incentive compensation, territory/roster, CRM, QBRs, pharma launch, market access, or oncology launch, classify as pharma_sales_ops_analytics, not generic revenue_operations.
- If the role asks for AI/data science/advanced analytics, production AI, ML, governance, model risk, responsible AI, or managing AI/analytics teams, classify as enterprise_ai_delivery.
- If Salesforce/deal desk/commissions/quote-to-close are core, set those flags even if the title is broader.
- Do not infer Sam has those requirements; extract only the JD's requirements.

JOB METADATA:
${JSON.stringify(metadata, null, 2)}

JOB DESCRIPTION:
${jdText}`

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SCORE_MODEL,
      messages: [
        { role: "system", content: "Return strict JSON only. Extract job signals; do not evaluate candidate fit." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
  })

  if (!upstream.ok) return null
  const data = await upstream.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string") return null
  try {
    return normalizeExtracted(JSON.parse(stripJsonFence(content)))
  } catch {
    return null
  }
}

function buildBaseResult(): ScoreResult {
  return {
    verdict: "maybe",
    application_roi_tier: "tailored_application",
    role_fit_score: 66,
    opportunity_quality_score: 68,
    underleveling_risk: "low",
    stretch_risk: "medium",
    credential_risk: "medium",
    domain_risk: "low",
    authority_risk: "low",
    pursuit_summary: "Review carefully. The role may be worth pursuing if it offers leadership-facing operating scope and a credible bridge from Sam's commercial systems background.",
    best_positioning_angle: "Position Sam as a strategic operator who builds commercial operating systems, decision infrastructure, and executive clarity for leadership teams.",
    green_flags: [],
    red_flags: [],
    compounding_gaps: [],
    hard_pass_triggers_fired: [],
    bright_spots: [],
    gaps_to_address: [],
    comp_opacity_flag: true,
    reasoning: "Hybrid extraction plus deterministic scoring based on role shape, authority level, domain requirements, and Sam's approved evidence base.",
    application_strategy: "Use a tailored application only if the role's operating scope is strong enough to justify the effort.",
    recommended_resume_bullets: [
      "Built and owned Akadeum's commercial operating system, integrating HubSpot, NetSuite, Power BI, R, and automation workflows into a source of truth for forecasting, pipeline management, executive reporting, and GTM execution.",
      "Partnered closely with CEO, COO, CFO, VP Sales & Marketing, and commercial leadership on forecasting, pipeline strategy, executive reporting, and board/investor reporting preparation.",
      "Built AI-assisted lead routing and sales dossier workflows that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours.",
    ],
    cover_letter_angle: "Lead with commercial operating systems, executive decision support, and truthful bridges to the role's specific gaps.",
    interview_proof_points: [
      "Building the Akadeum commercial operating system from fragmented systems into leadership-facing operating infrastructure.",
      "Preparing numbers, dashboards, analysis, and narratives leadership used in board and investor conversations.",
      "AI-assisted lead routing and sales dossier workflows that reduced speed-to-first-touch from nearly 48 hours to under 20 hours.",
    ],
  }
}

function finalize(result: ScoreResult, s: Signals): ScoreResult {
  result.comp_opacity_flag = !s.compVisible
  result.green_flags = result.green_flags.slice(0, 8)
  result.red_flags = result.red_flags.slice(0, 8)
  result.gaps_to_address = result.gaps_to_address.slice(0, 8)
  result.bright_spots = result.bright_spots.slice(0, 8)
  result.compounding_gaps = result.compounding_gaps.slice(0, 4)
  result.hard_pass_triggers_fired = []
  result.role_fit_score = Math.max(0, Math.min(100, Math.round(result.role_fit_score)))
  result.opportunity_quality_score = Math.max(0, Math.min(100, Math.round(result.opportunity_quality_score)))
  if (s.strong_match_signals.length) {
    for (const item of s.strong_match_signals.slice(0, 4)) pushUnique(result.green_flags, item)
  }
  if (s.hard_gap_signals.length) {
    for (const item of s.hard_gap_signals.slice(0, 4)) pushUnique(result.red_flags, item)
  }
  return result
}

function scoreRole(s: Signals): ScoreResult {
  const r = buildBaseResult()

  if (s.biOnly || s.salesforceAdminOnly) {
    r.verdict = "maybe"
    r.application_roi_tier = "light_application"
    r.role_fit_score = s.salesforceAdminOnly ? 45 : 55
    r.opportunity_quality_score = 50
    r.underleveling_risk = "high"
    r.stretch_risk = "low"
    r.credential_risk = s.salesforceAdminOnly ? "high" : "low"
    r.pursuit_summary = "Light application at most. The role appears too narrow or tool-admin focused to use Sam's strategic operations and executive decision-support strengths."
    r.best_positioning_angle = "Only pursue if the role has broader operating-system ownership and leadership access than the JD suggests."
    r.red_flags = ["Role appears narrow, execution-only, or tool-admin focused."]
    r.gaps_to_address = ["Confirm whether the role has strategic scope and leadership access."]
    r.reasoning = "The opportunity quality is limited if the role is primarily BI, reporting, or tool administration."
    r.application_strategy = "Do not over-invest unless a hiring manager confirms broader strategic operating scope."
    return finalize(r, s)
  }

  if (s.role_family === "enterprise_ai_delivery" || s.enterpriseAiDelivery || s.enterpriseAi || s.productionAiMl || s.aiGovernance || s.technicalTeamManagement) {
    r.verdict = "maybe"
    r.application_roi_tier = "light_application"
    r.role_fit_score = 52
    r.opportunity_quality_score = s.compMax && s.compMax <= 175000 ? 60 : 64
    r.underleveling_risk = "medium"
    r.stretch_risk = "high"
    r.credential_risk = "high"
    r.domain_risk = s.lifeSciences ? "low" : "medium"
    r.authority_risk = s.technicalTeamManagement ? "medium" : "low"
    r.pursuit_summary = "Maybe / light application. The life sciences context and business-process language are attractive, but the center of gravity is enterprise AI delivery, AI governance, production analytics, and technical team leadership rather than Sam's strongest strategic-operations and commercial-systems lane."
    r.best_positioning_angle = "Only position Sam as an operational AI adoption builder who turns AI into practical business workflows. Do not position him as an AI/data science manager, ML leader, or enterprise AI governance owner."
    r.green_flags = [
      "Life sciences, diagnostics, or biotech context is adjacent to Sam's background.",
      "The role values practical AI adoption and cross-functional business process improvement.",
    ]
    r.red_flags = [
      ...(s.tenPlus ? ["The role asks for 10+ years in AI, data science, advanced analytics, or related technology roles."] : []),
      ...(s.productionAiMl ? ["The role expects end-to-end AI or analytics delivery into production, which Sam has not directly owned as a technical AI leader."] : []),
      ...(s.aiGovernance ? ["AI governance, security, model risk, or responsible AI frameworks are central requirements beyond Sam's current proof points."] : []),
      ...(s.technicalTeamManagement ? ["The role includes managing or mentoring AI/analytics practitioners and overseeing technical quality."] : []),
    ]
    r.compounding_gaps = ["Technical AI delivery, governance, and formal AI/data science leadership stack into a different profile than Sam's commercial operating-systems strength."]
    r.bright_spots = [
      "Built AI-assisted lead routing and sales dossier workflows with measurable operating impact.",
      "Has life sciences and healthcare-adjacent context.",
      "Can translate technical tools into practical operating workflows.",
    ]
    r.gaps_to_address = [
      "Do not over-position as an AI engineer, ML leader, or enterprise AI governance expert.",
      "Lead only with practical AI workflow implementation and business adoption.",
    ]
    r.reasoning = "The role is tempting because of AI + life sciences + remote, but its requirements point to enterprise AI implementation and technical governance rather than Sam's strongest lane."
    r.application_strategy = "Apply lightly only if the company is especially attractive. The application should be short, honest, and framed around operational AI adoption rather than technical AI ownership."
    r.cover_letter_angle = "Operational AI adoption in life sciences: practical workflows, measurable business impact, and business-stakeholder translation, with no claims of ML/data science leadership."
    r.interview_proof_points = [
      "AI-assisted lead routing and sales dossier workflows reducing speed-to-first-touch from nearly 48 hours to under 20 hours.",
      "How Sam evaluates when AI helps execution and when it does not.",
      "Examples of translating technical systems into practical operating workflows for commercial teams.",
    ]
    return finalize(r, s)
  }

  if (s.role_family === "pharma_sales_ops_analytics" || s.pharmaSalesOpsAnalytics) {
    let fit = 66
    if (s.incentiveComp) fit -= 4
    if (s.territoryRoster) fit -= 4
    if (s.oncologyLaunch) fit -= 4
    if (s.eightPlusSpecific) fit -= 3
    if (s.fieldEnablement) fit -= 2

    r.verdict = "selective_pursue"
    r.application_roi_tier = "tailored_application"
    r.role_fit_score = Math.max(56, fit)
    r.opportunity_quality_score = s.compMax && s.compMax >= 180000 ? 78 : 72
    r.underleveling_risk = "medium"
    r.stretch_risk = "medium"
    r.credential_risk = "high"
    r.domain_risk = s.oncologyLaunch ? "medium" : "medium"
    r.authority_risk = "low"
    r.pursuit_summary = "Selective pursue / tailored application. The role has real adjacency to Sam's commercial systems, forecasting, pipeline visibility, field enablement, and life sciences background, but it is calibrated for a pharma/biotech sales operations and analytics operator with direct experience in CRM, incentive compensation, territory/roster management, field enablement, and possibly oncology launch."
    r.best_positioning_angle = "Position Sam as a life-sciences commercial systems and revenue intelligence operator who can connect field activity, CRM data, forecasting, and leadership visibility. Be honest that pharma field sales ops mechanics such as incentive compensation, territory/roster management, and oncology launch are the ramp."
    r.green_flags = [
      "Strong overlap with commercial systems, pipeline visibility, forecasting, dashboards, CRM-adjacent workflows, and GTM operating cadence.",
      "Life sciences and healthcare background is meaningfully adjacent.",
      "The role values AI-enabled commercial field capabilities, which maps to Sam's AI-assisted lead routing and sales dossier work.",
      "Associate Director level may be a credible bridge from Commercial Strategy & Operations Lead if the hiring team values builder/operators.",
    ]
    r.red_flags = [
      ...(s.eightPlusSpecific ? ["The role asks for 8+ years specifically in sales operations, commercial analytics, or related biotech/pharma functions."] : []),
      ...(s.incentiveComp ? ["Incentive compensation plan design/management is a direct requirement Sam has not owned."] : []),
      ...(s.territoryRoster ? ["Territory, roster, account/business planning, or QBR mechanics are pharma field-sales operations requirements Sam has not directly owned."] : []),
      ...(s.oncologyLaunch ? ["Oncology launch experience is preferred and would likely matter in screening."] : []),
      ...(s.crm ? ["CRM and field enablement tool ownership are central; Sam should not imply Salesforce or pharma CRM administration ownership unless true."] : []),
    ]
    r.compounding_gaps = ["Specific pharma sales operations mechanics, incentive compensation, territory/roster management, and oncology launch create a stacked domain/credential gap despite strong commercial-systems adjacency."]
    r.bright_spots = [
      "Built Akadeum's commercial operating system across HubSpot, NetSuite, Power BI, R, and automation.",
      "Improved MQL-to-SQL from 11% to 20% and SQL-to-Opportunity from 26% to 43% through ICP and pipeline strategy work.",
      "Built AI-assisted lead routing and sales dossier workflows that reduced speed-to-first-touch from nearly 48 hours to under 20 hours.",
      "Prepared decision-ready analysis and narratives leadership used in board/investor reporting cycles.",
    ]
    r.gaps_to_address = [
      "Bridge from commercial operating systems and pipeline visibility into pharma field enablement without claiming direct pharma sales ops ownership.",
      "Do not claim incentive compensation, territory/roster management, oncology launch, or formal CRM administration if not true.",
      "Show comfort working across Sales, Marketing, Finance, IT, Compliance, and leadership from adjacent Akadeum experience.",
    ]
    r.reasoning = "This is closer than a Salesforce-heavy RevOps role, but still not clean. The work is sales operations and commercial analytics inside biotech/pharma field execution, not broad strategic operations. Sam's systems and life sciences background are useful, while the field-sales ops mechanics are the risk."
    r.application_strategy = "Apply with a tailored application if the company/role is attractive. Lead with the Akadeum commercial operating system, forecasting, pipeline visibility, AI-assisted commercial workflows, and cross-functional leadership reporting. Bridge pharma field-sales operations gaps carefully."
    r.cover_letter_angle = "Frame Sam as a commercial systems and field-enablement-adjacent operator who gives Sales, Marketing, Finance, and leadership a shared operating view; bridge honestly into pharma sales ops mechanics."
    r.interview_proof_points = [
      "Building Akadeum's commercial operating system from fragmented systems into leadership-facing operating infrastructure.",
      "ICP and pipeline improvements that changed lead quality and commercial focus.",
      "AI-assisted lead routing and sales dossiers that improved speed-to-first-touch.",
      "How Sam partnered with commercial leadership and finance-facing stakeholders on forecasting and executive reporting.",
    ]
    return finalize(r, s)
  }

  if (s.evpOperations || s.formalAuthority || s.leaderAccountability) {
    r.verdict = "selective_pursue"
    r.application_roi_tier = "high_touch"
    r.role_fit_score = 66
    r.opportunity_quality_score = s.compMax && s.compMax >= 190000 ? 90 : 86
    r.underleveling_risk = "low"
    r.stretch_risk = "high"
    r.credential_risk = "high"
    r.domain_risk = s.healthcareTech ? "medium" : "low"
    r.authority_risk = "high"
    r.pursuit_summary = "High-quality but significant stretch. The role is strongly aligned with Sam's operating systems, executive decision support, AI workflow, and healthcare-adjacent experience, but it appears calibrated for a proven Director/Senior Director, Deputy COO, VP, or EVP operator with formal authority over leaders and company-wide execution."
    r.best_positioning_angle = "Position Sam as a strategic operations builder who has created executive-facing operating systems, decision infrastructure, and AI-enabled workflows, while being honest that formal EVP/Deputy COO-level authority is the stretch."
    r.green_flags = ["Role emphasizes operating systems, structure, execution cadence, and AI-enabled leverage.", "Healthcare or life sciences context is adjacent to Sam's background."]
    r.red_flags = ["The role requires formal operating authority and leader accountability beyond what Sam has directly held.", "The JD is calibrated for Director/Senior Director, Deputy COO, VP, or EVP-level operating experience."]
    r.compounding_gaps = ["Formal authority, senior title calibration, and domain ramp create a real but potentially worthwhile stretch."]
    r.bright_spots = ["Built commercial operating infrastructure leadership relied on.", "Worked closely with CEO, COO, CFO, and commercial leadership.", "Built AI-assisted workflows that reduced speed-to-first-touch from nearly 48 hours to under 20 hours."]
    r.gaps_to_address = ["Bridge from executive decision support to formal operating authority without overclaiming.", "Show how Sam created visibility and cadence that made accountability easier, rather than claiming he directly held department leaders accountable."]
    r.reasoning = "This is a high-upside operating seat, but not a clean fit. Sam has strong evidence for systems, executive decision support, and AI-enabled workflows; the risk is formal operating authority."
    r.application_strategy = "Selective high-touch swing only. Lead with the operating-system story, executive decision support, and AI workflow proof. Use a warm intro if possible."
    r.cover_letter_angle = "Write a grounded letter around operating systems, executive clarity, AI-assisted execution, and an honest bridge from executive decision support to formal operating authority."
    return finalize(r, s)
  }

  if (s.chiefOfStaff || s.ceoProxy) {
    r.verdict = "pursue"
    r.application_roi_tier = "high_touch"
    r.role_fit_score = s.ceoProxy || s.medicare || s.tenPlus ? 78 : 84
    r.opportunity_quality_score = s.compMax && s.compMax >= 180000 ? 88 : 84
    r.underleveling_risk = "low"
    r.stretch_risk = s.ceoProxy || s.tenPlus ? "high" : "medium"
    r.credential_risk = s.tenPlus ? "medium" : "low"
    r.domain_risk = s.medicare || s.payer ? "medium" : "low"
    r.authority_risk = s.ceoProxy ? "high" : "medium"
    r.pursuit_summary = s.ceoProxy || s.medicare || s.tenPlus
      ? "High-touch pursue. This is a credible stretch: the role is strongly aligned with Sam's operating style, but CEO-proxy expectations, seniority screening, or domain depth create real risk."
      : "Strong leadership-facing strategic operations fit. The role aligns with Sam's operating systems, executive decision support, and ambiguity-to-structure experience."
    r.best_positioning_angle = "Position Sam as a strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams, while being honest about any formal authority or domain stretch."
    r.green_flags = ["Role is leadership-facing and operating-system oriented.", "Strong match to Sam's executive decision support and commercial operating system work.", ...(s.ai ? ["AI is valued as a practical execution lever."] : [])]
    r.red_flags = [
      ...(s.ceoProxy ? ["The role includes CEO-proxy language and may require decision authority Sam has not formally held."] : []),
      ...(s.tenPlus ? ["The role asks for 10+ years of experience, while Sam has approximately 8 years."] : []),
      ...(s.medicare || s.payer ? ["Medicare Advantage or payer operations are specific domains Sam has not worked in directly."] : []),
    ]
    r.compounding_gaps = s.ceoProxy && (s.tenPlus || s.medicare || s.payer) ? ["CEO-proxy expectations, seniority screening, and domain depth create a real but potentially worthwhile stretch."] : []
    r.bright_spots = ["Built operating systems leadership relied on.", "Prepared board/investor reporting materials leadership used.", "Created AI-assisted workflows that reduced response time substantially."]
    r.gaps_to_address = [
      ...(s.ceoProxy ? ["Frame CEO-proxy requirements as an adjacent stretch supported by executive partnership, decision systems, and operating cadence work."] : []),
      ...(s.tenPlus ? ["Bridge the years-of-experience gap by leading with scope, ownership, and measurable operating impact."] : []),
      ...(s.medicare || s.payer ? ["Bridge honestly from healthcare, life sciences, analytics, and complex technical markets into Medicare Advantage or payer operations."] : []),
    ]
    r.reasoning = "The role aligns with Sam's operating systems and executive decision support strengths, but formal authority, seniority, or domain requirements can make it a credible stretch rather than a clean fit."
    r.application_strategy = "Use a tailored high-touch application. Lead with the Akadeum commercial operating system, executive decision support, and AI-assisted workflow proof. Do not claim CEO-proxy authority."
    return finalize(r, s)
  }

  if (s.revenueOperations) {
    const hardRevOps = s.deepSalesforce || s.dealDesk || s.quoteToClose || s.commissions || s.revenueDefinitions
    r.verdict = hardRevOps ? "selective_pursue" : "pursue"
    r.application_roi_tier = hardRevOps ? "tailored_application" : "high_touch"
    r.role_fit_score = hardRevOps ? 58 : 72
    r.opportunity_quality_score = s.earlyStageSaas || (s.compMax !== undefined && s.compMax >= 180000) ? 72 : 68
    r.underleveling_risk = hardRevOps ? "medium" : "low"
    r.stretch_risk = "medium"
    r.credential_risk = hardRevOps ? "high" : "medium"
    r.domain_risk = s.lifeSciences || s.clinicalDevelopment ? "low" : s.saasRevOps ? "medium" : "low"
    r.authority_risk = "low"
    r.pursuit_summary = hardRevOps
      ? "Adjacent but not core-fit. The context may align with Sam's commercial systems work, but the role is heavily centered on Salesforce architecture, deal desk, quote-to-close, or SaaS RevOps mechanics that Sam has not directly owned."
      : "Pursue selectively. The role aligns with Sam's commercial systems, pipeline visibility, and executive reporting work, with some risk if the company expects a traditional RevOps operator."
    r.best_positioning_angle = hardRevOps
      ? "Position Sam as a commercial systems builder with strong revenue visibility, GTM operating cadence, and leadership reporting experience, while being honest that he is not a Salesforce-first RevOps admin or formal deal desk owner."
      : "Position Sam as a commercial systems and revenue intelligence operator who connects GTM activity to leadership visibility and better operating decisions."
    r.green_flags = ["Strong overlap with commercial systems, pipeline visibility, forecasting, and GTM operating cadence.", ...(s.lifeSciences || s.clinicalDevelopment ? ["Life sciences and clinical-development context is adjacent to Sam's Akadeum and healthcare background."] : []), ...(s.hubspot ? ["HubSpot overlap is directly relevant."] : [])]
    r.red_flags = [
      ...(s.deepSalesforce ? ["The role requires deep Salesforce architecture or administration that Sam has not directly owned."] : []),
      ...(s.dealDesk || s.quoteToClose ? ["The role requires direct deal desk, quote-to-close, pricing, or proposal ownership that Sam has not formally held."] : []),
      ...(s.commissions ? ["Commission validation, quota, territory, or comp-plan ownership is narrower RevOps work Sam has not directly owned."] : []),
      ...(s.sevenPlusRevOps ? ["The role asks for 7+ years specifically in RevOps, Sales Ops, or deal desk, which is narrower than Sam's broader commercial operations background."] : []),
    ]
    r.compounding_gaps = hardRevOps ? ["Salesforce architecture, deal desk ownership, and formal SaaS RevOps mechanics are a stacked gap despite strong commercial-systems adjacency."] : []
    r.bright_spots = ["Built Akadeum's commercial operating system across HubSpot, NetSuite, Power BI, R, and automation.", "Improved MQL-to-SQL from 11% to 20% and SQL-to-Opportunity from 26% to 43% through ICP and pipeline strategy work.", "Partnered with CEO, CFO, VP Sales & Marketing, and commercial leadership on forecasting and executive reporting."]
    r.gaps_to_address = [
      ...(s.deepSalesforce ? ["Do not claim Salesforce architecture. Bridge from HubSpot-native CRM architecture, systems thinking, and ability to learn."] : []),
      ...(s.dealDesk || s.quoteToClose ? ["Do not claim deal desk ownership. Bridge from forecasting, pipeline, commercial systems, and finance-facing reporting."] : []),
      "Make clear that Sam's strength is commercial operating systems and revenue visibility, not narrow CRM administration.",
    ]
    r.reasoning = hardRevOps ? "The role has strong surface alignment with Sam's commercial systems work, but the center of gravity is deeper in Salesforce architecture, deal desk, quote-to-close, and SaaS RevOps than Sam has directly held." : "The role aligns with Sam's revenue visibility and commercial operating systems work, though it should be checked for tool-admin or underleveling risk."
    r.application_strategy = hardRevOps ? "Apply only with a tailored letter. Lead with commercial operating systems and revenue visibility, then bridge the Salesforce/deal desk gap honestly." : "Lead with Akadeum's commercial operating system, pipeline visibility, and executive reporting work."
    r.cover_letter_angle = hardRevOps ? "Frame Sam as a commercial systems builder, not a Salesforce-first RevOps admin. Be direct about Salesforce/deal desk gaps." : "Frame Sam as a revenue intelligence and commercial systems operator who makes GTM activity visible and actionable for leadership."
    return finalize(r, s)
  }

  if (s.strategicOps || s.commercialStrategy || s.revIntelligence || s.operatingSystems) {
    r.verdict = s.executiveAccess ? "strong_pursue" : "pursue"
    r.application_roi_tier = s.executiveAccess ? "high_touch" : "tailored_application"
    r.role_fit_score = s.executiveAccess ? 86 : 80
    r.opportunity_quality_score = s.executiveAccess ? 86 : 78
    r.underleveling_risk = "low"
    r.stretch_risk = "medium"
    r.credential_risk = "low"
    r.domain_risk = "low"
    r.authority_risk = "low"
    r.pursuit_summary = "Strong strategic operations fit if the role has real ownership and leadership access. The role aligns with Sam's operating systems, commercial strategy, executive reporting, and ambiguity-to-structure strengths."
    r.best_positioning_angle = "Position Sam as a strategic operator who turns messy commercial signals and disconnected systems into operating clarity leadership can act on."
    r.green_flags = ["Role emphasizes systems, ambiguity, operating cadence, strategy, or commercial execution.", ...(s.executiveAccess ? ["Leadership access appears meaningful."] : []), ...(s.ai ? ["AI or automation is valued as an operating lever."] : [])]
    r.bright_spots = ["Akadeum commercial operating system is directly relevant.", "ICP and pipeline conversion improvements provide strategic commercial proof.", "Executive decision support and board/investor reporting preparation are strong proof points."]
    r.gaps_to_address = ["Confirm that the role has decision influence and leadership access, not just dashboard or process support."]
    r.reasoning = "The role shape matches Sam's strongest positioning: strategic operations, commercial systems, executive reporting, and turning ambiguity into clarity."
    r.application_strategy = "Use a tailored application centered on operating systems, executive decision support, ICP/pipeline strategy, and AI-assisted workflows if relevant."
    return finalize(r, s)
  }

  return finalize(r, s)
}

export async function POST(req: NextRequest) {
  let body: ScoreRequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const jdText = (body.jdText || "").trim()
  if (!jdText) return NextResponse.json({ error: "Job description is empty" }, { status: 400 })

  const metadata: Metadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  }

  const fallbackSignals = deterministicAnalyze(jdText, metadata)
  const apiKey = process.env.OPENROUTER_API_KEY
  let extracted: ExtractedSignals | null = null
  let extractionMode: "ai_extractor" | "deterministic_fallback" = "deterministic_fallback"

  if (apiKey) {
    extracted = await callExtractor(apiKey, jdText, metadata)
    if (extracted) extractionMode = "ai_extractor"
  }

  const signals = mergeSignals(fallbackSignals, extracted)
  const result = scoreRole(signals)
  result.extraction_mode = extractionMode
  result.extraction_notes = extractionMode === "ai_extractor"
    ? ["AI extracted role signals; deterministic rules computed final scores."]
    : ["Deterministic fallback used because the AI extractor was unavailable. Check OPENROUTER_API_KEY / SCORE_MODEL if scoring returns instantly."]

  return NextResponse.json({ result, signals })
}
