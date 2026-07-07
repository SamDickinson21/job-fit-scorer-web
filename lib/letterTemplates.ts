import { EVIDENCE, type EvidenceId } from "@/lib/evidence"

export type LetterPlan = {
  opening_thesis?: string
  primary_evidence_id: EvidenceId
  supporting_evidence_id: EvidenceId
  domain_bridge?: string
  gap_strategy?: string
  must_not_claim?: string[]
  tone_notes?: string[]
}

export type LetterMetadata = {
  title: string
  company: string
  role: string
}

export type RoleFamily =
  | "chief_of_staff"
  | "evp_operations"
  | "revenue_operations"
  | "pharma_sales_ops_analytics"
  | "enterprise_ai_delivery"
  | "commercial_strategy"
  | "strategic_operations"
  | "revenue_intelligence"
  | "bi_analytics"
  | "technical_operations"
  | "general"

function textFor(jdText: string, metadata: LetterMetadata): string {
  return `${metadata.title} ${metadata.company} ${metadata.role}\n${jdText}`.toLowerCase()
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term))
}

export function hasPayerSignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["medicare advantage", "payer", "health insurance", "insurance operations", "member health", "members healthier"])
}

export function hasLifeSciencesSignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["life sciences", "clinical development", "clinical trial", "clinical trials", "biopharma", "pharma", "r&d", "medical device", "therapies", "drug development"])
}

// Backward-compatible name. Now intentionally means payer/insurance, not any clinical mention.
export function hasMedicareOrPayerSignal(jdText: string, metadata: LetterMetadata): boolean {
  return hasPayerSignal(jdText, metadata)
}

export function hasAiSignal(jdText: string): boolean {
  const h = ` ${jdText.toLowerCase()} `
  return hasAny(h, [" ai ", "ai-powered", "ai-enabled", "ai-first", "artificial intelligence", "emerging technology", "automation", "workflow automation"])
}

export function hasGtmSignal(jdText: string): boolean {
  const h = jdText.toLowerCase()
  return hasAny(h, ["gtm", "go-to-market", "pipeline", "commercial", "sales", "marketing", "revenue", "funnel", "forecast"])
}

export function hasRevOpsHardGapSignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["salesforce", "deal desk", "quote-to-close", "quote to close", "commission", "commissions", "arr", "carr", "territory planning", "quota setting"])
}

export function hasPharmaSalesOpsSignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["sales operations", "sales ops", "commercial analytics", "field enablement", "field teams", "field sales", "incentive compensation", "territory/roster", "roster management", "qbr", "qbrs", "market access", "oncology launch", "oral oncolytics", "pharmaceutical", "biotech", "biotechnology"]) && hasAny(h, ["pharma", "pharmaceutical", "biotech", "biotechnology", "oncology", "market access", "field teams", "field sales"])
}

export function hasEnterpriseAiDeliverySignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["ai platforms", "ai governance", "responsible ai", "model risk", "machine learning", "data science", "advanced analytics", "concept through production", "production", "technical quality", "ai and analytics teams", "mentor practitioners", "ai literacy"])
}

export function hasAuthorityGapSignal(jdText: string, metadata: LetterMetadata): boolean {
  const h = textFor(jdText, metadata)
  return hasAny(h, ["evp", "deputy coo", "coo's operating deputy", "coo’s operating deputy", "number-two operating seat", "number two operating seat", "real operating authority", "hold department leaders accountable", "covering the coo", "step in for the coo", "decision authority"])
}

export function inferRoleFamily(jdText: string, metadata: LetterMetadata): RoleFamily {
  const h = textFor(jdText, metadata)
  if (hasEnterpriseAiDeliverySignal(jdText, metadata)) return "enterprise_ai_delivery"
  if (hasAuthorityGapSignal(jdText, metadata) || hasAny(h, ["evp of operations", "vp operations", "deputy coo"])) return "evp_operations"
  if (hasPharmaSalesOpsSignal(jdText, metadata)) return "pharma_sales_ops_analytics"
  if (hasAny(h, ["revenue operations", "revops", "sales operations", "deal desk", "salesforce architecture", "salesforce administration"])) return "revenue_operations"
  if (hasAny(h, ["chief of staff", "chief-of-staff"])) return "chief_of_staff"
  if (hasAny(h, ["commercial strategy", "gtm strategy", "go-to-market", "pipeline strategy", "market strategy"])) return "commercial_strategy"
  if (hasAny(h, ["revenue intelligence", "forecasting", "pipeline analytics"])) return "revenue_intelligence"
  if (hasAny(h, ["bi analyst", "business intelligence analyst", "dashboard developer", "report developer"])) return "bi_analytics"
  if (hasAny(h, ["strategic operations", "business operations", "operating rhythm", "operating systems", "decision cadence"])) return "strategic_operations"
  if (hasAny(h, ["automation", " ai ", "systems", "analytics", "business intelligence"])) return "technical_operations"
  return "general"
}

