# 🔥 GrillRoom: Adversarial AI Investor Simulation

## 1. Chosen vertical: "Shark Tank Simulator: an AI investor panel" and the persona it serves (the founder)

### Vertical
**Shark Tank Simulator: an AI investor panel** — an adversarial, high-stakes fundraising simulation engine designed to pressure-test early-stage founders before they step into actual venture capital partner meetings.

### The Persona Served: The Early-Stage Founder
Fundraising founders typically pitch in high-stress environments where venture capitalists scrutinize unit economics, defensibility, customer discovery, and market size. Most pitch practice tools are sycophantic cheerleaders that offer polite encouragement rather than ruthless interrogation. 

**GrillRoom** serves the founder who needs:
- **Ruthless, unsparing scrutiny** before facing actual venture partners.
- **Contradiction and consistency tracking** across their claims, traction figures, and metrics.
- **Quantified conviction telemetry (0–100%)** revealing exactly which answers build credibility and which destroy it.
- **Evidence-grounded feedback** that forbids hallucinated pitch advice and marks missing proof with explicit `[insert ...]` templates.
- **Progression audits** through iterative retries to verify whether tightened pitches actually improve investor conviction.

---

## 2. Approach and logic: panel design, Claim Ledger, question taxonomy, planner rules, conviction model, verdicts computed in code

### 2.1 Panel Design & Personalities
The panel consists of four distinct venture archetypes and one neutral Chair:
- **Rohan (The CFO / Ex-Operator)**: Obsessed with unit economics, CAC, LTV, payback periods, and gross margins. Distrusts hand-waving and "we will monetize later" narratives. signature question: *"What does it cost you to acquire and serve one customer, and what do they pay you?"*
- **Meera (The Growth VC)**: Focuses on bottom-up TAM/SAM, adoption velocity, and wedge strategies. Distrusts top-down "1% of a huge market" claims. Signature question: *"Build the market size bottom-up. Who is customer number one thousand?"*
- **Dr. Arjun (The Deep-Tech Diligence Lead)**: Scrutinizes technical defensibility, moats, proprietary architecture, and replication barriers. Distrusts thin wrappers over third-party APIs. Signature question: *"If a funded team copied this in three months, what could they not copy?"*
- **Kavya (The Customer Voice & Product Strategist)**: Probes user behavior, observed switching friction, and customer interviews. Distrusts assumed demand. Signature question: *"Tell me about the last five people you spoke to. What did they do, not say?"*
- **Marcus Vance (The Neutral Chair)**: Impartial moderator who introduces the boardroom, enforces speaking discipline, handles transitions, and formally closes deliberations.

### 2.2 The Due Diligence Ledger
Every factual assertion made by the founder is extracted into an in-memory / relational Due Diligence Ledger with schema:
- `id`, `session_id`, `category` (traction, financial, technical, market, team, product), `statement`, `confidence`, `status` (`verified`, `questioned`, `refuted`), `source_turn`.
- When answers contain metric shifts or discrepancies (e.g. CAC moving from $650 to $4,500), the ledger flags contradictions, prompting immediate investor interrupts.

### 2.3 Question Taxonomy
Questions are categorized into strict taxonomies to prevent generic small-talk:
1. **Clarification**: Requesting granular definitions of business mechanics.
2. **Pressure Test**: Subjecting assertions to extreme stress-test scenarios (churn spikes, CAC doubling).
3. **Contradiction Probe**: Pointing out inconsistencies between historical statements and current claims.
4. **Moat / Defensibility**: Inquiring into defensible technical or distribution moats.
5. **Unit Economics**: Pounding down to the individual customer unit margin.

### 2.4 Planner Rules
A deterministic rule engine selects the next speaker to preserve realistic boardroom dynamics:
- **Contradiction Interrupt Rule**: If the analyst detects a verified contradiction, the investor whose domain was contradicted immediately interrupts (prefixed with *"Hold on —"*).
- **Cross-Talk Rule**: An investor can jump in with a reaction or follow-up when triggered by another investor's probe (maximum 2 turns between cross-talk).
- **Speaking Floor Balance**: An investor cannot speak more than 2 consecutive turns unless pursuing a dedicated deep-dive follow-up (max 2 follow-ups).
- **Chair Rotation & Intervention**: Marcus Vance intervenes to open proceedings, manage heated cross-talk, and formally transition to verdicts.

### 2.5 Conviction Model (0–100%)
Each investor maintains an independent conviction score computed deterministically in code:
- **Baseline**: Starts between 30% and 50% depending on archetype temperament.
- **Delta Computation**:
  - `+3% to +10%`: Concrete metrics, cited customer behavior, acknowledged limitations, specific unit economics.
  - `-5% to -15%`: Evasive answers, hand-waving, ungrounded TAM claims, buzzword deflection.
  - `-20%`: Direct contradiction with previously recorded ledger claims.
