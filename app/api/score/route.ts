import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { SCORE_SYSTEM_PROMPT, buildScorePrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_SCORE_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini"
const SCORE_MAX_TOKENS = 1800

type ScoreRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
}

type Risk = "low" | "medium" | "high"

type ScoreResult = {
  verdict: string
  application_roi_tier: string
  role_fit_score: number
  opportunity_quality_score: number
  underleveling_risk: Risk
  stretch_risk: Risk
  credential_risk: Risk
  domain_risk: Risk
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

const REQUIRED_FIELDS = [
  "verdict",
  "application_roi_tier",
  "role_fit_score",
  "opportunity_quality_score",
  "underleveling_risk",
  "stretch_risk",
  "credential_risk",
  "domain_risk",
  "pursuit_summary",
  "best_positioning_angle",
  "green_flags",
  "red_flags",
  "compounding_gaps",
  "hard_pass_triggers_fired",
  "bright_spots",
  "gaps_to_address",
  "comp_opacity_flag",
  "reasoning",
  "application_strategy",
  "recommended_resume_bullets",
  "cover_letter_angle",
  "interview_proof_points",
]

function stripJsonFence(content: string): string {
  let cleaned = content.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim()
  }
  return cleaned
}

function clampScore(value: unknown, fallback: number): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : fallback
  return Math.max(0, Math.min(100, Math.round(num)))
}

function normalizeRisk(value: unknown, fallback: Risk): Risk {
  if (value === "low" || value === "medium" || value === "high") return value
  return fallback
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean)
    : []
}

function unique(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

function haystack(jdText: string, metadata: { title: string; company: string; role: string }): string {
  return `${metadata.title} ${metadata.company} ${metadata.role}\n${jdText}`.toLowerCase()
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term))
}

function sanitizeProxyClaims(value: unknown): string {
  return toText(value)
    .replace(/acted as (a )?(trusted|strategic|ceo) proxy/gi, "supported executive decision-making")
    .replace(/operated as (a )?(trusted|strategic|ceo) proxy/gi, "supported executive decision-making")
    .replace(/served as (a )?(trusted|strategic|ceo) proxy/gi, "supported executive decision-making")
    .replace(/serve as (a )?(trusted|strategic|ceo) proxy/gi, "support executive decision-making")
    .replace(/act as (a )?(trusted|strategic|ceo) proxy/gi, "support executive decision-making")
    .replace(/trusted proxy/gi, "trusted operating partner")
    .replace(/strategic proxy/gi, "strategic operating partner")
    .replace(/CEO proxy/gi, "CEO-adjacent operating partner")
    .trim()
}

function sanitizeArray(value: unknown): string[] {
  return unique(toArray(value).map(sanitizeProxyClaims).filter(Boolean)).filter(item => {
    const lower = item.toLowerCase()
    return !lower.includes("decision speed by 30") &&
      !lower.includes("project cycle time") &&
      !lower.includes("cut project cycle time") &&
      !lower.includes("clinical, operations, finance, and growth") &&
      !lower.includes("led cross-functional initiatives across clinical")
  })
}

