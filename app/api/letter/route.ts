import { NextRequest, NextResponse } from "next/server"
import { EVIDENCE, DEFAULT_PRIMARY_EVIDENCE, DEFAULT_SUPPORTING_EVIDENCE, getEvidence, isEvidenceId, type EvidenceId } from "@/lib/evidence"
import { LETTER_PLAN_SYSTEM_PROMPT, LETTER_DRAFT_SYSTEM_PROMPT, buildLetterPlanPrompt, buildLetterDraftPrompt } from "@/lib/prompts"

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

type LetterPlan = {
  opening_thesis: string
  primary_evidence_id: EvidenceId
  supporting_evidence_id: EvidenceId
  domain_bridge: string
  gap_strategy: string
  must_not_claim: string[]
  tone_notes: string[]
}

const HARD_BANNED_PHRASES = [
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
  "i thrive in environments",
  "i look forward to",
  "presents a unique opportunity",
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
  [/\bdata-driven systems\b/gi, "operating systems"],
  [/\bstrategic outcomes\b/gi, "operating decisions"],
  [/\bdrive results\b/gi, "move the work forward"],
  [/\benhance operational efficiency\b/gi, "make execution cleaner"],
  [/\bcontribute effectively\b/gi, "be useful quickly"],
  [/\btangible outcomes\b/gi, "real outcomes"],
  [/\bmeasurable impact\b/gi, "useful results"],
  [/\boperational lever\b/gi, "practical tool"],
  [/\boperational leverage\b/gi, "operating leverage"],
  [/\bmultiply impact\b/gi, "improve execution"],
  [/\bleveraging AI\b/gi, "using AI"],
  [/\btrusted partner to the CEO\b/gi, "trusted operating partner to leadership"],
  [/\bas a trusted partner to the CEO\b/gi, "as a trusted operating partner to leadership"],
  [/\bsupport the CEO and the broader organization\b/gi, "support leadership and the broader organization"],
  [/\bcreate structure from chaos\b/gi, "create structure where the path is unclear"],
  [/\bturn ambiguity into execution\b/gi, "turn ambiguity into clearer priorities and action"],
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

  cleaned = cleaned
    .replace(/better-clearer/gi, "better, clearer")
    .replace(/clear, clear/gi, "clear")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")

  return cleaned.trim()
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

  // Remove common cover-letter wrapping the model sometimes adds.
  cleaned = cleaned.replace(/^Dear [^\n]+\n+/i, "")
  cleaned = cleaned.replace(/^Sam(?: Dickinson)?\s*\n+/i, "")
  cleaned = cleaned.replace(/\bBest regards,?\s*$/i, "")
  cleaned = cleaned.replace(/\bSincerely,?\s*$/i, "")

  // Remove generic closing sentences that make the letter sound templated.
  cleaned = cleaned.replace(/\bI look forward to the opportunity[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI look forward to the possibility[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI thrive in ambiguity[^.]*\./gi, "")
  cleaned = cleaned.replace(/\bI thrive in environments[^.]*\./gi, "")

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim()

  // Collapse any model-generated duplicate signatures, including "Sam Dickinson" followed by "Sam".
  cleaned = cleaned.replace(/(?:\n\s*(?:Best regards,?|Sincerely,?)\s*)?(?:\n\s*(?:Sam Dickinson|Sam)\s*)+$/i, "").trim()

  return `${cleaned}\n\nSam`
}

function findHardBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase()
  return HARD_BANNED_PHRASES.find(phrase => lower.includes(phrase)) || null
}

function findPlaceholder(text: string): string | null {
  const match = PLACEHOLDER_PATTERNS.find(pattern => pattern.test(text))
  return match ? match.toString() : null
}

function findUnsupportedClaim(text: string): string | null {
  const unsupportedPatterns: Array<[RegExp, string]> = [
    [/\bled cross-functional initiatives across clinical/i, "unsupported clinical cross-functional claim"],
    [/clinical, operations, finance, and growth/i, "parrots exact Clover function list as Sam experience"],
    [/\bled .*clinical.*operations.*finance.*growth/i, "claims leadership across Clover-specific functions"],
    [/\bowned .*medicare advantage/i, "claims direct Medicare Advantage ownership"],
    [/\bled .*medicare advantage/i, "claims direct Medicare Advantage leadership"],
    [/\bserved .*board/i, "possible board attendance/presentation claim"],
    [/\bpresented .*board/i, "board presentation claim"],
    [/\bmanaged account executives/i, "formal sales management claim"],
    [/\bmanaged sales/i, "formal sales management claim"],
    [/\bsalesforce\b/i, "possible unsupported Salesforce claim"],
    [/\baws\b/i, "possible unsupported AWS claim"],
  ]

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
  if (!/\n\s*Sam\s*$/i.test(text)) return { ok: false, reason: "missing Sam signature" }

  const wc = wordCount(text.replace(/\n\s*Sam\s*$/i, ""))
  if (wc < 300) return { ok: false, reason: `too short (${wc} words)` }
  if (wc > 750) return { ok: false, reason: `too long (${wc} words)` }

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

function hasMedicareCosSignal(jdText: string, metadata: { title: string; company: string; role: string }): boolean {
  const h = `${metadata.title} ${metadata.company} ${metadata.role}\n${jdText}`.toLowerCase()
  return h.includes("chief of staff") && h.includes("medicare advantage")
}

function hasAiSignal(jdText: string): boolean {
  const h = jdText.toLowerCase()
  return h.includes(" ai ") || h.includes("artificial intelligence") || h.includes("ai-powered") || h.includes("emerging technology")
}

function hasGtmSignal(jdText: string): boolean {
  const h = jdText.toLowerCase()
  return h.includes("gtm") || h.includes("go-to-market") || h.includes("pipeline") || h.includes("commercial") || h.includes("revenue")
}

function makeDefaultPlan(
  jdText: string,
  metadata: { title: string; company: string; role: string },
): LetterPlan {
  const company = metadata.company.trim() || "the company"
  const primary: EvidenceId = DEFAULT_PRIMARY_EVIDENCE
  const supporting: EvidenceId = hasGtmSignal(jdText) && !hasAiSignal(jdText) ? "icpPipelineRedesign" : DEFAULT_SUPPORTING_EVIDENCE

  if (hasMedicareCosSignal(jdText, metadata)) {
    return {
      opening_thesis: `${company} is looking for more than an advisory Chief of Staff. The role needs someone who can create operating rhythm, clarify priorities, and help leadership act as the Medicare Advantage business scales.`,
      primary_evidence_id: "commercialOperatingSystem",
      supporting_evidence_id: "aiAssistedWorkflows",
      domain_bridge: "Sam has not worked directly in Medicare Advantage, but he has worked across healthcare, life sciences, and complex technical markets and can bridge honestly from that experience.",
      gap_strategy: "Do not mention 8 vs 10 years directly. Frame the stretch through operating scope, executive-facing work, and systems Sam has actually built.",
      must_not_claim: [
        "CEO proxy experience",
        "direct Medicare Advantage experience",
        "clinical operations leadership",
        "board attendance or presentation",
        "formal sales management",
      ],
      tone_notes: ["direct", "grounded", "operator", "honest about stretch without apologizing"],
    }
  }

  return {
    opening_thesis: `${company} appears to need someone who can bring structure to ambiguity, improve decision flow, and turn operating signals into clearer priorities.`,
    primary_evidence_id: primary,
    supporting_evidence_id: supporting,
    domain_bridge: "Bridge any domain gap honestly from Sam's healthcare, life sciences, commercial strategy, analytics, and technical-market experience.",
    gap_strategy: "Lead with operating scope and evidence. Do not over-explain gaps unless they are central to the role.",
    must_not_claim: ["CEO proxy experience", "board presentation", "formal sales management", "direct Salesforce or AWS expertise"],
    tone_notes: ["clear", "specific", "practical", "not generic"],
  }
}

function validatePlan(raw: unknown, jdText: string, metadata: { title: string; company: string; role: string }): LetterPlan {
  const fallback = makeDefaultPlan(jdText, metadata)
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

  if (hasMedicareCosSignal(jdText, metadata)) {
    plan.primary_evidence_id = "commercialOperatingSystem"
    plan.supporting_evidence_id = "aiAssistedWorkflows"
    plan.domain_bridge = fallback.domain_bridge
    plan.gap_strategy = fallback.gap_strategy
    plan.must_not_claim = fallback.must_not_claim
  }

  return plan
}

async function generatePlan(
  apiKey: string,
  jdText: string,
  scoreResult: object,
  metadata: { title: string; company: string; role: string },
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
      1200,
      0.1,
      true,
    )
    const parsed = JSON.parse(stripJsonFence(result.content))
    return validatePlan(parsed, jdText, metadata)
  } catch {
    return makeDefaultPlan(jdText, metadata)
  }
}