function companyName(metadata: LetterMetadata): string {
  return metadata.company.trim() || "the company"
}

function normalizeRole(role: string): string {
  return role.trim() || "role"
}

function openingFor(jdText: string, metadata: LetterMetadata, family: RoleFamily): string {
  const company = companyName(metadata)
  const role = normalizeRole(metadata.role || metadata.title)
  const h = textFor(jdText, metadata)

  if (family === "evp_operations") {
    return `${company}'s ${role} role is written for a company that needs stronger operating leverage immediately: clearer cadence, sharper accountability, and better visibility into what is moving, what is blocked, and what needs a decision.`
  }

  if (family === "chief_of_staff" && hasPayerSignal(jdText, metadata)) {
    return `${company}'s ${role} role is centered on building the operating infrastructure a scaling healthcare business needs: clearer priorities, tighter decision rhythms, and faster visibility into what is working, what is slipping, and what needs to change.`
  }

  if (family === "chief_of_staff") {
    return `${company}'s ${role} role appears focused on building the operating infrastructure leadership needs as the business scales: clearer priorities, tighter decision rhythms, and better visibility into where execution needs attention.`
  }

  if (family === "pharma_sales_ops_analytics") {
    return `${company}'s ${role} role is centered on making field execution, CRM discipline, commercial analytics, and leadership visibility work as one operating system.`
  }

  if (family === "enterprise_ai_delivery") {
    return `${company}'s ${role} role is centered on turning AI strategy into governed, adopted, production-ready business workflows.`
  }

  if (family === "bi_analytics") {
    return `${company}'s ${role} role appears to sit at the point where reporting quality and operating decision quality need to line up in a practical way.`
  }

  if (family === "revenue_operations" && hasAny(h, ["salesforce", "deal desk", "quote-to-close", "commissions"])) {
    return `${company}'s ${role} role sits at the point where GTM execution, finance, and operating visibility need to become one system.`
  }

  if (family === "revenue_operations") {
    return `${company}'s ${role} role appears to need someone who can turn fragmented revenue signals into clearer forecasting, pipeline visibility, and operating decisions leadership can trust.`
  }

  if (family === "commercial_strategy") {
    return `${company}'s ${role} role appears focused on turning market signals, pipeline quality, and operating priorities into clearer direction for growth.`
  }

  if (family === "revenue_intelligence") {
    return `${company}'s ${role} role appears to need someone who can turn fragmented revenue signals into clearer forecasting, pipeline visibility, and operating decisions leadership can trust.`
  }

  if (family === "strategic_operations") {
    return `${company}'s ${role} role appears to sit in the space where strategy has to become operating rhythm: clearer priorities, better decision flow, and tighter execution across the business.`
  }

  if (family === "technical_operations") {
    return `${company}'s ${role} role appears to need someone who can connect systems, data, and workflow design in a way that improves how leaders and teams make decisions.`
  }

  return `${company}'s ${role} role appears to need someone who can bring structure to ambiguity, turn messy signals into clearer priorities, and help the business move with more focus.`
}

