"use client"

import { useState, useEffect, useCallback } from "react"
import type { CSSProperties, ReactNode } from "react"

type Verdict =
  | "strong_pursue"
  | "pursue"
  | "selective_pursue"
  | "maybe"
  | "skip"
  | string

type ApplicationRoiTier =
  | "high_touch"
  | "tailored_application"
  | "light_application"
  | "skip"
  | string

interface ScoreResult {
  verdict: Verdict
  application_roi_tier: ApplicationRoiTier

  role_fit_score?: number
  opportunity_quality_score?: number

  underleveling_risk?: "low" | "medium" | "high" | string
  stretch_risk?: "low" | "medium" | "high" | string
  credential_risk?: "low" | "medium" | "high" | string
  domain_risk?: "low" | "medium" | "high" | string

  pursuit_summary?: string
  best_positioning_angle?: string

  green_flags?: string[]
  red_flags?: string[]
  compounding_gaps?: string[]
  hard_pass_triggers_fired?: string[]
  bright_spots?: string[]
  gaps_to_address?: string[]

  comp_opacity_flag?: boolean
  reasoning?: string
  application_strategy?: string
  recommended_resume_bullets?: string[]
  cover_letter_angle?: string
  interview_proof_points?: string[]

  // Backward compatibility with the old schema
  if_applying_address_explicitly?: string[]
}

interface HistoryEntry {
  id: string
  timestamp: string
  company: string
  role: string
  jdText: string
  result: ScoreResult
  letter?: string
}

const HISTORY_KEY = "jobFitHistory"
const HISTORY_LIMIT = 100

function labelize(value?: string): string {
  if (!value) return ""
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function verdictColor(verdict?: string): string {
  if (verdict === "strong_pursue") return "var(--green)"
  if (verdict === "pursue") return "var(--green)"
  if (verdict === "selective_pursue") return "var(--amber)"
  if (verdict === "maybe") return "var(--amber)"
  if (verdict === "skip") return "var(--red)"
  return "var(--text-dim)"
}

function riskColor(risk?: string): string {
  if (risk === "low") return "var(--green)"
  if (risk === "medium") return "var(--amber)"
  if (risk === "high") return "var(--red)"
  return "var(--text-dim)"
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(0, HISTORY_LIMIT))
    )
  } catch {
    // storage full or unavailable, non-blocking
  }
}

function Section({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "var(--text-dim)",
          marginBottom: "7px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null

  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: "18px",
        color: "var(--text-muted)",
        fontSize: "14px",
        lineHeight: 1.65,
      }}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function ScoreBar({
  label,
  score,
  helper,
}: {
  label: string
  score?: number
  helper?: string
}) {
  const safeScore =
    typeof score === "number" && Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : null

  const color =
    safeScore === null
      ? "var(--text-dim)"
      : safeScore >= 80
      ? "var(--green)"
      : safeScore >= 60
      ? "var(--amber)"
      : "var(--red)"

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--serif)",
            fontSize: "24px",
            lineHeight: 1,
            color,
          }}
        >
          {safeScore === null ? "N/A" : safeScore}
          {safeScore !== null && (
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>
              /100
            </span>
          )}
        </span>
      </div>

      <div
        style={{
          height: "7px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${safeScore ?? 0}%`,
            height: "100%",
            background: color,
            transition: "width 0.25s ease",
          }}
        />
      </div>

      {helper && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            color: "var(--text-dim)",
            lineHeight: 1.45,
          }}
        >
          {helper}
        </div>
      )}
    </div>
  )
}

function Pill({
  children,
  color,
}: {
  children: ReactNode
  color: string
}) {
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: "11px",
        letterSpacing: "0.08em",
        color,
        border: `1px solid ${color}`,
        padding: "4px 10px",
        borderRadius: "2px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  )
}

