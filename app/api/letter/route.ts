import { NextRequest, NextResponse } from "next/server"
import {
  EVIDENCE,
  DEFAULT_PRIMARY_EVIDENCE,
  DEFAULT_SUPPORTING_EVIDENCE,
  getEvidence,
  isEvidenceId,
  type EvidenceId,
} from "@/lib/evidence"
import {
  LETTER_PLAN_SYSTEM_PROMPT,
  LETTER_REWRITE_SYSTEM_PROMPT,
  buildLetterPlanPrompt,
  buildLetterRewritePrompt,
} from "@/lib/prompts"
import {
  buildControlledCoverLetterDraft,
  hasAiSignal,
  hasGtmSignal,
  hasMedicareOrPayerSignal,
  hasRevOpsHardGapSignal,
  hasAuthorityGapSignal,
  selectedEvidenceIdsForPlan,
  type LetterMetadata,
  type LetterPlan,
} from "@/lib/letterTemplates"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const LETTER_MODEL = process.env.OPENROUTER_LETTER_MODEL || "openai/gpt-4.1-mini"
const PLAN_MODEL = process.env.OPENROUTER_PLAN_MODEL || process.env.OPENROUTER_LETTER_MODEL || "openai/gpt-4.1-mini"

type LetterRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
  result?: object
}

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const HARD_BANNED_PHRASES = [
  "what stands out to me",
  "this role caught my attention",
  "trusted proxy",
  "strategic proxy",
  "ceo proxy",
  "act as a ceo proxy",
  "operated as a ceo proxy",
  "served as a ceo proxy",
  "i am writing to express my interest",
  "i am excited to apply",
  "dear hiring manager",
  "my skills and experience align perfectly",
  "i believe i would be a great fit",
  "throughout my career",
  "i bring a unique blend",
  "i have successfully led",
  "across clinical, operations, finance, and growth",
  "led cross-functional initiatives across clinical",
]

const PLACEHOLDER_PATTERNS = [
  /\[[^\]]+\]/i,
  /\bcompany name\b/i,
  /\brelevant field\b/i,
  /\bprevious company\b/i,
  /\bspecific achievement\b/i,
  /\bcompany mission\b/i,
]

const SOFT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bactionable insights\b/gi, "clear recommendations"],
  [/\bclear, clear recommendations\b/gi, "clear recommendations"],
  [/\bbetter-clearer decisions\b/gi, "better, clearer decisions"],
  [/\bclear, clearer decisions\b/gi, "clearer decisions"],
  [/\binformed decisions\b/gi, "clearer decisions"],
  [/\bdata-driven decisions\b/gi, "clearer decisions"],
  [/\bstrategic outcomes\b/gi, "operating decisions"],
  [/\bdrive results\b/gi, "move the work forward"],
  [/\benhance operational efficiency\b/gi, "make execution cleaner"],
  [/\bcontribute effectively\b/gi, "be useful quickly"],
  [/\btangible outcomes\b/gi, "real outcomes"],
  [/\bmeasurable impact\b/gi, "useful results"],
  [/\boperational lever\b/gi, "practical tool"],
  [/\bmultiply impact\b/gi, "improve execution"],
  [/\bleveraging AI\b/gi, "using AI"],
  [/\btrusted partner to the CEO\b/gi, "trusted operating partner to leadership"],
  [/\bcreate structure from chaos\b/gi, "create structure where the path is unclear"],
  [/\bI look forward to the possibility of discussing[^.]*\./gi, ""],
  [/\bI look forward to the opportunity[^.]*\./gi, ""],
  [/\bI thrive in ambiguity[^.]*\./gi, ""],
  [/\bI thrive in environments[^.]*\./gi, ""],
  [/\bI am eager to apply[^.]*\./gi, ""],
]

