import { NextRequest, NextResponse } from "next/server"
import { PROFILE } from "@/lib/profile"
import { SCORE_SYSTEM_PROMPT, buildScorePrompt } from "@/lib/prompts"

export const runtime = "nodejs"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "qwen/qwen3.7-plus"

type ScoreRequestBody = {
  title?: string
  company?: string
  role?: string
  jdText?: string
}

function stripJsonFence(content: string): string {
  let cleaned = content.trim()

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim()
  }

  return cleaned
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

  let body: ScoreRequestBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const jdText = (body.jdText || "").trim()

  if (!jdText) {
    return NextResponse.json(
      { error: "Job description is empty" },
      { status: 400 }
    )
  }

  const metadata = {
    title: body.title || "",
    company: body.company || "",
    role: body.role || "",
  }

  const userPrompt = buildScorePrompt(PROFILE, jdText, metadata)

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
          { role: "system", content: SCORE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
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
  const content: string = stripJsonFence(
    data?.choices?.[0]?.message?.content ?? ""
  )

  try {
    const result = JSON.parse(content)
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json(
      {
        error: "The model's response wasn't valid JSON. Try again.",
        raw: content,
      },
      { status: 502 }
    )
  }
}