import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { SCORE_SYSTEM_PROMPT, buildScorePrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_SCORE_MODEL || process.env.OPENROUTER_MODEL || "openrouter/free"
const SCORE_MAX_TOKENS = 2200

type ScoreRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
}

const REQUIRED_SCORE_FIELDS = [
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
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim()
  }

  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  return cleaned
}

function validateScoreResult(result: Record<string, unknown>): string[] {
  return REQUIRED_SCORE_FIELDS.filter(field => !(field in result))
}


function toText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function toArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === "string") as string[] : []
}

function normalizeRisk(value: unknown): "low" | "medium" | "high" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium"
}

function raiseRisk(current: unknown, floor: "low" | "medium" | "high"): "low" | "medium" | "high" {
  const rank = { low: 0, medium: 1, high: 2 } as const
  const normalized = normalizeRisk(current)
  return rank[normalized] >= rank[floor] ? normalized : floor
}

function clampScore(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some(needle => haystack.includes(needle))
}

function removeBadRedFlags(flags: string[]): string[] {
  const banned = [
    "no formal people management or leadership access requirements",
    "pure bi or data analyst role with no strategic leadership access",
    "no explicit demand for salesforce or cloud architecture expertise",
    "no indication of formal executive board presence",
    "no formal people management requirement",
    "no salesforce requirement",
    "no cloud architecture requirement",
  ]

  return flags.filter(flag => {
    const normalized = flag.toLowerCase().replace(/\s+/g, " ").trim()
    return !banned.some(b => normalized.includes(b))
  })
}

function normalizeForDedupe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,;:!?]/g, "")
    .replace(/ceo[- ]?proxy/g, "ceo proxy")
    .replace(/10\+? years?/g, "10 years")
    .replace(/approximately 8 years/g, "8 years")
    .replace(/medicare advantage|payer domain|health insurance/g, "medicare")
    .replace(/\s+/g, " ")
    .trim()
}

function pushUnique(items: string[], item: string): string[] {
  const incoming = normalizeForDedupe(item)
  const exists = items.some(existing => {
    const normalized = normalizeForDedupe(existing)
    return normalized === incoming || normalized.includes(incoming) || incoming.includes(normalized)
  })
  return exists ? items : [...items, item]
}

function sanitizeProxyClaims(text: unknown): string {
  return toText(text)
    .replace(/act as a CEO proxy/gi, "support CEO-level decision-making")
    .replace(/acted as a CEO proxy/gi, "supported CEO-level decision-making")
    .replace(/operated as a CEO proxy/gi, "operated as an executive partner")
    .replace(/serve as a CEO proxy/gi, "support CEO-level decision-making")
    .replace(/served as a CEO proxy/gi, "supported CEO-level decision-making")
    .replace(/CEO proxy/gi, "executive partner")
    .replace(/trusted proxy/gi, "trusted operating partner")
    .replace(/strategic proxy/gi, "strategic operating partner")
}

function sanitizeArray(items: string[]): string[] {
  return items.map(item => sanitizeProxyClaims(item))
}

