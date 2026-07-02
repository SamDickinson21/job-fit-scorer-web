"use client"

import { useState, useEffect, useCallback } from "react"

interface ScoreResult {
  verdict: "apply" | "apply_with_caveat" | "skip" | string
  application_roi_tier: string
  compounding_gaps?: string[]
  hard_pass_triggers_fired?: string[]
  bright_spots?: string[]
  comp_opacity_flag?: boolean
  reasoning?: string
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

function verdictColor(verdict: string): string {
  if (verdict === "apply") return "var(--green)"
  if (verdict === "apply_with_caveat") return "var(--amber)"
  if (verdict === "skip") return "var(--red)"
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
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)))
  } catch {
    /* storage full or unavailable, non-blocking */
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "var(--text-dim)",
          marginBottom: "6px",
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
    <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
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

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, jdText }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong scoring this role.")
        setLoading(false)
        return
      }

      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        company,
        role,
        jdText,
        result: data.result,
      }
      const updated = [entry, ...history]
      setHistory(updated)
      saveHistory(updated)
      setCurrentId(entry.id)
      setResult(data.result)
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
        body: JSON.stringify({ jdText, result }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong drafting the letter.")
        setLetterLoading(false)
        return
      }
      setLetter(data.letter)
      const updated = history.map((h) => (h.id === currentId ? { ...h, letter: data.letter } : h))
      setHistory(updated)
      saveHistory(updated)
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setLetterLoading(false)
    }
  }, [result, currentId, jdText, letterLoading, history])

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

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "var(--mono)",
    fontSize: "13px",
    padding: "10px 12px",
    borderRadius: "2px",
    outline: "none",
    width: "100%",
  }

  const buttonStyle: React.CSSProperties = {
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

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "transparent",
    color: "var(--blue-light)",
    border: "1px solid rgba(90,174,224,0.4)",
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Main column */}
      <main
        style={{
          flex: 1,
          maxWidth: "760px",
          margin: "0 auto",
          padding: "56px 24px 80px",
        }}
      >
        <div style={{ marginBottom: "8px", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.14em", color: "var(--blue-light)" }}>
          JOB FIT SCORER
        </div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.8rem", fontWeight: 400, margin: "0 0 8px", color: "var(--text)" }}>
          Paste a job. Get a verdict.
        </h1>
        <p style={{ fontFamily: "var(--serif)", fontSize: "15px", color: "var(--text-muted)", margin: "0 0 32px", lineHeight: 1.6 }}>
          Applies the stacked-gaps framework against your profile. Every result is saved to your history automatically.
        </p>

        {/* Form */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <input
            style={{ ...inputStyle, flex: "1 1 200px" }}
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            style={{ ...inputStyle, flex: "1 1 200px" }}
            placeholder="Role title"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <textarea
          style={{ ...inputStyle, minHeight: "220px", resize: "vertical", lineHeight: 1.5, marginBottom: "14px" }}
          placeholder="Paste the full job description here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <button
            style={{ ...buttonStyle, opacity: loading || !jdText.trim() ? 0.5 : 1, cursor: loading || !jdText.trim() ? "default" : "pointer" }}
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

        {/* Result */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  color: verdictColor(result.verdict),
                  border: `1px solid ${verdictColor(result.verdict)}`,
                  padding: "4px 12px",
                  borderRadius: "2px",
                  textTransform: "uppercase",
                }}
              >
                {result.verdict}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-dim)" }}>
                ROI TIER: {result.application_roi_tier}
              </span>
            </div>

            {result.hard_pass_triggers_fired && result.hard_pass_triggers_fired.length > 0 && (
              <Section label="Hard Pass Triggers Fired">
                <BulletList items={result.hard_pass_triggers_fired} />
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

            {result.comp_opacity_flag && (
              <Section label="Comp Opacity">
                <div style={{ color: "var(--amber)", fontSize: "14px" }}>
                  Range not listed. Confirm a fit signal before investing time.
                </div>
              </Section>
            )}

            <Section label="Reasoning">
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>{result.reasoning}</p>
            </Section>

            {result.if_applying_address_explicitly && result.if_applying_address_explicitly.length > 0 && (
              <Section label="If Applying, Address Explicitly">
                <BulletList items={result.if_applying_address_explicitly} />
              </Section>
            )}

            <div style={{ marginTop: "20px" }}>
              <button
                style={{ ...buttonStyle, opacity: letterLoading ? 0.6 : 1 }}
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

        {/* Letter */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Draft Cover Letter (edit before sending)
              </div>
              <button style={{ ...secondaryButtonStyle, padding: "5px 12px" }} onClick={copyLetter}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: "320px", fontFamily: "var(--serif)", fontSize: "14px", lineHeight: 1.7 }}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--text-dim)", marginBottom: "14px", textTransform: "uppercase" }}>
              History ({history.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: entry.id === currentId ? "var(--surface-2)" : "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    padding: "10px 14px",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>
                    {entry.company || "Untitled"}
                    {entry.role ? ` - ${entry.role}` : ""}
                  </span>
                  <span style={{ color: verdictColor(entry.result.verdict), textTransform: "uppercase" }}>
                    {entry.result.verdict}
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
