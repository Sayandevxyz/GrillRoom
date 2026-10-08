import fs from "fs";
import path from "path";

const targetDir = path.join(process.cwd(), "db", "seed", "knowledge");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

interface Snippet {
  filename: string;
  category: string;
  persona_tag: string;
  source: string;
  text: string;
}

const snippets: Snippet[] = [
  {
    filename: "market_01_bottom_up.md",
    category: "market",
    persona_tag: "meera",
    source: "general VC practice",
    text: "Never estimate market size by taking one percent of an arbitrary multi-billion industry. Real sizing begins with countable discrete buying units multiplied by realistic annualized willingness to pay. State the exact number of qualified target buyers reachable in year one, what they spend on existing workarounds, and how your price captures that value. Top-down reports conceal zero-demand realities.",
  },
  {
    filename: "market_02_wedge_strategy.md",
    category: "market",
    persona_tag: "meera",
    source: "general VC practice",
    text: "A sharp wedge targets an acutely underserved buyer with a hyper-focused solution that incumbents ignore. Winning the wedge builds proprietary workflow data and brand authority, opening adjacent enterprise tiers. When pitching, clearly articulate who customer number one thousand is, how you cross the chasm from early adopters, and why incumbents will concede the initial niche.",
  },
  {
    filename: "market_03_why_now.md",
    category: "market",
    persona_tag: "meera",
    source: "general VC practice",
    text: "Every venture outcome requires an external catalyst: a recent regulatory shift, a sharp reduction in underlying infrastructure cost, or an irreversible behavioral change. If your startup could have been attempted five years ago, explain why it failed then or why today's timing prevents immediate margin collapse. A compelling why-now proves why this window exists today.",
  },
  {
    filename: "market_04_tam_fallacy.md",
    category: "market",
    persona_tag: "meera",
    source: "general VC practice",
    text: "Quoting aggregate global industry turnover is an immediate red flag. Investors evaluate Serviceable Obtainable Market: the realistic slice of buyers you can acquire with your existing go-to-market channels before running out of runway. Specify the exact criteria that qualify an enterprise as an active in-market buyer versus an indifferent bystander.",
  },
  {
    filename: "economics_01_cac_payback.md",
    category: "unit_economics",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "Healthy software businesses recover fully loaded customer acquisition costs within twelve months on a gross-margin basis. If CAC payback exceeds eighteen months, working capital drains faster than revenue grows. Always separate blended organic acquisition from paid paid acquisition channels when quoting payback metrics, and factor customer onboarding staff into the calculation.",
  },
  {
    filename: "economics_02_gross_margins.md",
    category: "unit_economics",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "High software revenue means nothing if gross margins resemble IT professional services. True SaaS commands eighty percent gross margins. When serving complex AI workflows, model cloud inference compute, database read charges, and human-in-the-loop validation directly into cost of goods sold. Revenue without healthy unit contribution cannot support venture scale.",
  },
  {
    filename: "economics_03_churn_compounding.md",
    category: "unit_economics",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "A two percent monthly logo churn rate compounds to nearly a quarter of your customer base vanishing every year. Growth masks churn only while pouring capital into acquisition; once funding cools, the leaky bucket collapses valuation. Investors seek net revenue retention above one hundred and ten percent, driven by natural seat expansion or usage expansion.",
  },
  {
    filename: "economics_04_ltv_cac_ratio.md",
    category: "unit_economics",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "An LTV to CAC ratio of three to one is only valid if customer lifetime is proven rather than hypothesized. Never multiply five years of projected subscription fees against an unseasoned cohort. State your observed retention period, churn curve flattening, and gross margin percentage when asserting lifetime enterprise value.",
  },
  {
    filename: "revenue_01_pricing_logic.md",
    category: "revenue_model",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "Pricing is the strongest signal of customer value. Charging too little signals weak conviction and forces unmanageable sales volume. Structure pricing around the value metric that grows naturally as your customer succeeds: active transactions, compute hours, or measurable labor hours saved. Avoid arbitrary flat-rate tiers that penalize high-usage power customers.",
  },
  {
    filename: "revenue_02_pilot_trap.md",
    category: "revenue_model",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "Free pilots and nominal proof-of-concepts hide indifferent decision-makers. A pilot must have pre-agreed contractual success criteria, defined budget authorization, and automatic transition into a paid annual contract upon milestone completion. If customers refuse to commit budget before piloting, they are testing technology as curiosity, not resolving operational urgency.",
  },
  {
    filename: "revenue_03_monetization_timing.md",
    category: "revenue_model",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "Promises to monetize through future ads, enterprise up-sells, or speculative data licensing are deeply discounted by institutional investors. If early users do not pay for utility today, they will churn the instant monetization is introduced. Test willingness to pay early, even with manual billing and imperfect packaging.",
  },
  {
    filename: "tech_01_defensibility.md",
    category: "technology",
    persona_tag: "arjun",
    source: "general VC practice",
    text: "Calling public foundation model APIs with system prompts is not proprietary defensibility. If an engineering team with five hundred thousand dollars can replicate your core capability in six weeks, you hold zero technical moat. Defensibility requires proprietary domain training pipelines, low-latency execution engines, custom hardware integrations, or private edge deployments.",
  },
  {
    filename: "tech_02_data_flywheel.md",
    category: "technology",
    persona_tag: "arjun",
    source: "general VC practice",
    text: "A genuine data flywheel requires user interactions that generate unique proprietary labels and counter-factual evaluations that external scrapers cannot access. Simply accumulating generic raw logs does not create a barrier to entry. Detail how customer usage directly trains models to deliver measurable precision gains over off-the-shelf alternatives.",
  },
  {
    filename: "tech_03_failure_modes.md",
    category: "technology",
    persona_tag: "arjun",
    source: "general VC practice",
    text: "Senior engineering diligence inspects catastrophic edge cases: hallucination rates in compliance environments, latency spikes under concurrent enterprise batch jobs, and fallback pathways when external upstream APIs fail. Founders who acknowledge failure thresholds and detail automated fallback guardrails earn immediate technical credibility.",
  },
  {
    filename: "moat_01_switching_costs.md",
    category: "moat",
    persona_tag: "arjun",
    source: "general VC practice",
    text: "High switching costs occur when migrating away from your software threatens business continuity, requires tedious data export, or disrupts core employee habits. Deep integration into enterprise systems of record builds sustainable defensibility. If replacing your software takes an afternoon, your pricing power will quickly erode to zero.",
  },
  {
    filename: "moat_02_network_effects.md",
    category: "moat",
    persona_tag: "meera",
    source: "general VC practice",
    text: "True network effects mean each incremental user makes the platform intrinsically more valuable to existing participants. Do not confuse economies of scale or viral invite loops with two-sided network liquidity. Specify whether the effect is direct, two-sided, or data-driven, and state the critical liquidity threshold required to trigger it.",
  },
  {
    filename: "problem_01_urgency.md",
    category: "problem",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Investors fund painkillers, not vitamins. A hair-on-fire problem is one where the prospect is actively suffering financial loss, regulatory fines, or severe operational friction right now. If the problem does not command an active line item in the executive budget, sales cycles will stall indefinitely in committee reviews.",
  },
  {
    filename: "problem_02_frequency.md",
    category: "problem",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Problems encountered daily or hourly embed into routine workflow, generating high retention and continuous engagement. Infrequent problems—even painful ones—suffer from user re-acquisition costs every time the need reoccurs. Demonstrate that your customer encounters the problem frequently enough to establish sticky daily usage.",
  },
  {
    filename: "traction_01_validation_actions.md",
    category: "traction",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Pay attention to user actions, not polite words. Survey responses stating someone would buy software are worthless. Look for commitments of consequence: deposit payments, signed non-disclosure agreements, shared confidential datasets, or workarounds built in spreadsheets. If users have not spent time or money to solve this, the demand is imaginary.",
  },
  {
    filename: "traction_02_referenceable_users.md",
    category: "traction",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Three enthusiastic customers who will take reference calls unprompted outweigh fifty lukewarm signups. Diligence always contacts your earliest users to ask how they discovered you, what alternatives they evaluated, and how their workflow would suffer if your company vanished tomorrow. Authentic user advocacy is undeniable proof.",
  },
  {
    filename: "team_01_founder_market_fit.md",
    category: "team",
    persona_tag: "sam",
    source: "general VC practice",
    text: "Founder-market fit is the unfair advantage stemming from lived domain expertise, rare technical capability, or unique empathy for the buyer. Investors look for obsessive operators who understand edge cases that outsiders overlook. Explain what secret insight about this industry you learned that other well-funded outsiders miss.",
  },
  {
    filename: "team_02_execution_velocity.md",
    category: "team",
    persona_tag: "sam",
    source: "general VC practice",
    text: "The greatest predictor of early-stage venture trajectory is execution speed: how many iterations, user interviews, code deployments, and customer contacts the team completes every single week. In a high-uncertainty market, the team that learns twice as fast reaches scalable product-market fit first.",
  },
  {
    filename: "team_03_resilience.md",
    category: "team",
    persona_tag: "sam",
    source: "general VC practice",
    text: "Every seed startup faces product rejections, engineering regressions, and lost enterprise deals. Angel investors evaluate founder resilience: the ability to dissect failure without defensiveness, adjust strategy rapidly, and maintain relentless forward momentum. Blaming the market or customers for slow traction signals fatal fragility.",
  },
  {
    filename: "competition_01_status_quo.md",
    category: "competition",
    persona_tag: "meera",
    source: "general VC practice",
    text: "Your biggest competitor is almost never another startup; it is inertia, custom Excel workarounds, and doing nothing. Enterprise buyers prefer familiar friction over the organizational risk of championing new software. Articulate how your product overcomes the switching barrier and makes staying on the status quo indefensible.",
  },
  {
    filename: "competition_02_counter_positioning.md",
    category: "competition",
    persona_tag: "meera",
    source: "general VC practice",
    text: "Counter-positioning occurs when you adopt a business model or distribution architecture that an established incumbent cannot copy without cannibalizing their existing high-margin core business. If an incumbent can simply enable a checkbox on their existing dashboard to neutralize you, your venture lacks structural protection.",
  },
  {
    filename: "impact_01_measurement.md",
    category: "impact",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Impact must be measured in concrete, verifiable units of improvement: hours saved per frontline worker, reduction in medical misdiagnoses, or household savings delivered. Vague aspirational mission statements without unit-level tracking indicate grant-dependency rather than sustainable, mission-aligned enterprise value.",
  },
  {
    filename: "impact_02_adoption_friction.md",
    category: "impact",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Solutions designed for emerging markets, frontline staff, or vulnerable populations fail when they demand high digital literacy, reliable high-speed data, or unearned institutional trust. Identify distribution gates early, partner with existing community nodes, and design offline-first workflows to guarantee adoption.",
  },
  {
    filename: "ask_01_milestone_alignment.md",
    category: "ask",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "Never raise money simply to buy eighteen months of general runway. Every capital tranche must be tied to specific de-risking inflection points: reaching fifty thousand dollars in monthly recurring revenue, signing three marquee enterprise contracts, or proving sub-ten-month payback. Round sizing must reflect milestone requirements.",
  },
  {
    filename: "ask_02_capital_efficiency.md",
    category: "ask",
    persona_tag: "sam",
    source: "general VC practice",
    text: "Seed capital should accelerate a proven engine, not subsidize wandering exploration. Showing that you generated early prototypes and customer validation on minimal personal budget demonstrates high capital efficiency and discipline. Investors back founders who treat every dollar as leverage.",
  },
  {
    filename: "pitch_01_clarity_first.md",
    category: "problem",
    persona_tag: "sam",
    source: "general VC practice",
    text: "If an investor cannot explain what your startup does and who buys it within twenty seconds, your pitch has failed. Cut industry jargon, vague buzzwords, and hand-waving metaphors. State who the specific customer is, what catastrophic problem they face, and exactly how your product solves it.",
  },
  {
    filename: "pitch_02_honesty_over_bluff.md",
    category: "traction",
    persona_tag: "kavya",
    source: "general VC practice",
    text: "Savvy investors instantly spot bluffing and false precision. Answering that you do not yet have data on a specific metric, but detailing the precise pilot test designed to measure it next month, builds immense trust. Defensiveness and vague hand-waving destroy investor conviction immediately.",
  },
  {
    filename: "tech_04_scalability.md",
    category: "technology",
    persona_tag: "arjun",
    source: "general VC practice",
    text: "Architecture matters when enterprise workloads expand. Demonstrate understanding of data isolation, SOC2 compliance boundaries, API rate-limiting structures, and graceful degradation during network partitions. Architectural forethought separates production-grade enterprise software from weekend side projects.",
  },
  {
    filename: "market_05_distribution_velocity.md",
    category: "market",
    persona_tag: "meera",
    source: "general VC practice",
    text: "First-time founders obsess over product features; experienced founders obsess over distribution advantage. Even exceptional software withers without repeatable, scalable acquisition loops. Detail how your product virally invites collaborators, leverages existing app marketplaces, or utilizes content flywheels to lower blended CAC.",
  },
  {
    filename: "revenue_04_expansion_net_retention.md",
    category: "revenue_model",
    persona_tag: "rohan",
    source: "general VC practice",
    text: "The most valuable venture-backed businesses generate more revenue from existing customer cohorts year over year than they lose to churn. Build expansion into the core product architecture through usage-based tiers, seat add-ons, or modular upsell features. Landing small and expanding systematically is the hallmark of elite SaaS.",
  },
];

for (const snippet of snippets) {
  const content = `---
category: ${snippet.category}
persona_tag: ${snippet.persona_tag}
source: ${snippet.source}
---
${snippet.text}
`;
  const filePath = path.join(targetDir, snippet.filename);
  fs.writeFileSync(filePath, content, "utf-8");
}

console.log(`Successfully generated ${snippets.length} rubric snippets in ${targetDir}`);