function inferBaseFallback(jdText: string, metadata: { title: string; company: string; role: string }): ScoreResult {
  const h = haystack(jdText, metadata)
  const chiefOfStaff = hasAny(h, ["chief of staff", "chief-of-staff"])
  const strategicOps = hasAny(h, ["strategic operations", "business operations", "commercial strategy", "gtm strategy", "revenue intelligence"])
  const ceoAccess = hasAny(h, ["ceo", "founder", "coo", "executive team", "leadership team"])
  const proxy = hasAny(h, ["trusted proxy", "strategic proxy", "make decisions on her behalf", "make decisions on his behalf", "represent her", "represent him"])
  const tenPlus = /10\+|10 years|ten\+|ten years/.test(h)
  const medicare = hasAny(h, ["medicare advantage", "payer", "health insurance"])
  const ai = hasAny(h, [" ai ", "artificial intelligence", "ai-powered", "emerging technology"])
  const operatingSystems = hasAny(h, ["operating systems", "operating rhythms", "decision cadences", "accountability mechanisms", "prioritize", "prioritization"])
  const biOnly = hasAny(h, ["dashboard developer", "bi analyst", "business intelligence analyst", "report developer"]) && !ceoAccess
  const salesforceAdmin = hasAny(h, ["salesforce admin", "salesforce administrator"])

  if (biOnly || salesforceAdmin) {
    return {
      verdict: "maybe",
      application_roi_tier: "light_application",
      role_fit_score: 62,
      opportunity_quality_score: 55,
      underleveling_risk: "high",
      stretch_risk: "low",
      credential_risk: salesforceAdmin ? "medium" : "low",
      domain_risk: "low",
      pursuit_summary: "Light application at most. The role may match some technical skills, but it appears too narrow to use Sam's strategic operations and executive decision-support strengths.",
      best_positioning_angle: "Only pursue if the role has real leadership access and ownership beyond dashboard or tool administration work.",
      green_flags: ["Some systems, reporting, or operations overlap."],
      red_flags: ["Role appears narrow, execution-only, or tool-admin focused."],
      compounding_gaps: ["Underleveling risk outweighs skill match unless the mandate is broader than written."],
      hard_pass_triggers_fired: [],
      bright_spots: ["Sam can translate data and systems work into leadership-facing operating clarity."],
      gaps_to_address: ["Confirm whether the role has strategic scope and leadership access."],
      comp_opacity_flag: !/\$\d/.test(jdText),
      reasoning: "The role may use Sam's technical skills, but the opportunity quality is limited if it is primarily BI, reporting, or tool administration.",
      application_strategy: "Do not over-invest unless there is evidence of broader strategic ownership, executive access, or operating-system mandate.",
      recommended_resume_bullets: ["Built and owned the commercial operating system integrating NetSuite, HubSpot, Power BI, R, and automation workflows into a single source of truth for sales, forecasting, executive reporting, and board preparation."],
      cover_letter_angle: "If applying, frame Sam as a systems builder who turns reporting into operating clarity, but keep it light.",
      interview_proof_points: ["Commercial operating system", "Power BI and executive reporting", "Automation workflows"],
    }
  }

  const strongShape = chiefOfStaff || strategicOps || operatingSystems
  const stretchHigh = proxy || (chiefOfStaff && tenPlus)
  const credential: Risk = tenPlus ? "medium" : "low"
  const domain: Risk = medicare ? "medium" : "low"
  const fit = strongShape ? (stretchHigh || domain === "medium" || credential === "medium" ? 80 : 88) : 70
  const quality = ceoAccess || chiefOfStaff ? 88 : strongShape ? 80 : 68

  return {
    verdict: strongShape ? "pursue" : "maybe",
    application_roi_tier: strongShape && (ceoAccess || chiefOfStaff) ? "high_touch" : "tailored_application",
    role_fit_score: fit,
    opportunity_quality_score: quality,
    underleveling_risk: "low",
    stretch_risk: stretchHigh ? "high" : strongShape ? "medium" : "low",
    credential_risk: credential,
    domain_risk: domain,
    pursuit_summary: strongShape
      ? "Pursue with a tailored application. The role appears aligned with Sam's operating systems and executive decision-support story, with risk level depending on seniority, formal authority, and domain expectations."
      : "Review carefully. The role may be worth pursuing only if it offers real strategic operating scope and leadership access.",
    best_positioning_angle: "Position Sam as a strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams.",
    green_flags: [
      ...(ceoAccess ? ["Clear leadership access or executive-facing mandate."] : []),
      ...(operatingSystems ? ["Role emphasizes operating systems, prioritization, decision cadence, or execution rhythm."] : []),
      ...(ai ? ["AI is positioned as a practical execution lever."] : []),
    ],
    red_flags: [
      ...(proxy ? ["The role includes CEO-proxy language and may require decision authority Sam has not formally held."] : []),
      ...(tenPlus ? ["The role asks for 10+ years of experience, while Sam has approximately 8 years."] : []),
      ...(medicare ? ["Medicare Advantage or payer operations are specific domains Sam has not worked in directly."] : []),
    ],
    compounding_gaps: [
      ...(proxy && tenPlus && medicare ? ["CEO-proxy expectations, 10+ year screening, and Medicare Advantage domain depth create a real but potentially worthwhile stretch."] : []),
    ],
    hard_pass_triggers_fired: [],
    bright_spots: [
      "Sam built the commercial operating system leadership used for forecasting, pipeline management, executive reporting, and board/investor reporting preparation.",
      "Sam built AI-assisted lead routing and sales dossier workflows that reduced speed-to-first-touch from nearly 48 hours to under 20 hours.",
    ],
    gaps_to_address: [
      ...(proxy ? ["Frame CEO-proxy requirements as an adjacent stretch supported by executive partnership, decision systems, and operating cadence work."] : []),
      ...(tenPlus ? ["Bridge the years-of-experience gap by leading with scope, ownership, and measurable operating impact."] : []),
      ...(medicare ? ["Bridge honestly from healthcare, life sciences, analytics, and complex technical markets into Medicare Advantage."] : []),
    ],
    comp_opacity_flag: !/\$\d/.test(jdText),
    reasoning: "The role appears aligned with Sam's strongest operating systems and executive decision-support proof, but fit depends on the level of formal authority, years-of-experience screening, and domain depth required.",
    application_strategy: "Lead with the Akadeum commercial operating system story, executive decision support, and AI-assisted workflow proof. Bridge stretch honestly without claiming CEO-proxy authority or direct domain experience.",
    recommended_resume_bullets: [
      "Built and owned the commercial operating system integrating NetSuite, HubSpot, Power BI, R, and automation workflows into a single source of truth for sales, forecasting, executive reporting, and board preparation.",
      "Partnered closely with CEO, COO, CFO, and commercial leadership on forecasting, board reporting preparation, pipeline strategy, and investor narratives across approximately ten board and investor reporting cycles.",
      "Developed AI-assisted commercial workflows, including a sales dossier system and intelligent lead routing, that reduced average response time from nearly 48 hours to under 20 hours.",
    ],
    cover_letter_angle: "Write a grounded letter around operating systems, executive clarity, AI-assisted execution, and an honest bridge into the role's domain.",
    interview_proof_points: [
      "Commercial operating system",
      "Executive decision support and board/investor reporting preparation",
      "AI-assisted lead routing and sales dossier workflows",
    ],
  }
}

