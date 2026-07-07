const SCORE_URL = process.env.SCORE_URL || "http://localhost:3000/api/score"

function inBand(value, min, max) {
  return typeof value === "number" && value >= min && value <= max
}

function checkEquals(actual, expected) {
  return expected === undefined || String(actual) === String(expected)
}

const cases = [
  {
    name: "Clover Health - Chief of Staff Medicare Advantage CEO",
    body: {
      company: "Clover Health",
      role: "Chief of Staff to Medicare Advantage CEO",
      title: "Chief of Staff",
      jdText: `Chief of Staff to the CEO of our Medicare Advantage business. Build operating cadence, executive decision support, and cross-functional accountability across growth, operations, and finance. The role works closely with CEO/CFO/COO and prepares board-level operating materials. 10+ years preferred. This role may represent the CEO in select strategic planning contexts and requires strong influence without formal authority.`,
    },
    expected: {
      verdict: "pursue",
      application_roi_tier: "high_touch",
      role_fit_score: [78, 82],
      opportunity_quality_score: [86, 90],
      underleveling_risk: "low",
      stretch_risk: "high",
      credential_risk: "medium",
      domain_risk: "medium",
      authority_risk: "high",
    },
  },
  {
    name: "Nsight Health - EVP Operations / COO operating deputy",
    body: {
      company: "Nsight Health",
      role: "EVP Operations / COO Operating Deputy",
      title: "EVP Operations",
      jdText: `EVP Operations and COO operating deputy role with company-wide operating ownership. Hold leaders accountable, run executive operating cadence, and make consequential decisions when needed. Build cross-functional systems across clinical, finance, and growth. Requires senior leadership authority and 10+ years in high-accountability operating roles.`,
    },
    expected: {
      verdict: "selective_pursue",
      application_roi_tier: "high_touch",
      role_fit_score: [62, 70],
      opportunity_quality_score: [88, 92],
      underleveling_risk: "low",
      stretch_risk: "high",
      credential_risk: "high",
      authority_risk: "high",
    },
  },
  {
    name: "Condor - Senior Manager Revenue Operations",
    body: {
      company: "Condor",
      role: "Senior Manager Revenue Operations",
      title: "Senior Manager RevOps",
      jdText: `Senior Manager Revenue Operations in life sciences SaaS. Own Salesforce architecture and administration, deal desk, quote-to-close process, commission validation, and ARR/CARR definitions. Partner with Sales, Finance, and Legal to improve forecasting and pipeline accuracy. 7+ years RevOps preferred.`,
    },
    expected: {
      application_roi_tier: "tailored_application",
      role_fit_score: [55, 62],
      opportunity_quality_score: [68, 76],
      underleveling_risk: "medium",
      stretch_risk: "medium",
      credential_risk: "high",
      authority_risk: "low",
      tool_or_functional_gap_risk: "high",
    },
  },
  {
    name: "IDT / Danaher - Innovation and AI Manager",
    body: {
      company: "IDT / Danaher",
      role: "Innovation and AI Manager",
      title: "AI Manager",
      jdText: `Innovation and AI Manager for enterprise AI adoption. Own AI governance, responsible AI, model risk controls, and production analytics delivery. Manage AI and analytics practitioners and improve AI literacy across teams. Requires data science/ML leadership and technical quality oversight in life sciences.`,
    },
    expected: {
      application_roi_tier: "light_application",
      role_fit_score: [48, 58],
      opportunity_quality_score: [55, 65],
      underleveling_risk: "medium",
      stretch_risk: "high",
      credential_risk: "high",
      authority_risk: "low",
      tool_or_functional_gap_risk: "high",
    },
  },
  {
    name: "Revolution Medicines - Associate Director Sales Ops & Analytics",
    body: {
      company: "Revolution Medicines",
      role: "Associate Director Sales Operations & Analytics",
      title: "Associate Director Sales Operations",
      jdText: `Associate Director Sales Operations & Analytics supporting biotech field teams. Own field enablement analytics, CRM reporting, QBR support, and commercial insights for leadership. Preferred exposure to incentive compensation, territory/roster planning, and oncology launch. Partner with Sales, Marketing, and Finance to improve pipeline and forecast quality.`,
    },
    expected: {
      role_fit_score: [65, 74],
      opportunity_quality_score: [75, 82],
      stretch_risk: "medium",
      authority_risk: "low",
      tool_or_functional_gap_risk: "medium",
    },
  },
]

async function run() {
  let failures = 0

  for (const c of cases) {
    const res = await fetch(SCORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c.body),
    })

    if (!res.ok) {
      failures += 1
      console.log(`FAIL ${c.name}`)
      console.log(`  API error: ${res.status}`)
      continue
    }

    const data = await res.json()
    const result = data?.result || {}
    const checks = []

    if (c.expected.verdict) {
      checks.push({
        label: "verdict",
        ok: checkEquals(result.verdict, c.expected.verdict),
        detail: `${result.verdict} vs ${c.expected.verdict}`,
      })
    }
    if (c.expected.application_roi_tier) {
      checks.push({
        label: "roi",
        ok: checkEquals(result.application_roi_tier, c.expected.application_roi_tier),
        detail: `${result.application_roi_tier} vs ${c.expected.application_roi_tier}`,
      })
    }
    if (c.expected.role_fit_score) {
      const [min, max] = c.expected.role_fit_score
      checks.push({
        label: "role_fit_score",
        ok: inBand(result.role_fit_score, min, max),
        detail: `${result.role_fit_score} vs [${min}, ${max}]`,
      })
    }
    if (c.expected.opportunity_quality_score) {
      const [min, max] = c.expected.opportunity_quality_score
      checks.push({
        label: "opportunity_quality_score",
        ok: inBand(result.opportunity_quality_score, min, max),
        detail: `${result.opportunity_quality_score} vs [${min}, ${max}]`,
      })
    }

    for (const risk of ["underleveling_risk", "stretch_risk", "credential_risk", "domain_risk", "authority_risk", "tool_or_functional_gap_risk"]) {
      if (c.expected[risk] !== undefined) {
        checks.push({
          label: risk,
          ok: checkEquals(result[risk], c.expected[risk]),
          detail: `${result[risk]} vs ${c.expected[risk]}`,
        })
      }
    }

    const caseFailed = checks.some(ch => !ch.ok)
    if (caseFailed) failures += 1

    console.log(`${caseFailed ? "FAIL" : "PASS"} ${c.name}`)
    for (const ch of checks) {
      const mark = ch.ok ? "ok" : "x"
      console.log(`  [${mark}] ${ch.label}: ${ch.detail}`)
    }
  }

  console.log(`\nCompleted ${cases.length} cases. Failures: ${failures}`)
  process.exitCode = failures > 0 ? 1 : 0
}

run().catch(err => {
  console.error("Harness failed:", err)
  process.exit(1)
})