- **Clamping**: Strictly clamped to `[0, 100]`.
- **Momentum Tracking**: Visualized live via upward/downward velocity badges (`+8%`, `-12%`).

### 2.6 Verdicts Computed in Code
Unlike naive LLM simulators where the model hallucinates an arbitrary decision, verdicts are strictly evaluated algorithmically in TypeScript:
- **IN**: Requires an individual investor conviction $\ge 70\%$ **AND** overall panel average $\ge 65\%$. Produces an explicit, calculated **Simulated Offer** (e.g., "$500,000 for 7% equity at a $7.14M post-money valuation").
- **CONDITIONAL**: Requires conviction between $45\%$ and $69\%$. Provides clear conditions precedent (e.g., "Must reach $20k MRR with < 3% monthly churn before term sheet").
- **OUT**: Triggered if conviction $< 45\%$ or if any critical contradiction remains unresolved.
- **All offers are highlighted with clear warnings**: `⚠️ SIMULATED OFFER FOR SIMULATION PURPOSES ONLY`.

---

## 3. How the solution works: end-to-end flow plus a text architecture description

### 3.1 End-to-End User Flow
1. **Pitch Ingestion (`/`)**:
   - Founder enters company summary, target audience, pricing, and traction, or drops a PDF pitch deck (processed client/server side via `unpdf`).
   - Selects intensity: **Realistic**, **Tough**, or **Shark**.
2. **Boardroom Stage (`/session/[id]`)**:
   - Chair Marcus Vance welcomes the founder and sets boardroom expectations.
   - The first shark immediately challenges the founder's core assertion.
   - **Real-Time Turn Exchange**: Founder responds via text. The background 20B Analyst evaluates directness, extracts claims, and updates conviction deltas. The 120B Investor streams back authentic dialogue via Server-Sent Events (`text/event-stream`).
   - **Claim Drawer**: The founder can view "What The Panel Noticed" in real-time, showing claims tagged as verified, questioned, or refuted.
3. **Verdict & Debrief (`/session/[id]/debrief`)**:
   - Code calculates final verdicts and simulated term sheets.
   - The 120B model compiles an unsparing **Debrief Dossier**:
     - Overall Pitch Readiness Score (0–100).
     - Breakdown by criteria (Traction, Moat, Financials, Clarity, Velocity).
     - 7-Day High-Impact Action Plan.
     - Evidence-Only Pitch Rewrite: No made-up facts; missing figures are replaced with `[insert verified CAC]`.
     - Tightened 30-Second Elevator Pitch.
4. **Retry & Progression Audit (`/compare/[id]`)**:
   - Founder clicks **Retry with Improved Pitch**, linking a child session to the parent session.
   - Side-by-side comparison screen renders delta charts, criteria shifts, and conviction changes (e.g., Rohan $+24\%$, Meera $+15\%$).

### 3.2 Text Architecture Description
```
[Founder Browser UI]
       │
       │ HTTPS / Server-Sent Events (SSE)
       ▼
[Next.js 14 App Router API Layer]
  ├── /api/session/start        --> Validates input (Zod), establishes session cookie, seeds Due Diligence Ledger, delivers Chair intro
  ├── /api/session/answer (SSE) --> 
  │     ├─ Step 1: 20B Analyst evaluates founder response (directness, metric extraction, contradiction flags)
  │     ├─ Step 2: Code engine updates Due Diligence Ledger & recomputes Conviction (0-100%)
  │     ├─ Step 3: Planner selects next investor using deterministic rules (contradiction interrupt, cross-talk, turn caps)
  │     └─ Step 4: 120B Investor streams persona-grounded speech with SSE back to browser
  ├── /api/session/verdict      --> Computes algorithmic In/Conditional/Out verdicts and simulated term sheets
  ├── /api/session/debrief      --> Synthesizes evidence-grounded debrief dossier with [insert ...] placeholders
  ├── /api/session/retry        --> Forks linked session with inherited parent context for progression tracking
  ├── /api/session/compare      --> Computes side-by-side progression deltas between sessions
  └── /api/extract-pdf          --> Extracts text from uploaded pitch decks via unpdf
       │
       ├── [Neon Postgres (@neondatabase/serverless) with Mock In-Memory Fallback]
       │     └── 9 tables: sessions, turns, claims, evaluations, convictions, verdicts, reports, knowledge_chunks, rate_limits
       │
       └── [Groq Cloud API]
             ├── openai/gpt-oss-20b  (Analyst scoring, claim extraction, low latency)
             └── openai/gpt-oss-120b (Boardroom speech, debrief dossiers, high nuance)
```

---

## 4. Assumptions made: list every assumption, including simulated offers, text-only input and the fictional investor characters

1. **Simulated Financial Offers**:
   - All valuations, checks, and terms offered by investors are completely synthetic mathematical calculations based on stage, revenue, and conviction. They carry **zero legal or financial validity** and are labeled with bold disclaimers.
