import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { LETTER_SYSTEM_PROMPT, buildLetterPrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_LETTER_MODEL || process.env.OPENROUTER_MODEL || "openrouter/free"

const BANNED_LETTER_PHRASES = [
  "trusted proxy",
  "strategic proxy",
  "ceo proxy",
  "density of scope",
  "scope density",
  "executive partnership density",
  "matches exactly",
  "directly matches",
  "that's exactly what i did",
]

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
    .trim()
}

function finalizeLetter(text: string): string {
  let cleaned = normalizePlainText(text)

  // Remove accidental signature/header at the top.
  cleaned = cleaned.replace(/^Sam\s*\n+/i, "")

  // Collapse excessive blank lines.
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim()

  // Remove duplicate trailing signatures, then add one clean signature.
  cleaned = cleaned.replace(/(\n\s*Sam\s*)+$/i, "").trim()
  return `${cleaned}\n\nSam`
}

function hasBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase()
  return BANNED_LETTER_PHRASES.find(phrase => lower.includes(phrase)) || null
}

async function callOpenRouter(apiKey: string, messages: ChatMessage[], maxTokens: number) {
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.25,
      max_tokens: maxTokens,
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENROUTER_API_KEY. Set it in your Vercel project settings." },
      { status: 500 }
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

  const userPrompt = buildLetterPrompt(PROFILE, jdText, body.result, metadata)

  const initialMessages: ChatMessage[] = [
    { role: "system", content: LETTER_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]

  try {
    let first = await callOpenRouter(apiKey, initialMessages, 3200)
    let combined = first.content
    let finishReason = first.finishReason

    // Some OpenRouter models cut off even with a reasonable token budget.
    // If that happens, continue automatically instead of returning a broken draft.
    for (let attempt = 0; finishReason === "length" && attempt < 2; attempt += 1) {
      const continuationMessages: ChatMessage[] = [
        {
          role: "system",
          content:
            "Continue an unfinished cover letter in Sam Dickinson's voice. Do not restart. Do not repeat earlier sentences. Use plain ASCII text only. Finish naturally and completely and end with Sam on its own line. Do not use the phrases trusted proxy, strategic proxy, CEO proxy, density of scope, or matches exactly.",
        },
        {
          role: "user",
          content: `The cover letter below was cut off. Continue exactly from where it stopped, finish naturally, and do not repeat anything.\n\nPARTIAL COVER LETTER:\n${combined}`,
        },
      ]

      const next = await callOpenRouter(apiKey, continuationMessages, 1600)
      combined = `${combined}${combined.endsWith(" ") || next.content.startsWith(" ") ? "" : " "}${next.content}`
      finishReason = next.finishReason
    }

    let letter = finalizeLetter(combined)
    const banned = hasBannedPhrase(letter)

    if (banned) {
      // One automatic rewrite pass if the model used unsafe JD/proxy language.
      const rewriteMessages: ChatMessage[] = [
        { role: "system", content: LETTER_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Rewrite this cover letter so it is complete, polished, substantial enough to actually use, and does not use the banned phrase "${banned}". Do not claim Sam was a CEO proxy, trusted proxy, or strategic proxy. Keep the same core argument and sign as Sam.\n\nDRAFT TO FIX:\n${letter}`,
        },
      ]

      const rewritten = await callOpenRouter(apiKey, rewriteMessages, 2600)
      letter = finalizeLetter(rewritten.content)
    }

    return NextResponse.json({ letter })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong drafting the letter."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
