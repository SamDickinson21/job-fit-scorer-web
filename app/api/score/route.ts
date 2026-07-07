import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type ScoreRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
}

type Risk = "low" | "medium" | "high"

type ScoreResult = {
  verdict: "strong_pursue" | "pursue" | "selective_pursue" | "maybe" | "skip"
  application_roi_tier: "high_touch" | "tailored_application" | "light_application" | "skip"
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
}

type Metadata = { title: string; company: string; role: string }

type Signals = {
  text: string
  chiefOfStaff: boolean
  evpOperations: boolean
  revenueOperations: boolean
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
  gtm: boolean
  forecasting: boolean
  hubspot: boolean
  netSuite: boolean
  deepSalesforce: boolean
  dealDesk: boolean
  quoteToClose: boolean
  commissions: boolean
  revenueDefinitions: boolean
  saasRevOps: boolean
  earlyStageSaas: boolean
  lifeSciences: boolean
  clinicalDevelopment: boolean
  healthcareTech: boolean
  payer: boolean
  medicare: boolean
  tenPlus: boolean
  sevenPlusRevOps: boolean
  directorOrAboveRequired: boolean
  compVisible: boolean
  compMin?: number
  compMax?: number
}

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

function extractComp(jdText: string): { compVisible: boolean; compMin?: number; compMax?: number } {
  const matches = [...jdText.matchAll(/\$\s*([0-9]{2,3})(?:,?000)?\s*(?:-|–|—|to)\s*\$?\s*([0-9]{2,3})(?:,?000)?/g)]
  if (matches.length > 0) {
    const m = matches[0]
    const a = Number(m[1]) * 1000
    const b = Number(m[2]) * 1000
    return { compVisible: true, compMin: Math.min(a, b), compMax: Math.max(a, b) }
  }
  return { compVisible: /\$\s*[0-9]/.test(jdText) }
}

