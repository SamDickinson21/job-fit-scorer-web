// Candidate profile used to score job fit and draft cover letters.
// Deliberately excludes application pipeline, reference names, and any
// other third-party PII -- the scoring logic doesn't need it, and this
// file lives in a repo that may end up public.

export const PROFILE = {
  candidate_name: "Sam Dickinson",
  title_line: "Growth Architect | Chief of Staff | Data Scientist",
  positioning_summary:
    "Sits where most organizations have a gap: between the data science that generates intelligence and the leaders who need to act on it. Builds the systems that close that gap. Most operators cannot build the models. Most data scientists do not own the strategy. Does both.",
  location: "Temperance, MI (Toledo, OH metro), Eastern Time",
  relocation:
    "Not willing to relocate to Bay Area. Will commute to Detroit or Ann Arbor. Otherwise remote only.",
  years_experience: 8,
  runway_note:
    "Unemployment insurance active, limited runway. Sustainable pace target is 5-10 tailored applications per day, not indefinite volume.",

  target_roles_ranked: [
    "Chief of Staff to CEO or founder, especially growth-stage",
    "AI Deployment / Strategy & AI roles leveraging production AI building",
    "Strategic Operations / Strategy & Planning leadership",
    "Director-level RevOps / GTM Strategy at AI-forward or HubSpot-fluent companies (secondary path)",
  ],

  target_industries_ranked: [
    "Biotech, life sciences, cell & gene therapy (strongest edge: Akadeum experience, four C-suite references, scientific fluency)",
    "AI-forward companies across sectors (technical differentiator)",
    "Healthcare, value-based care, healthtech",
    "Mission-driven tech companies bridging AI and impact",
  ],

  compensation: {
    base_min: 170000,
    base_max: 210000,
    total_comp_min: 200000,
    total_comp_max: 280000,
    default_ask: 185000,
    will_not_accept:
      "Significant pay cut without clear strategic upside. $100K base is no longer the anchor.",
    requires_listed_range_or_fit_signal: true,
  },

  skills: {
    programming_modeling: ["R", "Python", "SQL", "SAS", "Alteryx"],
    bi_visualization: ["Power BI (DAX)", "Tableau"],
    crm_growth_intelligence: [
      "HubSpot",
      "NetSuite ERP",
      "Apollo",
      "ZoomInfo",
      "LinkedIn Sales Navigator",
    ],
    ai_automation: [
      "OpenAI",
      "Anthropic",
      "Gemini",
      "Perplexity",
      "OpenRouter",
      "Ollama",
      "n8n",
      "Zapier",
      "LLM API integration via R & Python",
    ],
    cloud_infrastructure: ["AWS (SageMaker, Lambda, Redshift)", "Docker"],
  },

  tools_not_used: ["Salesforce", "Looker", "Marketo", "Salesloft", "Outreach.io"],

  tooling_adjacency: {
    Salesforce:
      "Not hands-on, but advanced HubSpot CRM architecture experience (45,000+ contacts, ICP/segmentation, automation pipelines) transfers directly. This is a minor gap, ramps fast, NOT disqualifying on its own.",
    Looker:
      "Not hands-on, but advanced Power BI (DAX) and Tableau experience covers the same dashboarding/BI ground. Looker is generally considered easier to pick up than Power BI. This is a minor gap, ramps fast, NOT disqualifying on its own.",
  },

  quantified_outcomes: [
    "296 qualified MQLs YTD against a 50/month target (Akadeum)",
    "Time-to-first-touch dropped from days to under 24 hours (Akadeum)",
    "8% reduction in backorders (J&J)",
  ],

  differentiators: [
    "AI-native, not AI-curious: ships production AI systems calling foundation models through R, Python, n8n, OpenRouter, Ollama",
    "Built commercial intelligence infrastructure from scratch at Akadeum (HubSpot CRM, ICP/segmentation, AI-driven enrichment, NetSuite ERP integration)",
    "Direct C-suite partnership: work used in board presentations, investor meetings, capital calls",
    "Four C-suite references from Akadeum available",
    "Bridges life sciences and commercial work (B.S. Chemistry, M.S. Business Analytics, 3 years cell and gene therapy)",
  ],

  known_gaps: {
    people_management: "No formal direct-report experience; surfaces on senior roles requiring it",
    consulting_finance_pedigree:
      "Absent; affects screening for CoS roles at larger/corporate companies",
    saas_industry: "Limited direct SaaS vertical experience; affects some technology-strategy roles",
    b2c_dtc: "No B2C or DTC experience",
    ai_typecast_risk:
      "AI-centric roles leverage strongest skill but may narrow future trajectory away from generalist CoS/strategy path; open tradeoff, not yet resolved",
  },

  hard_pass_triggers: [
    "Consulting pedigree as a primary screening gate",
    "West Coast relocation required",
    "DTC/B2C or ecommerce specialization required as primary qualification",
    "Role is meaningfully junior to current seniority (2+ levels below)",
    "Role requires deep pre-existing SaaS/engineering org expertise as a baseline (e.g. 12-15yr requirement, engineering management background)",
    "Narrow specialist function misaligned with generalist strategy trajectory (e.g. pure pre-sales/value engineering, single-point RevOps specialist)",
    "Not a real role (staffing platform listing, talent pool submission dressed as a job)",
  ],

  transferability_limits: [
    "Life sciences differentiators do not carry into consumer healthcare, edtech, or government contracting",
    "No B2C experience to draw on",
  ],

  stacked_gaps_rule:
    "A single gap (tooling, industry, or level) is rarely disqualifying on its own. Tooling gap + industry mismatch + level mismatch stacking together = pass/skip regardless of individual bright spots. Evaluate for compounding, not for isolated imperfect matches.",

  cover_letter_voice: {
    founder_led_early_stage: "Confident, direct, founder-to-operator energy",
    corporate_svp_and_below: "More structured but still substantive",
    style_rules: [
      "No em dashes",
      "Lead with mission alignment when relevant",
      "Sign as 'Sam' not 'Samuel Dickinson'",
      "Address known gaps honestly rather than hide them",
      "Reference the four-person C-suite reference panel as a credential",
      "Use specific quantified outcomes over vague claims",
    ],
  },
}
