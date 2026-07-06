// Candidate profile used to score job fit and draft cover letters.
//
// Design principles:
// - This should help decide whether a role is worth Sam's time.
// - It should evaluate role shape, not just keyword match.
// - It should not overclaim authority, board attendance, sales management, or tool depth.
// - It deliberately excludes reference names, application pipeline details, and third-party PII.

export const PROFILE = {
  candidate_name: "Sam Dickinson",

  title_line: "Strategic Operations | Chief of Staff | Commercial Strategy",

  positioning_summary:
    "Strategic operator who helps leadership make better decisions by turning messy data, disconnected systems, and ambiguous business signals into direction leadership can act on. Strongest in the messy middle between leadership, data, systems, and execution.",

  current_search_summary:
    "Looking for a Chief of Staff-track, Strategic Operations, Commercial Strategy, GTM Strategy, Revenue Intelligence, or leadership-facing operations role where technical depth and executive judgment belong in the same seat.",

  location: {
    home_base: "Temperance, MI",
    metro_context: "Toledo, Ann Arbor, Detroit corridor",
    timezone: "Eastern Time",
    relocation: "Not open to relocation",
    work_arrangement:
      "Open to fully remote roles anywhere in the U.S., or hybrid/on-site roles within roughly an hour of Temperance, MI.",
    travel:
      "Open to travel up to roughly 25% if it fits the role, such as conferences, customer meetings, leadership offsites, or team working sessions.",
  },

  availability: {
    status: "Available immediately",
    note:
      "Left Akadeum on May 15, 2026 as part of a VC-driven RIF unrelated to performance. Left cleanly with strong executive references.",
  },

  years_experience: 8,

  target_roles_ranked: [
    "Chief of Staff to CEO, COO, founder, GM, CRO, or commercial leadership",
    "Strategic Operations / Business Operations leadership",
    "Commercial Strategy / GTM Strategy / Revenue Intelligence",
    "Director-level Commercial Operations or RevOps with clear executive access",
    "AI Operations / Automation Strategy roles where AI is a lever for business operations, not the entire identity",
  ],

  target_role_families: {
    strongest_fit: [
      "Chief of Staff-track roles with leadership access and broad operating scope",
      "Strategic Operations roles tied to planning, cadence, execution, reporting, or cross-functional alignment",
      "Commercial Strategy / GTM Strategy roles involving ICP, pipeline, forecasting, revenue intelligence, or sales operations",
      "Revenue Intelligence roles where dashboards, systems, and executive decision support matter",
    ],

    possible_fit_with_caveats: [
      "RevOps roles if they are strategic and leadership-facing, not narrow admin roles",
      "AI strategy or automation roles if tied to operations, decision-making, GTM, or business systems",
      "Business Operations roles if they include ownership, ambiguity, and leadership access",
      "Life sciences commercial roles if scope is strategic, not purely field sales or marketing execution",
    ],

    weak_fit: [
      "Pure BI developer roles",
      "Pure data analyst roles",
      "Pure sales operations admin roles",
      "Pure marketing content roles",
      "Narrow Salesforce administrator roles",
      "Implementation consultant roles without strategy or leadership access",
      "Pre-sales or value engineering roles where the path narrows away from strategic operations",
    ],
  },

  target_industries_ranked: [
    "Biotech, life sciences, cell and gene therapy",
    "Healthcare, healthtech, value-based care, and scientific or technical markets",
    "AI-forward companies where automation and decision systems support business execution",
    "Mission-driven technology companies",
    "B2B SaaS or commercial organizations if the role values GTM systems, revenue intelligence, and executive decision support",
  ],

  industry_transferability: {
    strong_transfer:
      "Sam's skills transfer best into environments with complex markets, fragmented systems, technical products, GTM ambiguity, leadership visibility, and a need for better operating infrastructure.",
    life_sciences_edge:
      "Life sciences is a strong edge because of Akadeum, the chemistry background, and comfort with technical scientific markets.",
    non_life_sciences_note:
      "Sam is open to other industries. The stronger the role's leadership access, operating mandate, and systems complexity, the less important exact industry match becomes.",
    weaker_transfer:
      "Consumer, DTC, ecommerce, and pure marketing-led roles are weaker fits unless the role is clearly strategic operations rather than channel execution.",
  },

  compensation: {
    base_min: 150000,
    base_target_low: 165000,
    base_target_high: 200000,
    total_comp_target_low: 180000,
    total_comp_target_high: 260000,
    default_ask: 180000,
    note:
      "Targeting mid-to-high $100s base for senior Strategic Operations, Chief of Staff-track, Commercial Strategy, Revenue Intelligence, or leadership-facing operations roles. Will flex for exceptional fit, equity, mandate, leadership access, or mission alignment.",
    requires_listed_range_or_fit_signal: true,
    comp_opacity_rule:
      "If compensation is not listed, do not automatically skip. Flag compensation opacity as a decision gate unless the company, role scope, seniority, or leadership access strongly suggests it is worth exploring.",
  },

  best_fit_conditions: [
    "Reports to or works closely with CEO, COO, founder, GM, CRO, Chief of Staff, VP Strategy, or senior commercial leadership",
    "Involves ambiguous business problems rather than only predefined tasks",
    "Requires cross-functional execution and operating judgment",
    "Owns or improves operating cadence, planning, reporting, forecasting, or execution systems",
    "Connects data, systems, and leadership decision-making",
    "Values commercial strategy, GTM strategy, revenue intelligence, or pipeline quality",
    "Rewards someone who can build the system and explain what it means",
    "Has a real mandate, not just ticket-taking responsibility",
  ],

  poor_fit_conditions: [
    "Role is mostly dashboard production without decision ownership",
    "Role is mostly ad hoc analysis with no leadership access",
    "Role is a narrow tool administrator position",
    "Role is primarily marketing content generation",
    "Role requires relocation",
    "Role is meaningfully junior to current seniority",
    "Role requires deep formal people management as a hard requirement",
    "Role requires deep Salesforce ownership as the central qualification with no tolerance for HubSpot adjacency",
    "Role is consumer/DTC/ecommerce specialized with little strategic operations overlap",
  ],

  scoring_priorities: {
    role_fit_score:
      "How credibly Sam can do the work based on his background, transferable skills, and proof points.",
    opportunity_quality_score:
      "Whether the role is senior, strategic, leadership-facing, and worth Sam's time.",
    warning:
      "A role can be high role fit and low opportunity quality. For example, a Senior BI Analyst role may match skills but still be underleveled or too narrow.",
  },

  scoring_weights: {
    role_fit_score_100: {
      strategic_operations_or_chief_of_staff_alignment: 25,
      executive_partnership_or_leadership_access: 20,
      commercial_gtm_revenue_or_pipeline_relevance: 15,
      analytics_systems_reporting_or_decision_infrastructure: 15,
      ai_automation_or_technical_leverage: 10,
      industry_or_market_relevance: 10,
      tool_adjacency_and_ramp_feasibility: 5,
    },

    opportunity_quality_score_100: {
      clear_access_to_executive_leadership: 25,
      ownership_and_mandate: 20,
      seniority_and_scope: 15,
      ambiguity_transformation_or_operating_complexity: 15,
      decision_making_influence: 10,
      comp_or_level_signal: 10,
      culture_urgency_or_mission_signal: 5,
    },
  },

  scoring_caps_and_warnings: [
    "If the role appears mostly dashboard production, cap opportunity quality at 65 even if role fit is high.",
    "If the role is clearly analyst IC with no leadership access, cap opportunity quality at 60.",
    "If the role is clearly underleveled, flag underleveling risk as high.",
    "If formal people management is a hard requirement, flag as a risk, not an automatic skip unless it is central to the role.",
    "If the role requires deep Salesforce ownership, flag as a gap, but treat as minor if the role also values CRM architecture, GTM systems, reporting, automation, or HubSpot-adjacent experience.",
    "If the role is mostly marketing content ownership, flag as poor fit.",
    "If tool mismatch, industry mismatch, and level mismatch stack together, recommend skip.",
  ],

  strongest_proof_points: [
    {
      name: "Commercial operating system",
      evidence:
        "Built and owned Akadeum's commercial operating system by integrating NetSuite, HubSpot, Power BI, R, and automation workflows into a source of truth for sales, forecasting, executive reporting, and board preparation.",
      best_for_roles: [
        "Strategic Operations",
        "Chief of Staff",
        "Commercial Operations",
        "Revenue Intelligence",
        "Business Operations",
      ],
    },
    {
      name: "Executive decision support",
      evidence:
        "Partnered closely with CEO, COO, CFO, and commercial leadership on forecasting, board reporting preparation, pipeline strategy, and investor narratives across approximately ten board and investor reporting cycles.",
      best_for_roles: [
        "Chief of Staff",
        "Strategic Operations",
        "Business Operations",
        "Strategy & Planning",
      ],
    },
    {
      name: "ICP redesign",
      evidence:
        "Redesigned the Ideal Customer Profile around cell therapy and adjacent markets, improving MQL-to-SQL conversion from 11% to 20% and SQL-to-Opportunity conversion from 26% to 43%.",
      best_for_roles: [
        "GTM Strategy",
        "Commercial Strategy",
        "Revenue Intelligence",
        "RevOps",
        "Strategic Operations",
      ],
    },
    {
      name: "Lead pipeline ownership",
      evidence:
        "Owned lead pipeline strategy, reporting infrastructure, and commercial performance metrics used across Account Executives, Field Application Scientists, executive leadership, and the broader commercial organization.",
      best_for_roles: [
        "Commercial Strategy",
        "GTM Strategy",
        "RevOps",
        "Revenue Intelligence",
      ],
    },
    {
      name: "AI-assisted workflows",
      evidence:
        "Developed AI-assisted commercial workflows, including a sales dossier system that prepared Account Executives with customer research and account context before outreach, plus intelligent lead routing and automated operational processes that reduced average response time from nearly 48 hours to under 20 hours.",
      best_for_roles: [
        "AI Operations",
        "Automation Strategy",
        "Strategic Operations",
        "Commercial Operations",
      ],
    },
    {
      name: "Forecasting and analytics foundation",
      evidence:
        "Built time series forecasting models at DePuy Synthes / Johnson & Johnson that reduced backorders by 8%, and led Power BI adoption across multiple business units.",
      best_for_roles: [
        "Analytics Strategy",
        "Revenue Intelligence",
        "Operations",
        "Business Intelligence Leadership",
      ],
    },
  ],

  quantified_outcomes: [
    "Improved MQL-to-SQL conversion from 11% to 20% through ICP and qualification redesign",
    "Improved SQL-to-Opportunity conversion from 26% to 43%",
    "Supported approximately ten board and investor reporting cycles through forecasting, pipeline analysis, and narrative preparation",
    "Reduced average speed-to-first-touch from nearly 48 hours to under 20 hours through AI-assisted lead routing and dossier workflows",
    "Built commercial intelligence infrastructure supporting executive reporting, board preparation, forecasting, pipeline management, and GTM execution",
    "Reduced backorders by 8% at DePuy Synthes / Johnson & Johnson through time series forecasting",
  ],

  resume_bullets_to_emphasize_by_role: {
    chief_of_staff: [
      "Partnered closely with CEO, COO, CFO, and commercial leadership on forecasting, board reporting preparation, pipeline strategy, and investor narratives.",
      "Following Akadeum's first commercial RIF, was retained while much of the commercial organization was eliminated, then expanded scope and was promoted to Commercial Strategy & Operations Lead.",
      "Built the operating systems, reporting infrastructure, and business narratives leadership used to make decisions through volatile market conditions.",
    ],

    strategic_operations: [
      "Built and owned the commercial operating system integrating NetSuite, HubSpot, Power BI, R, and automation workflows.",
      "Created a single source of truth for sales, forecasting, executive reporting, and board preparation.",
      "Brought structure to fragmented systems and ambiguous commercial signals.",
    ],

    commercial_strategy_gtm: [
      "Redesigned ICP around cell therapy and adjacent markets, improving MQL-to-SQL conversion from 11% to 20% and SQL-to-Opportunity conversion from 26% to 43%.",
      "Owned lead pipeline strategy, reporting infrastructure, and commercial performance metrics across AEs, FASs, executive leadership, and the broader commercial organization.",
      "Supported Account Executives operationally through CRM usage, reporting, outreach workflows, territory management, commercial tools, and pipeline visibility.",
    ],

    revenue_intelligence: [
      "Built forecasting, customer health, pipeline, and variance reporting used by executive leadership.",
      "Connected CRM and ERP data into decision systems for sales, forecasting, and board preparation.",
      "Created the reporting logic behind lead quality, conversion performance, customer health, and revenue movement.",
    ],

    ai_automation: [
      "Developed AI-assisted commercial workflows, including sales dossier generation, lead routing, and automated operational processes.",
      "Built and maintained customer-facing and internal AI-assisted systems tied to real commercial workflows.",
      "Uses AI as leverage for decision-making, workflow speed, and operational consistency, not as a standalone gimmick.",
    ],
  },

  differentiators: [
    "Combines strategic operations judgment with hands-on technical depth.",
    "Can build the decision system and help leadership interpret what it means.",
    "Earned executive trust by making messy commercial data reliable and useful.",
    "Has strong life sciences and commercial strategy credibility through Akadeum and a B.S. Chemistry background.",
    "Has a proven ICP and pipeline strategy story with measurable conversion improvement.",
    "Uses AI and automation as operational leverage, not as a substitute for business judgment.",
    "Has executive references from CEO, COO, CFO, and VP Sales & Marketing available for his work.",
  ],

  known_gaps: {
    formal_people_management:
      "No formal direct-report management experience. He supported and coached Account Executives operationally, but they did not report to him.",
    traditional_chief_of_staff_pedigree:
      "Does not have a conventional consulting, investment banking, or prior titled Chief of Staff background. His case is based on operating scope, executive partnership, decision systems, and strategic execution.",
    salesforce:
      "HubSpot-native, not Salesforce-native. Treat as a tooling gap only when Salesforce depth is central and non-negotiable.",
    aws:
      "AWS familiarity but not AWS expert. Do not position him as a cloud architect.",
    saas_vertical:
      "Limited direct SaaS vertical experience. Transfer is strongest when role focuses on GTM systems, revenue intelligence, commercial strategy, operations, or executive decision support.",
    b2c_dtc:
      "No meaningful B2C, DTC, or ecommerce specialization.",
    marketing_content:
      "Can guide marketing strategy, ICP, metrics, and positioning, but should not be positioned as a marketing content generator or designer.",
    formal_board_presence:
      "Prepared board and investor materials with leadership, but did not attend or present inside board or investor meetings.",
  },

  hard_pass_triggers: [
    "Relocation required",
    "Bay Area on-site required",
    "Role is meaningfully junior to current seniority",
    "Pure BI developer or analyst role with no leadership access",
    "Pure Salesforce administrator role where Salesforce depth is the central requirement",
    "Pure marketing content generation role",
    "DTC, B2C, or ecommerce specialization is the primary qualification",
    "Consulting pedigree is a hard screening gate",
    "Investment banking or private equity pedigree is a hard screening gate",
    "Deep engineering management background is a hard requirement",
    "Formal people management is a hard requirement and central to the role",
    "Not a real role, such as a staffing platform listing, generic talent pool, or evergreen resume collection",
  ],

  stacked_gaps_rule:
    "A single gap is rarely disqualifying on its own. Tooling gap plus industry mismatch plus level mismatch stacking together is usually a skip. Evaluate for compounding gaps, not isolated imperfections.",

  tools: {
    strongest: [
      "R",
      "Python",
      "SQL",
      "Power BI",
      "DAX",
      "HubSpot",
      "NetSuite",
      "n8n",
      "Zapier",
      "Apollo",
      "ZoomInfo",
      "Seamless.ai",
      "LinkedIn Sales Navigator",
      "OpenAI API",
      "Anthropic API",
      "Gemini",
      "OpenRouter",
      "Claude Code",
      "Ollama",
    ],

    familiar_or_secondary: [
      "Tableau",
      "Canva",
      "Cursor",
      "Vercel",
      "Supabase",
      "Upstash",
      "AWS EC2",
      "AWS S3",
      "AWS RDS",
      "AWS SageMaker",
      "AWS Bedrock",
      "AWS Athena",
    ],

    not_direct_experience: [
      "Salesforce",
      "Looker",
      "Marketo",
      "Salesloft",
      "Outreach.io",
      "dbt",
      "Databricks",
    ],
  },

  tooling_adjacency: {
    Salesforce:
      "Sam is not Salesforce-native, but advanced HubSpot CRM architecture experience transfers to pipeline stages, CRM hygiene, workflows, attribution, reporting, lead routing, and sales process discipline. Treat as a minor gap unless deep Salesforce administration is central and non-negotiable.",
    Looker:
      "Sam has Power BI and Tableau experience. The BI and dashboarding concepts transfer. Treat as a minor gap unless Looker-specific modeling is central.",
    Marketo:
      "Sam has HubSpot, lead routing, CRM workflow, lead scoring, and GTM automation experience. Treat as a moderate gap if Marketo is central, minor if the role is about lifecycle logic or marketing operations strategy.",
    Salesloft:
      "Sam has Apollo, Seamless.ai, LinkedIn Sales Navigator, HubSpot workflows, outreach process, and AE enablement experience. Treat as a minor gap unless Salesloft administration is the core role.",
    Outreach:
      "Sam has Apollo, Seamless.ai, LinkedIn Sales Navigator, HubSpot workflows, outreach process, and AE enablement experience. Treat as a minor gap unless Outreach administration is the core role.",
    dbt:
      "Sam has R, SQL, scheduled data pipelines, transformation logic, and reporting infrastructure experience. Treat as a moderate but learnable gap unless dbt production ownership is central.",
    Airflow:
      "Sam has n8n, Zapier, scheduled R scripts, and automation workflow experience. Treat as an adjacent workflow orchestration gap, not a hard blocker.",
    Databricks:
      "Sam has analytics engineering and data workflow experience, but not direct Databricks depth. Treat as a moderate gap if Databricks is central.",
    AWS:
      "Sam has AWS familiarity but is not an AWS expert. Treat as a gap for cloud architecture roles, but not for operations or analytics roles where AWS is incidental.",
  },

  akadeum_context: {
    company:
      "Akadeum Life Sciences, a growth-stage biotech in the cell and gene therapy market.",
    tenure: "May 2023 to May 2026",
    title_progression: [
      "Business Analyst, May 2023 to January 2025",
      "Commercial Strategy & Operations Lead, January 2025 to May 2026",
    ],
    rif_context:
      "There were two separate RIFs. In October 2024, Sam was one of three commercial people retained after much of the commercial organization was eliminated. He expanded scope and was promoted roughly three months later. In May 2026, a second VC-driven RIF ended his time at Akadeum. It was unrelated to performance.",
    board_accuracy_rule:
      "Never say Sam attended, presented at, or led board or investor meetings. Correct phrasing: he prepared the numbers, dashboards, analysis, and narratives leadership used in board and investor conversations.",
    sales_authority_rule:
      "Never say Sam formally managed the sales team. Correct phrasing: he supported, coached, onboarded, and enabled Account Executives operationally.",
  },

  education: {
    masters:
      "M.S. Business Analytics, Michigan State University, 2018. Built demand forecasting models on 14M Meijer customer records and policy renewal models across 30,000+ companies for Blue Cross Blue Shield of Michigan, both presented to corporate leadership.",
    bachelors:
      "B.S. Chemistry, Michigan State University, 2015. Adds scientific literacy and comfort in life sciences conversations.",
  },

  earlier_experience: [
    {
      title: "Data Scientist & Analytics Lead",
      organization: "Michigan State University",
      value:
        "Embedded analytics partner for institutional leadership. Built KPI frameworks, executive dashboards, and data structures that informed capital planning and helped replace legacy Microsoft Access systems.",
    },
    {
      title: "Data Scientist",
      organization: "DePuy Synthes / Johnson & Johnson",
      value:
        "Built time series forecasting models that reduced backorders by 8% and led Power BI adoption across multiple business units.",
    },
    {
      title: "Data Analyst",
      organization: "Stryker",
      value:
        "Contract role involving analytics and quality-related work in a medical device environment.",
    },
    {
      title: "Data Engineer",
      organization: "Spectrum Health",
      value:
        "Contract role involving clinical data, dashboards, and healthcare analytics.",
    },
    {
      title: "Performance Analyst",
      organization: "Consumers Energy",
      value:
        "Contract role involving reporting, analytics, and operational performance work.",
    },
  ],

  cover_letter_voice: {
    default:
      "Clear, direct, grounded, and specific. Confident without sounding inflated.",
    founder_led_early_stage:
      "More direct and operator-oriented. Emphasize ambiguity, speed, ownership, and building from scratch.",
    corporate_svp_and_below:
      "More structured and measured. Emphasize decision systems, cross-functional partnership, executive reporting, and repeatable operating cadence.",
    life_sciences:
      "Emphasize scientific fluency, commercial systems, cell and gene therapy experience, and ability to operate in volatile technical markets.",
    ai_forward:
      "Emphasize AI-assisted workflows as operational leverage, while keeping Sam positioned as a strategic operator rather than a pure AI engineer.",
    style_rules: [
      "No em dashes",
      "No generic filler",
      "Lead with genuine company or role alignment only when the job description gives enough signal",
      "Use specific outcomes over vague claims",
      "Do not overclaim formal authority",
      "Do not imply board attendance",
      "Do not force references into every letter",
      "Sign as Sam",
    ],
  },

  application_strategy_rules: [
    "If the role has strong leadership access and strategic operating scope, lead with executive decision support and commercial operating system.",
    "If the role is GTM or revenue oriented, lead with ICP redesign, lead pipeline ownership, and conversion improvements.",
    "If the role is AI or automation oriented, lead with AI-assisted workflows, lead routing, dossier system, customer-facing chatbot, and site AI, but keep business impact first.",
    "If the role is life sciences, lead with Akadeum, scientific fluency, cell and gene therapy context, and commercial systems.",
    "If the role is outside life sciences, lead with transferable operating problems: ambiguity, fragmented systems, executive visibility, GTM quality, forecasting, and decision cadence.",
    "If the role looks underleveled, recommend light application or skip even if keywords match.",
    "If the role has no compensation listed but strong strategic fit, flag compensation as a gate, not an automatic skip.",
  ],
} as const