function normalizeScoreResult(
  raw: Record<string, unknown>,
  jdText: string,
  metadata: { title: string; company: string; role: string },
): ScoreResult {
  const fallback = inferBaseFallback(jdText, metadata)
  const h = haystack(jdText, metadata)

  const result: ScoreResult = {
    verdict: toText(raw.verdict) || fallback.verdict,
    application_roi_tier: toText(raw.application_roi_tier) || fallback.application_roi_tier,
    role_fit_score: clampScore(raw.role_fit_score, fallback.role_fit_score),
    opportunity_quality_score: clampScore(raw.opportunity_quality_score, fallback.opportunity_quality_score),
    underleveling_risk: normalizeRisk(raw.underleveling_risk, fallback.underleveling_risk),
    stretch_risk: normalizeRisk(raw.stretch_risk, fallback.stretch_risk),
    credential_risk: normalizeRisk(raw.credential_risk, fallback.credential_risk),
    domain_risk: normalizeRisk(raw.domain_risk, fallback.domain_risk),
    pursuit_summary: sanitizeProxyClaims(raw.pursuit_summary) || fallback.pursuit_summary,
    best_positioning_angle: sanitizeProxyClaims(raw.best_positioning_angle) || fallback.best_positioning_angle,
    green_flags: sanitizeArray(raw.green_flags).length ? sanitizeArray(raw.green_flags) : fallback.green_flags,
    red_flags: sanitizeArray(raw.red_flags).length ? sanitizeArray(raw.red_flags) : fallback.red_flags,
    compounding_gaps: sanitizeArray(raw.compounding_gaps).length ? sanitizeArray(raw.compounding_gaps) : fallback.compounding_gaps,
    hard_pass_triggers_fired: sanitizeArray(raw.hard_pass_triggers_fired),
    bright_spots: sanitizeArray(raw.bright_spots).length ? sanitizeArray(raw.bright_spots) : fallback.bright_spots,
    gaps_to_address: sanitizeArray(raw.gaps_to_address).length ? sanitizeArray(raw.gaps_to_address) : fallback.gaps_to_address,
    comp_opacity_flag: typeof raw.comp_opacity_flag === "boolean" ? raw.comp_opacity_flag : fallback.comp_opacity_flag,
    reasoning: sanitizeProxyClaims(raw.reasoning) || fallback.reasoning,
    application_strategy: sanitizeProxyClaims(raw.application_strategy) || fallback.application_strategy,
    recommended_resume_bullets: sanitizeArray(raw.recommended_resume_bullets).length ? sanitizeArray(raw.recommended_resume_bullets) : fallback.recommended_resume_bullets,
    cover_letter_angle: sanitizeProxyClaims(raw.cover_letter_angle) || fallback.cover_letter_angle,
    interview_proof_points: sanitizeArray(raw.interview_proof_points).length ? sanitizeArray(raw.interview_proof_points) : fallback.interview_proof_points,
  }

  const chiefOfStaff = hasAny(h, ["chief of staff", "chief-of-staff"])
  const proxy = hasAny(h, ["trusted proxy", "strategic proxy", "make decisions on her behalf", "make decisions on his behalf", "represent her", "represent him"])
  const tenPlus = /10\+|10 years|ten\+|ten years/.test(h)
  const medicare = hasAny(h, ["medicare advantage", "payer", "health insurance"])
  const ceo = h.includes("ceo")
  const biOnly = hasAny(h, ["dashboard developer", "bi analyst", "business intelligence analyst", "report developer"]) && !ceo

  if (chiefOfStaff && proxy && tenPlus && medicare) {
    result.verdict = "pursue"
    result.application_roi_tier = "high_touch"
    result.underleveling_risk = "low"
    result.stretch_risk = "high"
    result.credential_risk = "medium"
    result.domain_risk = "medium"
    result.role_fit_score = 78
    result.opportunity_quality_score = 86
    result.pursuit_summary = "High-touch pursue. This is a credible stretch: the role is strongly aligned with Sam's operating style, but the CEO-proxy mandate, 10+ year preference, and Medicare Advantage domain create real screening and ramp risk."
    result.best_positioning_angle = "Position Sam as a strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams in complex healthcare-adjacent environments, while being honest that the CEO-proxy mandate is a stretch."
    result.reasoning = "The role aligns with Sam's operating systems, executive decision support, and AI-enabled workflow experience, but it is not a clean match. The CEO-proxy mandate, 10+ year preference, and Medicare Advantage domain make it a credible stretch rather than a slam dunk."
    result.application_strategy = "Lead with the Akadeum commercial operating system story, executive decision support, and AI-assisted workflow proof. Bridge the stretch honestly without claiming CEO-proxy authority or direct Medicare Advantage experience."
    result.red_flags = [
      "The role includes CEO-proxy language and may require decision authority Sam has not formally held.",
      "The role asks for 10+ years of experience, while Sam has approximately 8 years.",
      "Medicare Advantage is a specific payer domain Sam has not worked in directly.",
    ]
    result.compounding_gaps = ["CEO-proxy expectations, 10+ year screening, and Medicare Advantage domain depth create a real but potentially worthwhile stretch."]
    result.gaps_to_address = [
      "Frame CEO-proxy requirements as an adjacent stretch supported by executive partnership, decision systems, and operating cadence work.",
      "Bridge the years-of-experience gap by leading with scope, ownership, and measurable operating impact.",
      "Bridge honestly from healthcare, life sciences, analytics, and complex technical markets into Medicare Advantage.",
    ]
    result.hard_pass_triggers_fired = []
  }

  if (biOnly) {
    const under = inferBaseFallback(jdText, metadata)
    return under
  }

  result.hard_pass_triggers_fired = toArray(result.hard_pass_triggers_fired).filter(item => {
    const lower = item.toLowerCase()
    return !lower.includes("10+ years") && !lower.includes("10 years") && !lower.includes("medicare advantage")
  })

  result.green_flags = sanitizeArray(result.green_flags).slice(0, 5)
  result.red_flags = sanitizeArray(result.red_flags).slice(0, 5)
  result.compounding_gaps = sanitizeArray(result.compounding_gaps).slice(0, 3)
  result.bright_spots = sanitizeArray(result.bright_spots).slice(0, 5)
  result.gaps_to_address = sanitizeArray(result.gaps_to_address).slice(0, 5)
  result.recommended_resume_bullets = sanitizeArray(result.recommended_resume_bullets).slice(0, 5)
  result.interview_proof_points = sanitizeArray(result.interview_proof_points).slice(0, 6)
  result.cover_letter_angle = sanitizeProxyClaims(result.cover_letter_angle)

  return result
}