function whyItMattersParagraph(family: RoleFamily): string {
  if (family === "chief_of_staff") {
    return "That kind of system matters because a Chief of Staff role is not about reporting for its own sake. It is about making the right information visible, clarifying the tradeoffs, and helping leadership decide where attention and action are most needed."
  }

  if (family === "evp_operations") {
    return "That kind of operating system matters because accountability is difficult when leaders are working from different views of the business. The point is to make priorities, blockers, owners, and tradeoffs visible enough that the organization can keep moving without waiting for perfect clarity."
  }

  if (family === "pharma_sales_ops_analytics") {
    return "That kind of system matters because field execution breaks down when customer information, CRM activity, territory/account planning, analytics, and leadership reporting are disconnected. The point is not more reporting. The point is giving commercial teams and leadership a shared view of what is happening and what needs attention."
  }

  if (family === "enterprise_ai_delivery") {
    return "That kind of work matters because AI only creates value when it moves from experiment to adoption: clear use cases, sound governance, practical workflows, and measurable business impact."
  }

  if (family === "revenue_operations") {
    return "That kind of system matters because revenue operations only works when the field, finance, and leadership are operating from the same truth. The point is not more reporting. The point is cleaner definitions, sharper prioritization, and better decisions about where the business should focus."
  }

  if (family === "commercial_strategy") {
    return "That kind of system matters because commercial strategy only works when market signals, pipeline quality, and execution realities are visible in the same frame. The point is not more reporting. The point is sharper prioritization and better decisions about where the business should focus."
  }

  if (family === "revenue_intelligence") {
    return "That kind of system matters because revenue intelligence is only useful when it changes how leaders see the business. The goal is to make forecast movement, pipeline quality, and execution risk visible early enough for the team to act."
  }

  if (family === "bi_analytics") {
    return "That kind of work matters because dashboards alone rarely change outcomes. What matters is whether the reporting creates trusted visibility, cleaner handoffs, and better operating decisions."
  }

  return "That kind of system matters because operating work breaks down when leaders have data but not clarity. The goal is to make the right information visible, clarify the tradeoffs, and help the business move with more focus."
}

function scoreRoleFamily(scoreResult: Record<string, unknown>, inferred: RoleFamily): RoleFamily {
  const fromScore = String(scoreResult.role_family || "").toLowerCase() as RoleFamily
  const allowed: RoleFamily[] = [
    "chief_of_staff",
    "evp_operations",
    "revenue_operations",
    "pharma_sales_ops_analytics",
    "enterprise_ai_delivery",
    "commercial_strategy",
    "strategic_operations",
    "revenue_intelligence",
    "bi_analytics",
    "technical_operations",
    "general",
  ]
  return allowed.includes(fromScore) ? fromScore : inferred
}

function selectBridgeEvidenceId(jdText: string, scoreResult: Record<string, unknown>, metadata: LetterMetadata, family: RoleFamily): EvidenceId | null {
  const underleveling = String(scoreResult.underleveling_risk || "").toLowerCase()
  const authority = String(scoreResult.authority_risk || "").toLowerCase()
  const domain = String(scoreResult.domain_risk || "").toLowerCase()

  // Explicit bridge precedence avoids cross-role bleed (e.g., Medicare text on RevOps roles).
  if (hasPayerSignal(jdText, metadata)) return "healthcarePayerBridge"
  if (family === "evp_operations" || authority === "high") return "authorityStretchBridge"
  if (family === "enterprise_ai_delivery") return "enterpriseAiDeliveryBridge"
  if (family === "pharma_sales_ops_analytics") return "pharmaSalesOpsAnalyticsBridge"
  if (family === "revenue_operations" && hasRevOpsHardGapSignal(jdText, metadata)) return "revOpsSalesforceDealDeskBridge"
  if (family === "bi_analytics" || underleveling === "high") return "underlevelingBiBridge"
  if (hasLifeSciencesSignal(jdText, metadata) && domain !== "low") return "lifeSciencesClinicalDevelopmentBridge"
  return null
}

function bridgeParagraph(jdText: string, scoreResult: Record<string, unknown>, metadata: LetterMetadata, family: RoleFamily): string | null {
  const bridgeId = selectBridgeEvidenceId(jdText, scoreResult, metadata, family)
  if (bridgeId) return EVIDENCE[bridgeId].letterParagraph

  if (family === "chief_of_staff" || String(scoreResult.stretch_risk || "").toLowerCase() === "high") {
    return "My path is not the traditional consulting-to-Chief-of-Staff path, but it has been deeply operating-focused. I am most useful where leaders need someone who can understand the business, build the system, and turn ambiguity into practical direction."
  }

  return null
}

