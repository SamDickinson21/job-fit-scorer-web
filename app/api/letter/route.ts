import { NextRequest, NextResponse } from "next/server";
import { PROFILE } from "@/lib/profile";
import { LETTER_SYSTEM_PROMPT, buildLetterPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Cover letters need a writing model, not the cheapest structured-output model.
// Override in Vercel with OPENROUTER_LETTER_MODEL if you prefer another slug.
const MODEL =
  process.env.OPENROUTER_LETTER_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-4o-mini";

const BANNED_LETTER_PHRASES = [
  "trusted proxy",
  "strategic proxy",
  "ceo proxy",
  "act as a ceo proxy",
  "operated as a ceo proxy",
  "density of scope",
  "scope density",
  "executive partnership density",
  "matches exactly",
  "directly matches",
  "that's exactly what i did",
  "i am writing to express my interest",
  "i am excited to apply",
  "dear hiring manager",
  "proven track record",
  "fast-paced environment",
  "dynamic team",
  "measurable impact",
  "data-driven decisions",
  "strategic outcomes",
  "presents a unique challenge",
  "driving cross-functional execution",
  "high-impact results",
  "enhance operational efficiency",
  "contribute effectively",
  "tangible outcomes",
  "i have successfully led",
  "across clinical, operations, finance, and growth",
  "clinical, operations, finance, and growth",
  "create structure from chaos",
  "turn ambiguity into execution",
  "presents a unique opportunity",
  "rapid scaling in the medicare advantage space",
  "navigating ambiguity while",
  "actionable insights",
  "informed decisions",
  "streamline operations",
  "improve the flow of information",
  "strategic direction",
  "strategic mindset",
  "drive results",
  "i am confident",
  "i look forward to",
  "i thrive in environments",
  "resonates with my experience",
  "critical for improving decision quality",
  "operational leverage",
  "operational lever",
  "builder-operator mindset",
  "domain credibility",
];

const PLACEHOLDER_PATTERNS = [
  /\[[^\]]+\]/i,
  /\bposition\s*\]/i,
  /\bcompany name\b/i,
  /\brelevant field\b/i,
  /\bprevious company\b/i,
  /\bspecific achievement\b/i,
];

type LetterRequestBody = {
  title?: string;
  company?: string;
  role?: string;
  jdText?: string;
  result?: object;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function normalizePlainText(text: string): string {
  return text
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2011/g, "-")
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function finalizeLetter(text: string): string {
  let cleaned = normalizePlainText(text);

  // Remove accidental salutation or signature/header at the top.
  cleaned = cleaned.replace(/^Dear Hiring Manager,?\s*\n+/i, "");
  cleaned = cleaned.replace(/^Sam\s*\n+/i, "");

  // Collapse excessive blank lines.
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  // Remove duplicate trailing signatures, then add one clean signature.
  cleaned = cleaned.replace(/(\n\s*Sam\s*)+$/i, "").trim();
  return `${cleaned}\n\nSam`;
}

function findBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  return BANNED_LETTER_PHRASES.find((phrase) => lower.includes(phrase)) || null;
}

function findPlaceholder(text: string): string | null {
  const match = PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(text));
  return match ? match.toString() : null;
}

function findUnsupportedClaim(text: string): string | null {
  const lower = text.toLowerCase();

  const unsupportedPatterns: Array<[RegExp, string]> = [
    [/\bi have successfully led\b/i, 'generic unsupported claim: "I have successfully led"'],
    [/\bled cross-functional initiatives across clinical/i, 'unsupported clinical cross-functional claim'],
    [/clinical, operations, finance, and growth/i, 'parrots Clover function list as experience'],
    [/I understand the importance of establishing/i, 'generic JD-parroting operating rhythm claim'],
    [/I have consistently/i, 'generic overclaim beginning with I have consistently'],
    [/\bled .*clinical.*operations.*finance.*growth/i, 'claims leadership across Clover-specific functions'],
    [/\bowned .*medicare advantage/i, 'claims direct Medicare Advantage ownership'],
    [/\bled .*medicare advantage/i, 'claims direct Medicare Advantage leadership'],
  ];

  const match = unsupportedPatterns.find(([pattern]) => pattern.test(lower));
  return match ? match[1] : null;
}

