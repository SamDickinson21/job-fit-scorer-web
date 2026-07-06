import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { LETTER_SYSTEM_PROMPT, buildLetterPrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = process.env.OPENROUTER_LETTER_MODEL || process.env.OPENROUTER_MODEL || "openrouter/free"

type LetterRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
  result?: object
}

function cleanLetter(text: string): string {
  let cleaned = text
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2011/g, "-")
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()

  // Remove accidental signature/header at the top.
  cleaned = cleaned.replace(/^Sam\s*\n+/i, "")

  // If the model accidentally included a markdown/code fence, remove it.
  cleaned = cleaned
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .trim()

  // Make sure the letter ends with Sam, but do not duplicate it.
  if (!/\nSam\s*$/i.test(cleaned) && !/^Sam\s*$/i.test(cleaned)) {
    cleaned = `${cleaned}\n\nSam`
  }

  return cleaned
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

  let upstream: Response

  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: LETTER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    })
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
  const choice = data?.choices?.[0]
  const finishReason = choice?.finish_reason
  const letter = cleanLetter(choice?.message?.content ?? "")

  if (finishReason === "length") {
    return NextResponse.json(
      {
        error: "The cover letter was cut off by the model token limit. Increase max_tokens or use a stronger model.",
        letter,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ letter })
}