function validateScoreResult(parsed: Record<string, unknown>): string[] {
  return REQUIRED_FIELDS.filter(field => !(field in parsed))
}

async function callOpenRouter(apiKey: string, userPrompt: string, useJsonMode: boolean) {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SCORE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: SCORE_MAX_TOKENS,
      ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENROUTER_API_KEY. Set it in your Vercel project settings." },
      { status: 500 },
    )
  }

  let body: ScoreRequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const jdText = (body.jdText || "").trim()

  if (!jdText) {
    return NextResponse.json({ error: "Job description is empty" }, { status: 400 })
  }

  const metadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  }

  const userPrompt = buildScorePrompt(PROFILE, jdText, metadata)

  try {
    let upstream = await callOpenRouter(apiKey, userPrompt, true)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "")
      if (text.toLowerCase().includes("response_format") || text.toLowerCase().includes("json")) {
        upstream = await callOpenRouter(apiKey, userPrompt, false)
      } else {
        return NextResponse.json(
          { error: `OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}` },
          { status: 502 },
        )
      }
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "")
      return NextResponse.json(
        { error: `OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}` },
        { status: 502 },
      )
    }

    const data = await upstream.json()
    const content = stripJsonFence(data?.choices?.[0]?.message?.content ?? "")

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>
      const missingFields = validateScoreResult(parsed)
      const base = missingFields.length ? inferBaseFallback(jdText, metadata) : parsed
      const result = normalizeScoreResult(base, jdText, metadata)
      return NextResponse.json({ result, fallback_used: missingFields.length > 0 })
    } catch {
      const result = normalizeScoreResult(inferBaseFallback(jdText, metadata), jdText, metadata)
      return NextResponse.json({ result, fallback_used: true })
    }
  } catch {
    const result = normalizeScoreResult(inferBaseFallback(jdText, metadata), jdText, metadata)
    return NextResponse.json({ result, fallback_used: true })
  }
}