function assessLetter(text: string): { ok: boolean; reason?: string } {
  const placeholder = findPlaceholder(text);
  if (placeholder) return { ok: false, reason: `placeholder pattern ${placeholder}` };

  const banned = findBannedPhrase(text);
  if (banned) return { ok: false, reason: `banned phrase "${banned}"` };

  const unsupported = findUnsupportedClaim(text);
  if (unsupported) return { ok: false, reason: unsupported };

  const wc = wordCount(text.replace(/\n\s*Sam\s*$/i, ""));
  if (wc < 300) return { ok: false, reason: `too short (${wc} words)` };
  if (wc > 700) return { ok: false, reason: `too long (${wc} words)` };

  if (/^\s*Dear\b/i.test(text)) return { ok: false, reason: "uses salutation" };
  if (!/\n\s*Sam\s*$/i.test(text)) return { ok: false, reason: "missing Sam signature" };

  return { ok: true };
}

async function callOpenRouter(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature = 0.45,
) {
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    throw new Error(
      `OpenRouter returned ${upstream.status}. ${text.slice(0, 300)}`,
    );
  }

  const data = await upstream.json();
  const choice = data?.choices?.[0];

  return {
    content: normalizePlainText(choice?.message?.content ?? ""),
    finishReason: choice?.finish_reason as string | undefined,
  };
}

function makeGenerationPrompt(basePrompt: string, retryReason?: string): string {
  if (!retryReason) return basePrompt;

  return `${basePrompt}

The prior cover letter attempt failed this quality check: ${retryReason}.

Write a new version from scratch. Do not repair the prior draft. Do not use placeholders, generic cover-letter framing, salutation, banned phrases, or unsupported claims. Make it specific, substantial, and usable. Only make first-person claims that are directly supported by Sam's profile or fit evaluation.`;
}

async function generateCompleteLetter(
  apiKey: string,
  baseMessages: ChatMessage[],
): Promise<string> {
  let first = await callOpenRouter(apiKey, baseMessages, 6000, 0.45);
  let combined = first.content;
  let finishReason = first.finishReason;

  // Continue automatically if the model stops because of token length.
  for (let attempt = 0; finishReason === "length" && attempt < 2; attempt += 1) {
    const continuationMessages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Continue the unfinished cover letter. Do not restart. Do not repeat earlier sentences. Keep the same voice. Finish naturally and end with Sam on its own line. Use plain ASCII text only. Do not use placeholders, salutation, or proxy language.",
      },
      {
        role: "user",
        content: `Continue exactly from this unfinished letter and finish it.\n\n${combined}`,
      },
    ];

    const next = await callOpenRouter(apiKey, continuationMessages, 2500, 0.35);
    combined = `${combined}${combined.endsWith(" ") || next.content.startsWith(" ") ? "" : " "}${next.content}`;
    finishReason = next.finishReason;
  }

  return finalizeLetter(combined);
}


function hasMedicareCosSignal(jdText: string, metadata: { title: string; company: string; role: string }): boolean {
  const haystack = `${metadata.title} ${metadata.company} ${metadata.role}
${jdText}`.toLowerCase();
  return haystack.includes("chief of staff") && haystack.includes("medicare advantage");
}

function safeCompanyName(metadata: { company: string; role: string; title: string }): string {
  return metadata.company.trim() || "the company";
}