function analyze(jdText: string, metadata: Metadata): Signals {
  const text = lowerText(jdText, metadata)
  const comp = extractComp(jdText)
  const deepSalesforce = hasAny(text, ["own the salesforce", "salesforce instance", "salesforce architecture", "salesforce administration", "salesforce architect", "built or rebuilt", "deep salesforce", "salesforce admin"])
  const revenueOperations = hasAny(text, ["revenue operations", "revops", "sales operations", "deal desk", "quote-to-close", "quote to close", "arr", "carr"])
  const evpOperations = hasAny(text, ["evp of operations", "deputy coo", "operating deputy", "number-two operating seat", "number two operating seat", "coo's operating", "coo’s operating"])
  const chiefOfStaff = hasAny(text, ["chief of staff", "chief-of-staff"])
  const biOnly = hasAny(text, ["bi analyst", "business intelligence analyst", "dashboard developer", "report developer"]) && !hasAny(text, ["executive team", "ceo", "coo", "strategy", "operating system"])
  const salesforceAdminOnly = hasAny(text, ["salesforce administrator", "salesforce admin"]) && !hasAny(text, ["strategy", "leadership", "executive"])

  return {
    text,
    chiefOfStaff,
    evpOperations,
    revenueOperations,
    strategicOps: hasAny(text, ["strategic operations", "business operations", "operating cadence", "operating rhythm", "operating systems", "decision cadence"]),
    commercialStrategy: hasAny(text, ["commercial strategy", "gtm strategy", "go-to-market", "market strategy", "pipeline strategy"]),
    revIntelligence: hasAny(text, ["revenue intelligence", "pipeline analytics", "forecasting", "funnel analysis"]),
    biOnly,
    salesforceAdminOnly,
    operatingSystems: hasAny(text, ["operating system", "operating systems", "operating cadence", "operating rhythm", "decision cadence", "accountability mechanism", "systems, workflows", "data infrastructure", "source of truth"]),
    executiveAccess: hasAny(text, ["ceo", "coo", "cfo", "founder", "executive team", "vp of finance", "vp finance", "leadership team", "board-level", "board level"]),
    ceoProxy: hasAny(text, ["trusted proxy", "strategic proxy", "represent her", "represent him", "make decisions on her behalf", "make decisions on his behalf", "decision-making on behalf", "ceo proxy"]),
    formalAuthority: evpOperations || hasAny(text, ["real operating authority", "make real decisions", "consequential decisions", "decision authority", "own real outcomes", "covering the coo", "step in for the coo"]),
    leaderAccountability: hasAny(text, ["hold leaders accountable", "hold department leaders accountable", "drive execution through leaders", "senior leaders accountable", "productive friction"]),
    boardMaterials: hasAny(text, ["board materials", "board-level metrics", "board level metrics", "board", "investor"]),
    ai: hasAny(` ${text} `, [" ai ", "ai-first", "ai-enabled", "ai-powered", "artificial intelligence", "automation", "workflow automation", "claude", "chatgpt"]),
    gtm: hasAny(text, ["gtm", "go-to-market", "sales", "marketing", "pipeline", "funnel", "commercial", "revenue"]),
    forecasting: hasAny(text, ["forecast", "forecasting", "pipeline review", "funnel analysis"]),
    hubspot: hasAny(text, ["hubspot"]),
    netSuite: hasAny(text, ["netsuite"]),
    deepSalesforce,
    dealDesk: hasAny(text, ["deal desk", "structuring", "pricing", "proposal review", "deal review", "deals"]),
    quoteToClose: hasAny(text, ["quote-to-close", "quote to close", "closed-won", "billing", "invoice review"]),
    commissions: hasAny(text, ["commission", "commissions", "comp plan", "quota setting", "territory planning"]),
    revenueDefinitions: hasAny(text, ["arr", "carr", "opportunity stages", "pipeline categories", "revenue definitions", "deal terms"]),
    saasRevOps: revenueOperations && hasAny(text, ["b2b saas", "saas", "series a", "series b", "series c"]),
    earlyStageSaas: hasAny(text, ["series a", "series b", "series c", "first dedicated", "first revops", "first revenue operations", "early-stage", "early stage"]),
    lifeSciences: hasAny(text, ["life sciences", "biopharma", "pharma", "new therapies", "r&d", "clinical development", "medical device"]),
    clinicalDevelopment: hasAny(text, ["clinical development", "clinical trial", "clinical trials", "clinical operations"]),
    healthcareTech: hasAny(text, ["healthcare", "health tech", "health technology", "rpm", "ccm", "bhi", "remote patient monitoring", "chronic care management", "behavioral health"]),
    payer: hasAny(text, ["payer", "health insurance", "member health", "members healthier"]),
    medicare: hasAny(text, ["medicare advantage"]),
    tenPlus: hasRegex(text, /10\+|10 years|ten\+|ten years/),
    sevenPlusRevOps: revenueOperations && hasRegex(text, /7\+|7 or more years|seven\+|seven or more years/),
    directorOrAboveRequired: hasAny(text, ["director", "senior director", "vp operations", "evp", "deputy coo", "chief of staff"]),
    ...comp,
  }
}