function chooseSupportingEvidence(plan: LetterPlan, jdText: string, family: RoleFamily, metadata: LetterMetadata): EvidenceId {
  if (plan.supporting_evidence_id && plan.supporting_evidence_id !== plan.primary_evidence_id) return plan.supporting_evidence_id
  if (family === "pharma_sales_ops_analytics") return "pharmaSalesOpsAnalyticsBridge"
  if (family === "enterprise_ai_delivery") return "enterpriseAiDeliveryBridge"
  if (family === "revenue_operations" && hasRevOpsHardGapSignal(jdText, metadata)) return "revOpsSalesforceDealDeskBridge"
  if (family === "evp_operations") return "authorityStretchBridge"
  if (hasAiSignal(jdText)) return "aiAssistedWorkflows"
  if (family === "commercial_strategy" || hasGtmSignal(jdText)) return "icpPipelineRedesign"
  return "executiveDecisionSupport"
}

export function buildControlledCoverLetterDraft(args: {
  jdText: string
  metadata: LetterMetadata
  scoreResult: Record<string, unknown>
  plan: LetterPlan
}): string {
  const { jdText, metadata, scoreResult, plan } = args
  const family = scoreRoleFamily(scoreResult, inferRoleFamily(jdText, metadata))
  const company = companyName(metadata)
  const primaryId = plan.primary_evidence_id || "commercialOperatingSystem"
  const supportingId = chooseSupportingEvidence(plan, jdText, family, metadata)

  const paragraphs: string[] = []
  paragraphs.push(openingFor(jdText, metadata, family))

  const primary = EVIDENCE[primaryId] || EVIDENCE.commercialOperatingSystem
  paragraphs.push(primary.letterParagraph)

  if (family === "chief_of_staff" || family === "strategic_operations" || family === "revenue_intelligence" || family === "evp_operations" || family === "pharma_sales_ops_analytics") {
    if (primaryId !== "executiveDecisionSupport" && supportingId !== "executiveDecisionSupport") {
      paragraphs.push(EVIDENCE.executiveDecisionSupport.letterParagraph)
    } else {
      paragraphs.push(whyItMattersParagraph(family))
    }
  } else {
    paragraphs.push(whyItMattersParagraph(family))
  }

  const supporting = EVIDENCE[supportingId] || EVIDENCE.aiAssistedWorkflows
  if (supporting.id !== primary.id && !supporting.id.endsWith("Bridge")) {
    paragraphs.push(supporting.letterParagraph)
  }

  const bridge = bridgeParagraph(jdText, scoreResult, metadata, family)
  if (bridge) paragraphs.push(bridge)

  const closeTarget = family === "revenue_operations" || family === "pharma_sales_ops_analytics"
    ? "Sales, Marketing, Finance, and leadership"
    : family === "enterprise_ai_delivery"
    ? "business and technology teams"
    : "leadership"

  if (family === "chief_of_staff" || family === "evp_operations") {
    paragraphs.push(`What I would bring to ${company} is operating leverage for leadership: clearer priorities, tighter execution cadence, and cleaner visibility into where decisions need to happen.`)
  } else if (family === "revenue_operations" || family === "pharma_sales_ops_analytics") {
    paragraphs.push(`What I would bring to ${company} is a practical operating style: align definitions, tighten handoffs, and help ${closeTarget} run from the same source of truth.`)
  } else if (family === "enterprise_ai_delivery") {
    paragraphs.push(`What I would bring to ${company} is practical AI adoption discipline: clear use cases, workflow-level execution, and measurable business value without overcomplicating the system.`)
  } else if (family === "bi_analytics") {
    paragraphs.push(`What I would bring to ${company} is reporting that drives action: not just cleaner dashboards, but clearer operating decisions and accountability.`)
  } else {
    paragraphs.push(`What I would bring to ${company} is a practical operating style: build the system, clarify the tradeoffs, surface what matters, and help ${closeTarget} act from the same truth.`)
  }

  return `${paragraphs.join("\n\n")}\n\nSam Dickinson`
}

export function selectedEvidenceIdsForPlan(plan: LetterPlan, jdText: string, metadata: LetterMetadata): EvidenceId[] {
  const family = inferRoleFamily(jdText, metadata)
  const primary = plan.primary_evidence_id || "commercialOperatingSystem"
  const supporting = chooseSupportingEvidence(plan, jdText, family, metadata)
  const ids: EvidenceId[] = [primary, supporting]

  if (family === "chief_of_staff" || family === "strategic_operations" || family === "revenue_intelligence" || family === "evp_operations" || family === "pharma_sales_ops_analytics") {
    ids.push("executiveDecisionSupport")
  }

  const bridgeId = selectBridgeEvidenceId(jdText, {}, metadata, family)
  if (bridgeId) ids.push(bridgeId)

  return ids
}