function buildFallbackLetter(
  jdText: string,
  metadata: { title: string; company: string; role: string },
): string {
  const company = safeCompanyName(metadata);

  if (hasMedicareCosSignal(jdText, metadata)) {
    return finalizeLetter(`What stands out to me about this role is that ${company} is not looking for a traditional advisory Chief of Staff. The Medicare Advantage business is scaling quickly, and the CEO needs someone who can create operating rhythm, clarify priorities, and help the organization focus on the work that matters.

That is the kind of work I did at Akadeum Life Sciences. I built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution, connecting NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on. The work was not just technical. I partnered closely with the CEO, COO, CFO, and commercial leadership to turn fragmented data and ambiguous market signals into clearer operating decisions.

${company}'s emphasis on using AI to improve execution also stood out to me. At Akadeum, I built AI-assisted workflows for lead routing and sales dossier generation that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours. I see AI as a practical way to help teams move faster, reduce manual drag, and keep attention on the work that matters.

I have not worked directly in Medicare Advantage, but I have spent much of my career in healthcare, life sciences, and complex technical markets, including Akadeum, DePuy Synthes, Stryker, and Spectrum Health. I am comfortable learning high-context environments quickly, especially when the work depends on systems thinking, clear communication, and disciplined execution.

What I would bring to ${company} is a practical operating style: build the system, clarify the tradeoffs, surface what matters, and help leadership act.`);
  }

  return finalizeLetter(`What stands out to me about this role is its emphasis on turning ambiguity into clearer operating decisions. That is the work I am looking for next: building the systems, rhythms, and visibility leadership needs to focus on the right priorities and move with more confidence.

At Akadeum Life Sciences, I built and owned the commercial operating system behind forecasting, pipeline management, executive reporting, board preparation, and go-to-market execution. I connected NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth leadership could rely on. The work was not just technical. I partnered closely with the CEO, COO, CFO, and commercial leadership to turn fragmented data and ambiguous market signals into clearer operating decisions.

I also built AI-assisted workflows for lead routing and sales dossier generation that reduced average speed-to-first-touch from nearly 48 hours to under 20 hours. I see AI as a practical way to reduce manual drag, improve focus, and help teams spend more time on the work that matters.

My path has been less traditional than some operations or Chief of Staff candidates, but it has been deeply operating-focused. I have worked across healthcare, life sciences, commercial strategy, analytics, and technical markets, and I am comfortable learning high-context environments quickly when the work depends on systems thinking, clear communication, and disciplined execution.

What I would bring to ${company} is a practical operating style: build the system, clarify the tradeoffs, surface what matters, and help leadership act.`);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing OPENROUTER_API_KEY. Set it in your Vercel project settings.",
      },
      { status: 500 },
    );
  }

  let body: LetterRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const jdText = (body.jdText || "").trim();

  if (!jdText || !body.result) {
    return NextResponse.json(
      { error: "Missing job description or score result" },
      { status: 400 },
    );
  }

  const metadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  };

  const userPrompt = buildLetterPrompt(PROFILE, jdText, body.result, metadata);

  try {
    let lastReason = "";
    let letter = "";

    // Try up to three full generations. Failed drafts are not used as rewrite input,
    // because that produced generic template letters before.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const messages: ChatMessage[] = [
        { role: "system", content: LETTER_SYSTEM_PROMPT },
        { role: "user", content: makeGenerationPrompt(userPrompt, lastReason || undefined) },
      ];

      letter = await generateCompleteLetter(apiKey, messages);
      const assessment = assessLetter(letter);
      if (assessment.ok) return NextResponse.json({ letter });
      lastReason = assessment.reason || "unknown quality failure";
    }

    const fallback = buildFallbackLetter(jdText, metadata);
    const fallbackAssessment = assessLetter(fallback);

    if (fallbackAssessment.ok) {
      return NextResponse.json({ letter: fallback, fallback_used: true, fallback_reason: lastReason });
    }

    return NextResponse.json(
      {
        error: `The model could not produce a usable cover letter after 3 attempts. Last issue: ${lastReason}. Set OPENROUTER_LETTER_MODEL to a stronger writing model, such as openai/gpt-4o-mini or openai/gpt-4.1-mini.`,
        letter,
      },
      { status: 502 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong drafting the letter.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