function buildBaseResult(): ScoreResult {
  return {
    verdict: "maybe",
    application_roi_tier: "tailored_application",
    role_fit_score: 68,
    opportunity_quality_score: 70,
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
    reasoning: "Initial deterministic triage based on role shape, authority level, domain requirements, and Sam's approved evidence base.",
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
  return result
}

function scoreRole(s: Signals, metadata: Metadata): ScoreResult {
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
    r.pursuit_summary = "High-quality but significant stretch. The role is strongly aligned with Sam's operating systems, executive decision support, AI workflow, and healthcare-adjacent experience, but it appears calibrated for a proven Director/Senior Director, Deputy COO, VP, or EVP operator with formal authority over leaders and company-wide execution. Worth pursuing only with a highly tailored application and preferably a warm path."
    r.best_positioning_angle = "Position Sam as a strategic operations builder who has created executive-facing operating systems, decision infrastructure, and AI-enabled workflows, while being honest that formal EVP/Deputy COO-level authority is the stretch."
    r.green_flags = [
      "Role emphasizes operating systems, structure, execution cadence, and AI-enabled leverage.",
      "Healthcare technology context is adjacent to Sam's healthcare and life sciences background.",
      "Compensation and executive scope make the opportunity quality high.",
    ]
    r.red_flags = [
      "The role requires formal operating authority and leader accountability beyond what Sam has directly held.",
      "The JD is calibrated for Director/Senior Director, Deputy COO, VP, or EVP-level operating experience.",
      ...(s.healthcareTech ? ["RPM, CCM, BHI, or healthcare SaaS operations are specific domains Sam has not owned directly."] : []),
    ]
    r.compounding_gaps = ["Formal authority, senior title calibration, and domain ramp create a real but potentially worthwhile stretch."]
    r.bright_spots = [
      "Built commercial operating infrastructure leadership relied on.",
      "Worked closely with CEO, COO, CFO, and commercial leadership.",
      "Built AI-assisted workflows that reduced speed-to-first-touch from nearly 48 hours to under 20 hours.",
    ]
    r.gaps_to_address = [
      "Bridge from executive decision support to formal operating authority without overclaiming.",
      "Show how Sam created visibility and cadence that made accountability easier, rather than claiming he directly held department leaders accountable.",
      "Bridge healthcare/life sciences experience into the company's specific operating domain.",
    ]
    r.reasoning = "This is a high-upside operating seat, but not a clean fit. Sam has strong evidence for systems, executive decision support, and AI-enabled workflows; the risk is formal operating authority at EVP/Deputy COO altitude."
    r.application_strategy = "Selective high-touch swing only. Lead with the operating-system story, executive decision support, and AI workflow proof. Use a warm intro if possible and be direct that the formal authority is the stretch."
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
    r.domain_risk = s.medicare || s.payer ? "medium" : s.healthcareTech ? "low" : "low"
    r.authority_risk = s.ceoProxy ? "high" : "medium"
    r.pursuit_summary = s.ceoProxy || s.medicare || s.tenPlus
      ? "High-touch pursue. This is a credible stretch: the role is strongly aligned with Sam's operating style, but CEO-proxy expectations, seniority screening, or domain depth create real risk."
      : "Strong leadership-facing strategic operations fit. The role aligns with Sam's operating systems, executive decision support, and ambiguity-to-structure experience."
    r.best_positioning_angle = "Position Sam as a strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams, while being honest about any formal authority or domain stretch."
    r.green_flags = [
      "Role is leadership-facing and operating-system oriented.",
      "Strong match to Sam's executive decision support and commercial operating system work.",
      ...(s.ai ? ["AI is valued as a practical execution lever."] : []),
    ]
    r.red_flags = [
      ...(s.ceoProxy ? ["The role includes CEO-proxy language and may require decision authority Sam has not formally held."] : []),
      ...(s.tenPlus ? ["The role asks for 10+ years of experience, while Sam has approximately 8 years."] : []),
      ...(s.medicare || s.payer ? ["Medicare Advantage or payer operations are specific domains Sam has not worked in directly."] : []),
    ]
    r.compounding_gaps = s.ceoProxy && (s.tenPlus || s.medicare || s.payer)
      ? ["CEO-proxy expectations, seniority screening, and domain depth create a real but potentially worthwhile stretch."]
      : []
    r.bright_spots = [
      "Built operating systems leadership relied on.",
      "Prepared board/investor reporting materials leadership used.",
      "Created AI-assisted workflows that reduced response time substantially.",
    ]
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
    r.opportunity_quality_score = s.earlyStageSaas || s.compMax && s.compMax >= 180000 ? 72 : 68
    r.underleveling_risk = hardRevOps ? "medium" : "low"
    r.stretch_risk = "medium"
    r.credential_risk = hardRevOps ? "high" : "medium"
    r.domain_risk = s.lifeSciences || s.clinicalDevelopment ? "low" : s.saasRevOps ? "medium" : "low"
    r.authority_risk = "low"
    r.pursuit_summary = hardRevOps
      ? "Adjacent but not core-fit. The life sciences GTM context, first-RevOps-hire mandate, and need for commercial systems ownership align with Sam's Akadeum work. However, the role is heavily centered on Salesforce architecture, deal desk, quote-to-close, and SaaS RevOps mechanics that Sam has not directly owned. Worth a tailored application only if the company is especially interesting or there is a warm path."
      : "Pursue selectively. The role aligns with Sam's commercial systems, pipeline visibility, and executive reporting work, with some risk if the company expects a traditional RevOps operator."
    r.best_positioning_angle = hardRevOps
      ? "Position Sam as a commercial systems builder with strong revenue visibility, GTM operating cadence, and leadership reporting experience, while being honest that he is not a Salesforce-first RevOps admin or formal deal desk owner."
      : "Position Sam as a commercial systems and revenue intelligence operator who connects GTM activity to leadership visibility and better operating decisions."
    r.green_flags = [
      "Strong overlap with commercial systems, pipeline visibility, forecasting, and GTM operating cadence.",
      ...(s.lifeSciences || s.clinicalDevelopment ? ["Life sciences and clinical-development context is adjacent to Sam's Akadeum and healthcare background."] : []),
      ...(s.hubspot ? ["HubSpot overlap is directly relevant."] : []),
      ...(s.earlyStageSaas ? ["First-function or early-stage buildout aligns with Sam's systems-builder profile."] : []),
    ]
    r.red_flags = [
      ...(s.deepSalesforce ? ["The role requires deep Salesforce architecture or administration that Sam has not directly owned."] : []),
      ...(s.dealDesk || s.quoteToClose ? ["The role requires direct deal desk, quote-to-close, pricing, or proposal ownership that Sam has not formally held."] : []),
      ...(s.commissions ? ["Commission validation, quota, territory, or comp-plan ownership is narrower RevOps work Sam has not directly owned."] : []),
      ...(s.sevenPlusRevOps ? ["The role asks for 7+ years specifically in RevOps, Sales Ops, or deal desk, which is narrower than Sam's broader commercial operations background."] : []),
    ]
    r.compounding_gaps = hardRevOps ? ["Salesforce architecture, deal desk ownership, and formal SaaS RevOps mechanics are a stacked gap despite strong commercial-systems adjacency."] : []
    r.bright_spots = [
      "Built Akadeum's commercial operating system across HubSpot, NetSuite, Power BI, R, and automation.",
      "Improved MQL-to-SQL from 11% to 20% and SQL-to-Opportunity from 26% to 43% through ICP and pipeline strategy work.",
      "Partnered with CEO, CFO, VP Sales & Marketing, and commercial leadership on forecasting and executive reporting.",
    ]
    r.gaps_to_address = [
      ...(s.deepSalesforce ? ["Do not claim Salesforce architecture. Bridge from HubSpot-native CRM architecture, systems thinking, and ability to learn." ] : []),
      ...(s.dealDesk || s.quoteToClose ? ["Do not claim deal desk ownership. Bridge from forecasting, pipeline, commercial systems, and finance-facing reporting." ] : []),
      "Make clear that Sam's strength is commercial operating systems and revenue visibility, not narrow CRM administration.",
    ]
    r.reasoning = hardRevOps
      ? "The role has strong surface alignment with Sam's commercial systems work, but the center of gravity is deeper in Salesforce architecture, deal desk, quote-to-close, and SaaS RevOps than Sam has directly held."
      : "The role aligns with Sam's revenue visibility and commercial operating systems work, though it should be checked for tool-admin or underleveling risk."
    r.application_strategy = hardRevOps
      ? "Apply only with a tailored letter. Lead with commercial operating systems and revenue visibility, then bridge the Salesforce/deal desk gap honestly. Do not position Sam as a Salesforce architect."
      : "Lead with Akadeum's commercial operating system, pipeline visibility, and executive reporting work."
    r.cover_letter_angle = hardRevOps
      ? "Frame Sam as a commercial systems builder, not a Salesforce-first RevOps admin. Be direct about Salesforce/deal desk gaps and show why the broader first-RevOps buildout still aligns."
      : "Frame Sam as a revenue intelligence and commercial systems operator who makes GTM activity visible and actionable for leadership."
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
    r.domain_risk = s.lifeSciences || s.healthcareTech ? "low" : "low"
    r.authority_risk = "low"
    r.pursuit_summary = "Strong strategic operations fit if the role has real ownership and leadership access. The role aligns with Sam's operating systems, commercial strategy, executive reporting, and ambiguity-to-structure strengths."
    r.best_positioning_angle = "Position Sam as a strategic operator who turns messy commercial signals and disconnected systems into operating clarity leadership can act on."
    r.green_flags = [
      "Role emphasizes systems, ambiguity, operating cadence, strategy, or commercial execution.",
      ...(s.executiveAccess ? ["Leadership access appears meaningful."] : []),
      ...(s.ai ? ["AI or automation is valued as an operating lever."] : []),
    ]
    r.red_flags = []
    r.compounding_gaps = []
    r.bright_spots = [
      "Akadeum commercial operating system is directly relevant.",
      "ICP and pipeline conversion improvements provide strategic commercial proof.",
      "Executive decision support and board/investor reporting preparation are strong proof points.",
    ]
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

  const signals = analyze(jdText, metadata)
  const result = scoreRole(signals, metadata)

  return NextResponse.json({ result, signals })
}