export default function Home() {
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [jdText, setJdText] = useState("")

  const [loading, setLoading] = useState(false)
  const [letterLoading, setLetterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [result, setResult] = useState<ScoreResult | null>(null)
  const [letter, setLetter] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const title = [company, role].filter(Boolean).join(" - ") || "Untitled"

  const handleEvaluate = useCallback(async () => {
    if (!jdText.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)
    setLetter(null)
    setCurrentId(null)

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          role,
          jdText,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong scoring this role.")
        return
      }

      const scoredResult: ScoreResult = data.result

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        company,
        role,
        jdText,
        result: scoredResult,
      }

      const updated = [entry, ...history].slice(0, HISTORY_LIMIT)
      setHistory(updated)
      saveHistory(updated)
      setCurrentId(entry.id)
      setResult(scoredResult)
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [jdText, title, company, role, loading, history])

  const handleDraftLetter = useCallback(async () => {
    if (!result || !currentId || letterLoading) return

    setLetterLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          role,
          jdText,
          result,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong drafting the letter.")
        return
      }

      setLetter(data.letter)

      const updated = history.map(h =>
        h.id === currentId ? { ...h, letter: data.letter } : h
      )

      setHistory(updated)
      saveHistory(updated)
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setLetterLoading(false)
    }
  }, [result, currentId, title, company, role, jdText, letterLoading, history])

  const loadFromHistory = (entry: HistoryEntry) => {
    setCompany(entry.company)
    setRole(entry.role)
    setJdText(entry.jdText)
    setResult(entry.result)
    setLetter(entry.letter || null)
    setCurrentId(entry.id)
    setError(null)
  }

  const clearForm = () => {
    setCompany("")
    setRole("")
    setJdText("")
    setResult(null)
    setLetter(null)
    setCurrentId(null)
    setError(null)
  }

  const copyLetter = () => {
    if (!letter) return

    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const inputStyle: CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "var(--mono)",
    fontSize: "13px",
    padding: "10px 12px",
    borderRadius: "2px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  }

  const buttonStyle: CSSProperties = {
    background: "var(--blue)",
    color: "#fff",
    border: "1px solid var(--blue)",
    fontFamily: "var(--mono)",
    fontSize: "12px",
    letterSpacing: "0.06em",
    padding: "10px 20px",
    borderRadius: "2px",
    cursor: "pointer",
  }

  const secondaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: "transparent",
    color: "var(--blue-light)",
    border: "1px solid rgba(90,174,224,0.4)",
  }

  const addressItems =
    result?.gaps_to_address && result.gaps_to_address.length > 0
      ? result.gaps_to_address
      : result?.if_applying_address_explicitly

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <main
        style={{
          flex: 1,
          maxWidth: "900px",
          margin: "0 auto",
          padding: "56px 24px 80px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: "8px",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: "0.14em",
            color: "var(--blue-light)",
          }}
        >
          JOB FIT SCORER
        </div>

        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: "1.9rem",
            fontWeight: 400,
            margin: "0 0 8px",
            color: "var(--text)",
            lineHeight: 1.2,
          }}
        >
          Paste a job. Get a pursuit strategy.
        </h1>

        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "15px",
            color: "var(--text-muted)",
            margin: "0 0 32px",
            lineHeight: 1.6,
            maxWidth: "720px",
          }}
        >
          Scores role fit, opportunity quality, key risks, and the best angle
          to use if the role is worth pursuing.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            style={{ ...inputStyle, flex: "1 1 220px" }}
            placeholder="Company"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />

          <input
            style={{ ...inputStyle, flex: "1 1 220px" }}
            placeholder="Role title"
            value={role}
            onChange={e => setRole(e.target.value)}
          />
        </div>

        <textarea
          style={{
            ...inputStyle,
            minHeight: "240px",
            resize: "vertical",
            lineHeight: 1.5,
            marginBottom: "14px",
          }}
          placeholder="Paste the full job description here..."
          value={jdText}
          onChange={e => setJdText(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              ...buttonStyle,
              opacity: loading || !jdText.trim() ? 0.5 : 1,
              cursor: loading || !jdText.trim() ? "default" : "pointer",
            }}
            onClick={handleEvaluate}
            disabled={loading || !jdText.trim()}
          >
            {loading ? "Evaluating..." : "Evaluate Fit"}
          </button>

          <button style={secondaryButtonStyle} onClick={clearForm}>
            Clear
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(217,83,79,0.1)",
              border: "1px solid rgba(217,83,79,0.4)",
              color: "#e88a87",
              padding: "12px 16px",
              borderRadius: "2px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              marginBottom: "24px",
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "22px",
                flexWrap: "wrap",
              }}
            >
              <Pill color={verdictColor(result.verdict)}>
                {labelize(result.verdict)}
              </Pill>

              <Pill color="var(--text-dim)">
                ROI: {labelize(result.application_roi_tier)}
              </Pill>

              {result.underleveling_risk && (
                <Pill color={riskColor(result.underleveling_risk)}>
                  Underleveling: {labelize(result.underleveling_risk)}
                </Pill>
              )}

              {result.stretch_risk && (
                <Pill color={riskColor(result.stretch_risk)}>
                  Stretch: {labelize(result.stretch_risk)}
                </Pill>
              )}

              {result.credential_risk && (
                <Pill color={riskColor(result.credential_risk)}>
                  Credential: {labelize(result.credential_risk)}
                </Pill>
              )}

              {result.domain_risk && (
                <Pill color={riskColor(result.domain_risk)}>
                  Domain: {labelize(result.domain_risk)}
                </Pill>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "18px",
                marginBottom: "22px",
              }}
            >
              <ScoreBar
                label="Role Fit"
                score={result.role_fit_score}
                helper="Can Sam credibly do the work?"
              />

              <ScoreBar
                label="Opportunity Quality"
                score={result.opportunity_quality_score}
                helper="Is the role senior, strategic, and worth the time?"
              />
            </div>

            {result.pursuit_summary && (
              <Section label="Pursuit Summary">
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--serif)",
                    fontSize: "18px",
                    color: "var(--text)",
                    lineHeight: 1.55,
                  }}
                >
                  {result.pursuit_summary}
                </p>
              </Section>
            )}

            {result.best_positioning_angle && (
              <Section label="Best Positioning Angle">
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--serif)",
                    fontSize: "18px",
                    color: "var(--text)",
                    lineHeight: 1.55,
                  }}
                >
                  {result.best_positioning_angle}
                </p>
              </Section>
            )}

            {result.reasoning && (
              <Section label="Reasoning">
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {result.reasoning}
                </p>
              </Section>
            )}

            {result.application_strategy && (
              <Section label="Application Strategy">
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {result.application_strategy}
                </p>
              </Section>
            )}

            {result.hard_pass_triggers_fired &&
              result.hard_pass_triggers_fired.length > 0 && (
                <Section label="Hard Pass Triggers Fired">
                  <BulletList items={result.hard_pass_triggers_fired} />
                </Section>
              )}

            {result.green_flags && result.green_flags.length > 0 && (
              <Section label="Green Flags">
                <BulletList items={result.green_flags} />
              </Section>
            )}

            {result.red_flags && result.red_flags.length > 0 && (
              <Section label="Red Flags">
                <BulletList items={result.red_flags} />
              </Section>
            )}

            {result.compounding_gaps && result.compounding_gaps.length > 0 && (
              <Section label="Compounding Gaps">
                <BulletList items={result.compounding_gaps} />
              </Section>
            )}

            {result.bright_spots && result.bright_spots.length > 0 && (
              <Section label="Bright Spots">
                <BulletList items={result.bright_spots} />
              </Section>
            )}

            {addressItems && addressItems.length > 0 && (
              <Section label="Gaps to Address">
                <BulletList items={addressItems} />
              </Section>
            )}

            {result.recommended_resume_bullets &&
              result.recommended_resume_bullets.length > 0 && (
                <Section label="Resume Bullets to Emphasize">
                  <BulletList items={result.recommended_resume_bullets} />
                </Section>
              )}

            {result.cover_letter_angle && (
              <Section label="Cover Letter Angle">
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  {result.cover_letter_angle}
                </p>
              </Section>
            )}

            {result.interview_proof_points &&
              result.interview_proof_points.length > 0 && (
                <Section label="Interview Proof Points">
                  <BulletList items={result.interview_proof_points} />
                </Section>
              )}

            <div style={{ marginTop: "22px" }}>
              <button
                style={{
                  ...buttonStyle,
                  opacity: letterLoading ? 0.6 : 1,
                  cursor: letterLoading ? "default" : "pointer",
                }}
                onClick={handleDraftLetter}
                disabled={letterLoading}
              >
                {letterLoading
                  ? "Drafting..."
                  : result.verdict === "skip"
                  ? "Draft Letter Anyway"
                  : "Generate Cover Letter"}
              </button>
            </div>
          </div>
        )}

        {letter && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                }}
              >
                Draft Cover Letter, edit before sending
              </div>

              <button
                style={{ ...secondaryButtonStyle, padding: "5px 12px" }}
                onClick={copyLetter}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <textarea
              style={{
                ...inputStyle,
                minHeight: "340px",
                fontFamily: "var(--serif)",
                fontSize: "14px",
                lineHeight: 1.7,
              }}
              value={letter}
              onChange={e => setLetter(e.target.value)}
            />
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: "var(--text-dim)",
                marginBottom: "14px",
                textTransform: "uppercase",
              }}
            >
              History ({history.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {history.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    alignItems: "center",
                    background:
                      entry.id === currentId ? "var(--surface-2)" : "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    padding: "10px 14px",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.company || "Untitled"}
                    {entry.role ? ` - ${entry.role}` : ""}
                  </span>

                  <span
                    style={{
                      color: verdictColor(entry.result.verdict),
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {labelize(entry.result.verdict)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}