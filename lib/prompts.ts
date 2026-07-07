import type { EvidenceItem } from "@/lib/evidence"

// Score route v16 is deterministic. These exports remain for backward compatibility.
export const SCORE_SYSTEM_PROMPT = `V16 uses deterministic scoring in app/api/score/route.ts. This prompt is retained only for compatibility.`

export const LETTER_PLAN_SYSTEM_PROMPT = `You create evidence-locked cover-letter plans for Sam Dickinson.

Return valid JSON only with this exact schema:
{
  "opening_thesis": string,
  "primary_evidence_id": string,
  "supporting_evidence_id": string,
  "domain_bridge": string,
  "gap_strategy": string,
  "must_not_claim": string[],
  "tone_notes": string[]
}

Rules:
- Pick exactly one primary evidence ID and one supporting evidence ID from the approved evidence catalog.
- Prefer commercialOperatingSystem as primary evidence for Chief of Staff, Strategic Operations, Business Operations, Commercial Strategy, GTM Strategy, Revenue Intelligence, and Revenue Operations roles.
- Prefer executiveDecisionSupport when the JD emphasizes CEO/COO/CFO, executive materials, board materials, operating rhythms, decision cadence, or leadership clarity.
- Prefer aiAssistedWorkflows when the JD emphasizes AI, automation, speed, productivity, workflow design, or operating leverage.
- Prefer icpPipelineRedesign when the JD emphasizes GTM strategy, pipeline quality, commercial strategy, prioritization, or growth.
- Prefer revOpsSalesforceDealDeskBridge when Salesforce architecture, deal desk, quote-to-close, commissions, or SaaS RevOps are central requirements.
- Prefer authorityStretchBridge when the role requires formal operating authority, Deputy COO/EVP/VP Ops scope, leader accountability, or company-wide operations ownership.
- Prefer healthcarePayerBridge only when the JD explicitly mentions Medicare Advantage, payer, health insurance, member health, or insurance operations.
- Prefer lifeSciencesClinicalDevelopmentBridge for life sciences, clinical development, pharma, biopharma, medical device, or clinical trial contexts without payer/insurance language.
- Never select evidence to support a claim the evidence explicitly says to avoid.
- Do not use phrases like "What stands out to me" in opening_thesis.
- Keep the plan practical and concise.`

export const LETTER_REWRITE_SYSTEM_PROMPT = `You are polishing a controlled cover-letter draft for Sam Dickinson.

The draft has already been assembled from approved evidence. Your job is to lightly improve flow, remove repetition, and make it sound human. You are an editor, not the author.

Hard rules:
- Preserve the structure and meaning of the controlled draft.
- Do not add new accomplishments, functions, metrics, industries, tools, titles, or claims.
- Do not turn job-description responsibilities into Sam's past experience.
- Do not claim CEO-proxy, trusted-proxy, strategic-proxy, board presentation, formal sales management, direct Medicare Advantage, payer operations, clinical operations leadership, Salesforce architecture/admin, deal desk ownership, commission ownership, or AWS expertise.
- Do not use placeholders.
- Do not add a salutation.
- Do not put Sam's name at the top.
- End with exactly one signature line: Sam Dickinson.
- Use plain ASCII punctuation only. No em dashes or en dashes.
- Do not use "What stands out to me" or "This role caught my attention" as an opening.
- Do not use generic cover-letter phrases such as "I am writing to express my interest," "I am excited to apply," "I look forward to," "I thrive in environments," "presents a unique opportunity," or "I bring a unique blend."

Voice:
- Clear, direct, grounded, specific, practical, and human.
- Sounds like a strategic operator diagnosing the operating problem.
- Less polish is better than fake polish.

Output the polished cover letter only.`

export function buildScorePrompt(
  profile: object,
  jdText: string,
  metadata?: { company?: string; role?: string; title?: string }
): string {
  return `V16 score route is deterministic. Metadata: ${JSON.stringify(metadata ?? {})}. JD length: ${jdText.length}. Profile keys: ${Object.keys(profile ?? {}).length}.`
}

export function buildLetterPlanPrompt(
  jdText: string,
  scoreResult: object,
  evidenceCatalog: EvidenceItem[],
  metadata?: { company?: string; role?: string; title?: string }
): string {
  return `JOB METADATA:
${JSON.stringify(metadata ?? {}, null, 2)}

JOB DESCRIPTION:
${jdText}

FIT EVALUATION:
${JSON.stringify(scoreResult, null, 2)}

APPROVED EVIDENCE CATALOG:
${JSON.stringify(evidenceCatalog, null, 2)}

Create the cover-letter plan. Pick exactly one primary evidence ID and one supporting evidence ID from the approved catalog. Return JSON only.`
}

export function buildLetterRewritePrompt(args: {
  jdText: string
  scoreResult: object
  plan: object
  selectedEvidence: EvidenceItem[]
  controlledDraft: string
  metadata?: { company?: string; role?: string; title?: string }
}): string {
  return `JOB METADATA:
${JSON.stringify(args.metadata ?? {}, null, 2)}

JOB DESCRIPTION:
${args.jdText}

FIT EVALUATION:
${JSON.stringify(args.scoreResult, null, 2)}

APPROVED LETTER PLAN:
${JSON.stringify(args.plan, null, 2)}

APPROVED EVIDENCE:
${JSON.stringify(args.selectedEvidence, null, 2)}

CONTROLLED DRAFT TO POLISH:
${args.controlledDraft}

Lightly polish the controlled draft. Do not add new claims, evidence, functions, metrics, tools, or industries. Keep the same argument, structure, and evidence. Output the cover letter only.`
}

export function buildLetterPrompt(
  profile: object,
  jdText: string,
  scoreResult: object,
  metadata?: { company?: string; role?: string; title?: string }
): string {
  return `JOB METADATA:
${JSON.stringify(metadata ?? {}, null, 2)}

JOB DESCRIPTION:
${jdText}

FIT EVALUATION:
${JSON.stringify(scoreResult, null, 2)}

Write a grounded cover letter for Sam Dickinson. Use only truthful claims from his profile. Do not claim CEO-proxy authority, board presentation, formal sales management, direct Medicare Advantage, payer operations, Salesforce architecture, deal desk ownership, or AWS expertise. Profile keys: ${Object.keys(profile ?? {}).length}.`
}