function normalizeScoreResult(
  input: Record<string, unknown>,
  jdText: string,
  metadata: { title: string; company: string; role: string }
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...input }
  const haystack = `${metadata.title} ${metadata.company} ${metadata.role}\n${jdText}`.toLowerCase()

  const ceoProxySignal = hasAny(haystack, [
    "trusted proxy",
    "strategic proxy",
    "ceo's trusted proxy",
    "ceo’s trusted proxy",
    "represent her",
    "represent him",
    "make decisions on her behalf",
    "make decisions on his behalf",
    "decision-making mandate",
    "high-stakes rooms",
  ])

  const chiefOfStaffSignal = hasAny(haystack, ["chief of staff", "chief-of-staff"])
  const tenPlusSignal = /\b10\+?\s*(?:years|yrs)\b/i.test(haystack)
  const pedigreeSignal = hasAny(haystack, ["consulting", "investment banking", "mba", "mckinsey", "bain", "bcg"])
  const medicareSignal = hasAny(haystack, [
    "medicare advantage",
    "payer",
    "health insurance",
    "cms",
    "risk adjustment",
    "star ratings",
  ])
  const seniorExecSignal = chiefOfStaffSignal || hasAny(haystack, ["reports to the ceo", "ceo needs", "executive team", "board"])

  result.underleveling_risk = seniorExecSignal ? "low" : normalizeRisk(result.underleveling_risk)
  result.stretch_risk = normalizeRisk(result.stretch_risk)
  result.credential_risk = normalizeRisk(result.credential_risk)
  result.domain_risk = normalizeRisk(result.domain_risk)

  if (ceoProxySignal || chiefOfStaffSignal) {
    result.stretch_risk = raiseRisk(result.stretch_risk, ceoProxySignal ? "high" : "medium")
  }

  if (tenPlusSignal || pedigreeSignal) {
    result.credential_risk = raiseRisk(result.credential_risk, "medium")
  }

  if (medicareSignal) {
    result.domain_risk = raiseRisk(result.domain_risk, "medium")
  }

  let redFlags = removeBadRedFlags(toArray(result.red_flags))
  let gaps = toArray(result.gaps_to_address)
  let compounding = toArray(result.compounding_gaps)

  if (ceoProxySignal) {
    redFlags = pushUnique(redFlags, "The role includes CEO-proxy language and may require decision authority Sam has not formally held.")
    gaps = pushUnique(gaps, "Frame CEO-proxy requirements as an adjacent stretch supported by executive partnership, decision systems, and operating cadence work.")
  }

  if (tenPlusSignal) {
    redFlags = pushUnique(redFlags, "The role asks for 10+ years of experience, while Sam has approximately 8 years.")
    gaps = pushUnique(gaps, "Bridge the years-of-experience gap by leading with scope, ownership, and measurable operating impact.")
  }

  if (pedigreeSignal) {
    redFlags = pushUnique(redFlags, "The role may favor traditional consulting, finance, MBA, or prior Chief of Staff credentials.")
    gaps = pushUnique(gaps, "Position the non-traditional path as operating depth rather than a lack of pedigree.")
  }

  if (medicareSignal) {
    redFlags = pushUnique(redFlags, "Medicare Advantage is a specific payer domain Sam has not worked in directly.")
    gaps = pushUnique(gaps, "Bridge honestly from healthcare, life sciences, analytics, and complex technical markets into Medicare Advantage.")
  }

  const isCloverStyleStretch = (ceoProxySignal || chiefOfStaffSignal) && tenPlusSignal && medicareSignal

  if (isCloverStyleStretch) {
    // For CEO-facing Medicare Advantage Chief of Staff roles, overwrite noisy model fields.
    // This keeps the triage fast while preventing score/reasoning contradictions.
    redFlags = [
      "The role includes CEO-proxy language and may require decision authority Sam has not formally held.",
      "The role asks for 10+ years of experience, while Sam has approximately 8 years.",
      "Medicare Advantage is a specific payer domain Sam has not worked in directly.",
    ]

    gaps = [
      "Frame CEO-proxy requirements as an adjacent stretch supported by executive partnership, decision systems, and operating cadence work.",
      "Bridge the years-of-experience gap by leading with scope, ownership, and measurable operating impact.",
      "Bridge honestly from healthcare, life sciences, analytics, and complex technical markets into Medicare Advantage.",
    ]

    compounding = [
      "CEO-proxy expectations, 10+ year screening, and Medicare Advantage domain depth create a real but potentially worthwhile stretch.",
    ]

    result.role_fit_score = clampScore(result.role_fit_score, 78, 82, 82)
    result.opportunity_quality_score = clampScore(result.opportunity_quality_score, 86, 90, 88)

    result.verdict = "pursue"
    result.application_roi_tier = "high_touch"
    result.underleveling_risk = "low"
    result.stretch_risk = "high"
    result.credential_risk = "medium"
    result.domain_risk = "medium"
    result.pursuit_summary =
      "High-touch pursue. This is a credible stretch: the role is strongly aligned with Sam's operating style, but the CEO-proxy mandate, 10+ year preference, and Medicare Advantage domain create real screening and ramp risk."
    result.reasoning =
      "The role aligns strongly with Sam's operating systems, executive decision support, and AI-enabled workflow experience, but it is not a clean match. The CEO-proxy mandate, 10+ year preference, and Medicare Advantage domain make it a credible stretch rather than a slam dunk."
    result.application_strategy =
      "Lead with the Akadeum commercial operating system story, executive decision support, and AI-assisted workflow proof. Bridge the stretch honestly without claiming CEO-proxy authority or direct Medicare Advantage experience."
    result.cover_letter_angle =
      "Write a grounded letter around operating systems, executive clarity, AI-assisted execution, and an honest bridge from healthcare/life sciences into Medicare Advantage. Do not mention the 8 vs 10 year gap directly."
  } else if (!toText(result.pursuit_summary)) {
    result.pursuit_summary = "Review carefully. The role may be worth pursuing, but the fit depends on level, mandate, leadership access, and whether Sam's operating systems story is central to the role."
  }

  result.red_flags = redFlags
  result.gaps_to_address = gaps
  result.compounding_gaps = compounding

  if ((ceoProxySignal || chiefOfStaffSignal) && tenPlusSignal && medicareSignal) {
    result.best_positioning_angle =
      "Position Sam as a strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams in complex healthcare-adjacent environments, while being honest that the CEO-proxy mandate is a stretch."
  } else {
    result.best_positioning_angle = sanitizeProxyClaims(result.best_positioning_angle) ||
      "Strategic operator who builds operating systems, decision infrastructure, and executive clarity for leadership teams."
  }

  result.reasoning = sanitizeProxyClaims(result.reasoning) || toText(result.pursuit_summary)
  result.application_strategy = sanitizeProxyClaims(result.application_strategy) ||
    "Lead with operating systems, executive decision support, and measurable cross-functional execution. Be direct about any seniority or domain stretch."
  result.cover_letter_angle = sanitizeProxyClaims(result.cover_letter_angle)
  result.interview_proof_points = sanitizeArray(toArray(result.interview_proof_points))
  result.green_flags = sanitizeArray(toArray(result.green_flags))
  result.bright_spots = sanitizeArray(toArray(result.bright_spots))
  result.recommended_resume_bullets = sanitizeArray(toArray(result.recommended_resume_bullets))

  return result
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
      { status: 500 }
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

  let upstream: Response

  try {
    upstream = await callOpenRouter(apiKey, userPrompt, true)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "")

      // Some OpenRouter models do not support JSON mode. Retry without it.
      if (text.toLowerCase().includes("response_format") || text.toLowerCase().includes("json")) {
        upstream = await callOpenRouter(apiKey, userPrompt, false)
      } else {
        return NextResponse.json(
          { error: `OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}` },
          { status: 502 }
        )
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Could not reach OpenRouter. Check your connection and try again." },
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")

    return NextResponse.json(
      { error: `OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}` },
      { status: 502 }
    )
  }

  const data = await upstream.json()
  const content = stripJsonFence(data?.choices?.[0]?.message?.content ?? "")

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const missingFields = validateScoreResult(parsed)

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `The model omitted required scoring fields: ${missingFields.join(", ")}. Try again or use a stronger model for OPENROUTER_SCORE_MODEL.`,
          raw: content,
        },
        { status: 502 }
      )
    }

    const result = normalizeScoreResult(parsed, jdText, metadata)

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json(
      { error: "The model's response wasn't valid JSON. Try again or use a stronger scoring model.", raw: content },
      { status: 502 }
    )
  }
}