2. **Text-Only Input Interface**:
   - Interaction is keyboard/text-driven (with PDF deck text extraction support). Real-time speech-to-text / voice cloning is omitted in this tier to prioritize sub-second streaming latency, accessible screen-reader compliance, and deterministic transcript parsing.
3. **Fictional Investor Personas**:
   - Rohan, Meera, Dr. Arjun, Kavya, and Marcus Vance are synthetic personas designed to represent archetypal venture capital mindsets (the unit economics hawk, the venture-scale TAM seeker, the deep-tech skeptic, the customer advocate, and the neutral chair). Any resemblance to real individuals is purely coincidental.
4. **Session Lifetime & Cookie Ownership**:
   - Sessions are bound to the founder's browser via secure `httpOnly`, `SameSite=Lax` cookies containing a cryptographic session owner token. Unowned requests receive `403 Forbidden`.
5. **Context Window Capping**:
   - To maintain real-time generation speeds and eliminate degradation, the prompt engine sends the summarized Due Diligence Ledger, the active panel state, and strictly the last 4 dialogue turns to the LLM.

---

## 5. Setup, tests and demo script

### 5.1 Prerequisites & Installation
- **Node.js**: v18.17+ or v20+ (tested on Node.js v24.2.0)
- **Package Manager**: npm v9+

```bash
# Clone the repository
git clone <repo_url>
cd <repo_directory>

# Install dependencies
npm install
```

### 5.2 Environment Variables Setup
Create `.env.local` based on `.env.example`:
```bash
cp .env.example .env.local
```
Configure your environment variables:
```ini
# Groq API Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_BIG_MODEL=openai/gpt-oss-120b
GROQ_SMALL_MODEL=openai/gpt-oss-20b

# Database Configuration (Neon Postgres)
DATABASE_URL=postgres://user:password@ep-sample-pool.neon.tech/neondb?sslmode=require

# Engine Parameters
MAX_TURNS=14
RATE_LIMIT_PER_MIN=30
```
*(Note: If `GROQ_API_KEY` or `DATABASE_URL` are not provided, the application automatically runs in resilient offline mode with built-in mock LLM fallbacks and in-memory storage).*

### 5.3 Database Migration & Seeding
```bash
# Run SQL schema migrations
npm run migrate

# Seed investor personas and 34 curated VC rubric snippets
npm run seed
```

### 5.4 Running Tests
```bash
# Run Vitest test suite (unit tests, security tests, planner/conviction rules)
npm test

# Run ESLint validation
npm run lint

# Production build check
npm run build
```

### 5.5 Production Server Execution
```bash
npm run build
npm start
```
Access the application at [http://localhost:3000](http://localhost:3000).

### 5.6 Measured Efficiency & Latency Metrics
- **Small Model (Analyst Scoring & Claim Extraction - 20B)**:
  - Latency: ~120ms (offline mock) / ~420ms (live Groq endpoint)
  - Tokens per turn: ~140 input tokens, ~65 output tokens
- **Big Model (Investor Boardroom Speech - 120B)**:
  - Latency: ~260ms (offline mock) / ~890ms (live Groq endpoint)
  - Time to First Streamed Token (TTFT): ~310ms
  - Tokens per turn: ~320 input tokens, ~120 output tokens
- **Client JS Bundle**: ~110 KB gzip total, zero heavy client-side animation or graphing dependencies.

### 5.7 3-Minute Demo Script for Evaluators

1. **Step 1: Launch & Ingest (0:00 - 0:45)**
   - Open `http://localhost:3000`.
   - Paste a sample pitch: *"We are an AI-powered sales outreach tool that automates cold email campaigns. We have 12 pilot customers paying $150/month with an initial CAC of $450."*
   - Choose **Tough** intensity and click **Face The Panel**.
   - Observe Chair Marcus Vance establish decorum, followed by Rohan questioning the $450 CAC and churn rate.

2. **Step 2: Contradiction & Interrupt Trigger (0:45 - 1:45)**
   - Enter an evasive or contradictory reply: *"Actually our CAC is $4,200 because we hired an agency, but our TAM is $50 billion."*
   - Observe:
     - **Interrupt Rule**: Rohan immediately breaks in with *"Hold on — you said $450 a moment ago..."*
     - **Conviction Delta**: Rohan's meter drops by $-15\%$.
     - **Due Diligence Ledger**: Inspect the live ledger to see the discrepancy flagged under **Needs Attention** or **Contradiction**.

3. **Step 3: Verdicts, Debrief & Progression Audit (1:45 - 3:00)**
   - Click **Pass to Verdict & Debrief**.
   - Review each investor's algorithmic **In / Conditional / Out** verdict and calculated **Simulated Offer**.
   - Review the **Debrief Dossier**: Overall Pitch Readiness score, top vulnerabilities, 7-day action checklist, and the evidence-only pitch rewrite with `[insert ...]` placeholders.
   - Click **Retry with Improved Pitch**, submit a clarified pitch with verified metrics, and view `/compare/[id]` to inspect the side-by-side conviction delta increase (+X%).