function normalizePlainText(text: string): string {
  let cleaned = text
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2011/g, "-")
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^```(?:text|json)?/i, "")
    .replace(/```$/i, "")

  for (const [pattern, replacement] of SOFT_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  return cleaned
    .replace(/better-clearer/gi, "better, clearer")
    .replace(/clear, clear/gi, "clear")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

function stripJsonFence(content: string): string {
  let cleaned = content.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim()
  }
  return cleaned
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function finalizeLetter(text: string): string {
  let cleaned = normalizePlainText(text)

  cleaned = cleaned.replace(/^Dear [^\n]+\n+/i, "")
  cleaned = cleaned.replace(/^Sam(?: Dickinson)?\s*\n+/i, "")
  cleaned = cleaned.replace(/\bBest regards,?\s*$/i, "")
  cleaned = cleaned.replace(/\bSincerely,?\s*$/i, "")
  cleaned = cleaned.replace(/\bI look forward to the opportunity[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI look forward to the possibility[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI thrive in ambiguity[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI thrive in environments[^.]*\./gi, "")
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim()
  cleaned = cleaned.replace(/(?:\n\s*(?:Best regards,?|Sincerely,?)\s*)?(?:\n\s*(?:Sam Dickinson|Sam)\s*)+$/i, "").trim()

  return `${cleaned}\n\nSam Dickinson`
}

function findHardBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase()
  return HARD_BANNED_PHRASES.find(phrase => lower.includes(phrase)) || null
}

function findPlaceholder(text: string): string | null {
  const match = PLACEHOLDER_PATTERNS.find(pattern => pattern.test(text))
  return match ? match.toString() : null
}

function hasUnsupportedSalesforceClaim(text: string): boolean {
  const lower = text.toLowerCase()
  if (!lower.includes("salesforce")) return false
  const allowed = [
    "not owned salesforce",
    "not owned salesforce architecture",
    "not position myself as a traditional salesforce-first",
    "not a salesforce-first",
    "do not position myself as a traditional salesforce-first",
  ]
  if (allowed.some(phrase => lower.includes(phrase))) return false
  return /\b(owned|own|built|rebuilt|architected|administered|managed)\b[^.\n]*\bsalesforce\b|\bsalesforce\b[^.\n]*\b(architect|admin|administrator|architecture)\b/i.test(text)
}

function findUnsupportedClaim(text: string): string | null {
  const unsupportedPatterns: Array<[RegExp, string]> = [
    [/\bled cross-functional initiatives across clinical/i, "unsupported clinical cross-functional claim"],
    [/clinical, operations, finance, and growth/i, "parrots exact function list as Sam experience"],
    [/\bled .*clinical.*operations.*finance.*growth/i, "claims leadership across functions Sam has not led"],
    [/\bowned .*medicare advantage/i, "claims direct Medicare Advantage ownership"],
    [/\bled .*medicare advantage/i, "claims direct Medicare Advantage leadership"],
    [/\bserved .*board/i, "possible board attendance/presentation claim"],
    [/\bpresented .*board/i, "board presentation claim"],
    [/\bmanaged account executives/i, "formal sales management claim"],
    [/\bmanaged sales/i, "formal sales management claim"],
    [/\bowned .*deal desk/i, "claims formal deal desk ownership"],
    [/\bled .*deal desk/i, "claims formal deal desk ownership"],
    [/\bowned .*commission/i, "claims commission ownership"],
    [/\bowned .*quote-to-close/i, "claims quote-to-close ownership"],
    [/\baws\b/i, "possible unsupported AWS claim"],
  ]

  if (hasUnsupportedSalesforceClaim(text)) return "possible unsupported Salesforce architecture/admin claim"
  const match = unsupportedPatterns.find(([pattern]) => pattern.test(text))
  return match ? match[1] : null
}

function assessLetter(text: string): { ok: boolean; reason?: string } {
  const placeholder = findPlaceholder(text)
  if (placeholder) return { ok: false, reason: `placeholder pattern ${placeholder}` }

  const banned = findHardBannedPhrase(text)
  if (banned) return { ok: false, reason: `banned phrase "${banned}"` }

  const unsupported = findUnsupportedClaim(text)
  if (unsupported) return { ok: false, reason: unsupported }

  if (/^\s*Dear\b/i.test(text)) return { ok: false, reason: "uses salutation" }
  if (!/\n\s*Sam Dickinson\s*$/i.test(text)) return { ok: false, reason: "missing Sam Dickinson signature" }

  const wc = wordCount(text.replace(/\n\s*Sam Dickinson\s*$/i, ""))
  if (wc < 240) return { ok: false, reason: `too short (${wc} words)` }
  if (wc > 800) return { ok: false, reason: `too long (${wc} words)` }

  return { ok: true }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  useJsonMode = false,
) {
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "")
    throw new Error(`OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}`)
  }

  const data = await upstream.json()
  const choice = data?.choices?.[0]

  return {
    content: normalizePlainText(choice?.message?.content ?? ""),
    finishReason: choice?.finish_reason as string | undefined,
  }
}

function makeDefaultPlan(jdText: string, metadata: LetterMetadata, scoreResult: Record<string, unknown> = {}): LetterPlan {
  const primary: EvidenceId = DEFAULT_PRIMARY_EVIDENCE
  let supporting: EvidenceId = DEFAULT_SUPPORTING_EVIDENCE

  if (hasRevOpsHardGapSignal(jdText, metadata)) supporting = "revOpsSalesforceDealDeskBridge"
  else if (hasAuthorityGapSignal(jdText, metadata) || String(scoreResult.authority_risk || "").toLowerCase() === "high") supporting = "authorityStretchBridge"
  else if (hasGtmSignal(jdText) && !hasAiSignal(jdText)) supporting = "icpPipelineRedesign"

  if (hasMedicareOrPayerSignal(jdText, metadata)) {
    return {
      primary_evidence_id: "commercialOperatingSystem",
      supporting_evidence_id: hasAiSignal(jdText) ? "aiAssistedWorkflows" : "executiveDecisionSupport",
      domain_bridge: "Bridge honestly from healthcare, life sciences, and complex technical markets. Do not claim direct Medicare Advantage or payer experience.",
      gap_strategy: "Do not mention 8 vs 10 years directly. Frame the stretch through operating scope, executive-facing work, and systems Sam has actually built.",
      must_not_claim: [
        "CEO proxy experience",
        "direct Medicare Advantage experience",
        "payer operations experience",
        "clinical operations leadership",
        "board attendance or presentation",
        "formal sales management",
      ],
      tone_notes: ["direct", "grounded", "operator", "honest about stretch without apologizing"],
    }
  }

  return {
    primary_evidence_id: primary,
    supporting_evidence_id: supporting,
    domain_bridge: "Bridge any domain gap honestly from Sam's healthcare, life sciences, commercial strategy, analytics, and technical-market experience.",
    gap_strategy: "Lead with operating scope and evidence. Do not over-explain gaps unless they are central to the role.",
    must_not_claim: [
      "CEO proxy experience",
      "board presentation",
      "formal sales management",
      "direct Salesforce architecture or admin ownership",
      "deal desk ownership",
      "AWS expertise",
    ],
    tone_notes: ["clear", "specific", "practical", "not generic"],
  }
}

function validatePlan(raw: unknown, jdText: string, metadata: LetterMetadata, scoreResult: Record<string, unknown>): LetterPlan {
  const fallback = makeDefaultPlan(jdText, metadata, scoreResult)
  const obj = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {}

  const primary = isEvidenceId(obj.primary_evidence_id) ? obj.primary_evidence_id : fallback.primary_evidence_id
  const supporting = isEvidenceId(obj.supporting_evidence_id) && obj.supporting_evidence_id !== primary
    ? obj.supporting_evidence_id
    : fallback.supporting_evidence_id

  const plan: LetterPlan = {
    opening_thesis: typeof obj.opening_thesis === "string" && obj.opening_thesis.trim() ? obj.opening_thesis.trim() : fallback.opening_thesis,
    primary_evidence_id: primary,
    supporting_evidence_id: supporting,
    domain_bridge: typeof obj.domain_bridge === "string" && obj.domain_bridge.trim() ? obj.domain_bridge.trim() : fallback.domain_bridge,
    gap_strategy: typeof obj.gap_strategy === "string" && obj.gap_strategy.trim() ? obj.gap_strategy.trim() : fallback.gap_strategy,
    must_not_claim: Array.isArray(obj.must_not_claim) ? obj.must_not_claim.map(String).filter(Boolean) : fallback.must_not_claim,
    tone_notes: Array.isArray(obj.tone_notes) ? obj.tone_notes.map(String).filter(Boolean) : fallback.tone_notes,
  }

  if (hasMedicareOrPayerSignal(jdText, metadata)) {
    const forced = makeDefaultPlan(jdText, metadata, scoreResult)
    plan.primary_evidence_id = "commercialOperatingSystem"
    plan.supporting_evidence_id = hasAiSignal(jdText) ? "aiAssistedWorkflows" : forced.supporting_evidence_id
    plan.domain_bridge = forced.domain_bridge
    plan.gap_strategy = forced.gap_strategy
    plan.must_not_claim = forced.must_not_claim
  }

  if (hasRevOpsHardGapSignal(jdText, metadata)) {
    plan.supporting_evidence_id = "revOpsSalesforceDealDeskBridge"
    plan.must_not_claim = Array.from(new Set([...(plan.must_not_claim || []), "Salesforce architecture ownership", "deal desk ownership", "commission ownership"]))
  }

  if (hasAuthorityGapSignal(jdText, metadata) || String(scoreResult.authority_risk || "").toLowerCase() === "high") {
    plan.supporting_evidence_id = "authorityStretchBridge"
    plan.must_not_claim = Array.from(new Set([...(plan.must_not_claim || []), "formal EVP authority", "Deputy COO authority", "department-leader accountability authority"]))
  }

  return plan
}

async function generatePlan(
  apiKey: string,
  jdText: string,
  scoreResult: Record<string, unknown>,
  metadata: LetterMetadata,
): Promise<LetterPlan> {
  const evidenceCatalog = Object.values(EVIDENCE)
  const userPrompt = buildLetterPlanPrompt(jdText, scoreResult, evidenceCatalog, metadata)

  try {
    const result = await callOpenRouter(
      apiKey,
      PLAN_MODEL,
      [
        { role: "system", content: LETTER_PLAN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      1000,
      0.1,
      true,
    )
    const parsed = JSON.parse(stripJsonFence(result.content))
    return validatePlan(parsed, jdText, metadata, scoreResult)
  } catch {
    return makeDefaultPlan(jdText, metadata, scoreResult)
  }
}

async function polishControlledDraft(
  apiKey: string,
  jdText: string,
  scoreResult: Record<string, unknown>,
  plan: LetterPlan,
  controlledDraft: string,
  metadata: LetterMetadata,
): Promise<string> {
  const selectedEvidence = getEvidence(selectedEvidenceIdsForPlan(plan, jdText, metadata))
  const prompt = buildLetterRewritePrompt({
    jdText,
    scoreResult,
    plan,
    selectedEvidence,
    controlledDraft,
    metadata,
  })

  const first = await callOpenRouter(
    apiKey,
    LETTER_MODEL,
    [
      { role: "system", content: LETTER_REWRITE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    3200,
    0.2,
    false,
  )

  let combined = first.content

  if (first.finishReason === "length") {
    const next = await callOpenRouter(
      apiKey,
      LETTER_MODEL,
      [
        {
          role: "system",
          content:
            "Continue the unfinished cover letter. Do not restart. Do not add new claims. Finish naturally and end with Sam Dickinson on its own line.",
        },
        { role: "user", content: `Continue exactly from this unfinished letter and finish it.\n\n${combined}` },
      ],
      1600,
      0.15,
      false,
    )
    combined = `${combined}${combined.endsWith(" ") || next.content.startsWith(" ") ? "" : " "}${next.content}`
  }

  return finalizeLetter(combined)
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENROUTER_API_KEY. Set it in your Vercel project settings." },
      { status: 500 },
    )
  }

  let body: LetterRequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const jdText = (body.jdText || "").trim()

  if (!jdText || !body.result) {
    return NextResponse.json({ error: "Missing job description or score result" }, { status: 400 })
  }

  const metadata: LetterMetadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  }

  const scoreResult = body.result as Record<string, unknown>
  const plan = await generatePlan(apiKey, jdText, scoreResult, metadata)
  const controlledDraft = finalizeLetter(buildControlledCoverLetterDraft({ jdText, metadata, scoreResult, plan }))
  const controlledAssessment = assessLetter(controlledDraft)

  try {
    const polished = await polishControlledDraft(apiKey, jdText, scoreResult, plan, controlledDraft, metadata)
    const assessment = assessLetter(polished)

    if (assessment.ok) {
      return NextResponse.json({ letter: polished, plan, controlled_draft_used: false })
    }

    return NextResponse.json({
      letter: controlledAssessment.ok ? controlledDraft : finalizeLetter(controlledDraft),
      plan,
      controlled_draft_used: true,
      fallback_reason: assessment.reason,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Polish step failed."
    return NextResponse.json({
      letter: controlledAssessment.ok ? controlledDraft : finalizeLetter(controlledDraft),
      plan,
      controlled_draft_used: true,
      fallback_reason: message,
    })
  }
}