async function generateDraft(
  apiKey: string,
  jdText: string,
  scoreResult: object,
  plan: LetterPlan,
  metadata: { title: string; company: string; role: string },
  retryReason?: string,
): Promise<string> {
  const selectedEvidence = getEvidence([plan.primary_evidence_id, plan.supporting_evidence_id, "healthcareLifeSciencesBridge"])
  const basePrompt = buildLetterDraftPrompt(jdText, scoreResult, plan, selectedEvidence, metadata)
  const retryInstruction = retryReason
    ? `\n\nThe previous attempt failed this quality check: ${retryReason}. Write a fresh version from the approved plan and evidence. Do not reuse the failed draft.`
    : ""

  const first = await callOpenRouter(
    apiKey,
    LETTER_MODEL,
    [
      { role: "system", content: LETTER_DRAFT_SYSTEM_PROMPT },
      { role: "user", content: `${basePrompt}${retryInstruction}` },
    ],
    4500,
    0.35,
    false,
  )

  let combined = first.content
  let finishReason = first.finishReason

  for (let attempt = 0; finishReason === "length" && attempt < 2; attempt += 1) {
    const next = await callOpenRouter(
      apiKey,
      LETTER_MODEL,
      [
        {
          role: "system",
          content:
            "Continue the unfinished cover letter. Do not restart. Do not repeat earlier sentences. Keep the same voice. Finish naturally and end with Sam on its own line. Use only the already-approved evidence.",
        },
        { role: "user", content: `Continue exactly from this unfinished letter and finish it.\n\n${combined}` },
      ],
      2000,
      0.25,
      false,
    )
    combined = `${combined}${combined.endsWith(" ") || next.content.startsWith(" ") ? "" : " "}${next.content}`
    finishReason = next.finishReason
  }

  return finalizeLetter(combined)
}

