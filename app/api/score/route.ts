import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { LETTER_SYSTEM_PROMPT, buildLetterPrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "openrouter/free"

type LetterRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
  result?: object
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing OPENROUTER_API_KEY. Set it in your Vercel project settings.",
      },
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
    return NextResponse.json(
      { error: "Missing job description or score result" },
      { status: 400 }
    )
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
        temperature: 0.4,
      }),
    })
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not reach OpenRouter. Check your connection and try again.",
      },
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
  const letter: string = data?.choices?.[0]?.message?.content?.trim() ?? ""

  return NextResponse.json({ letter })
}