function safeCompanyName(metadata: { company: string; role: string; title: string }): string {
  return metadata.company.trim() || "the company"
}

function buildFallbackLetter(
  jdText: string,
  metadata: { title: string; company: string; role: string },
): string {
  const company = safeCompanyName(metadata)

  if (hasMedicareCosSignal(jdText, metadata)) {
    return finalizeLetter(`What stands out to me about this role is that ${company} is not looking for a traditional advisory Chief of Staff. The Medicare Advantage business is scaling quickly, and the CEO needs someone who can create operating rhythm, clarify priorities, and help the organization focus on the work that matters.

That is the kind of work I did at Akadeum Life Sciences. I built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution, connecting NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on. The work was not just technical. I partnered closely with the CEO, COO, CFO, and commercial leadership to turn fragmented data and ambiguous market signals into clearer operating decisions.

That system mattered because it gave leadership a better way to see the business. It connected pipeline quality, forecast movement, customer behavior, and commercial execution in one place, which made it easier to identify risks, sharpen priorities, and focus the team on the work most likely to move the business forward.

${company}'s emphasis on using AI to improve execution also stood out to me. At Akadeum, I built AI-assisted workflows for lead routing and sales dossier generation that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours. I see AI as a practical way to help teams move faster, reduce manual drag, and keep attention on the work that matters.

I have not worked directly in Medicare Advantage, but I have spent much of my career in healthcare, life sciences, and complex technical markets, including Akadeum, DePuy Synthes / Johnson & Johnson, Stryker, and Spectrum Health. I am comfortable learning high-context environments quickly, especially when the work depends on systems thinking, clear communication, and disciplined execution.

What I would bring to ${company} is a practical operating style: build the system, clarify the tradeoffs, surface what matters, and help leadership act.`)
  }
  return finalizeLetter(`What stands out to me about this role is the need for someone who can bring structure to ambiguity and help leadership move from scattered signals to clearer priorities. That is the kind of work I am looking for next.

At Akadeum Life Sciences, I built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution. I connected NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on. The work was not just technical. I partnered closely with the CEO, COO, CFO, and commercial leadership to turn fragmented data and ambiguous market signals into clearer operating decisions.

That operating system gave leadership a better way to see what was happening across the business, where execution was getting stuck, and which priorities needed attention. It helped connect reporting, forecasting, pipeline quality, and commercial execution into a more useful operating rhythm.

I also built AI-assisted workflows for lead routing and sales dossier generation that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours. I see AI as a practical way to reduce manual drag, improve focus, and help teams spend more time on the work that matters.

My path has been less traditional than some operations or Chief of Staff candidates, but it has been deeply operating-focused. I have worked across healthcare, life sciences, commercial strategy, analytics, and technical markets, and I am comfortable learning high-context environments quickly when the work depends on systems thinking, clear communication, and disciplined execution.

What I would bring to ${company} is a practical operating style: build the system, clarify the tradeoffs, surface what matters, and help leadership act.`)
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

  const metadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  }

  try {
    const plan = await generatePlan(apiKey, jdText, body.result, metadata)
    let lastReason = ""

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const letter = await generateDraft(apiKey, jdText, body.result, plan, metadata, lastReason || undefined)
      const assessment = assessLetter(letter)
      if (assessment.ok) {
        return NextResponse.json({ letter, plan })
      }
      lastReason = assessment.reason || "unknown quality failure"
    }

    const fallback = buildFallbackLetter(jdText, metadata)
    return NextResponse.json({
      letter: fallback,
      plan,
      fallback_used: true,
      fallback_reason: lastReason,
    })
  } catch (err) {
    const fallback = buildFallbackLetter(jdText, metadata)
    const message = err instanceof Error ? err.message : "Something went wrong drafting the letter."
    return NextResponse.json({
      letter: fallback,
      fallback_used: true,
      fallback_reason: message,
    })
  }
}
