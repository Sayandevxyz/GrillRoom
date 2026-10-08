# 🔥 GrillRoom: Adversarial AI Investor Simulation

**Live Demo**: [https://grill-room-ten.vercel.app/](https://grill-room-ten.vercel.app/)

> "A panel of AI investors who remember everything you say, catch your contradictions, and show you how to give a better answer."

---

### Screenshots
| Landing Lobby | Boardroom Interrogation |
| :---: | :---: |
| ![Landing Lobby](docs/screenshots/landing.png) | ![Session Interrogation](docs/screenshots/session.png) |
| **Algorithmic Verdicts** | **Debrief Dossier** |
| ![Verdicts](docs/screenshots/verdict.png) | ![Debrief Dossier](docs/screenshots/debrief.png) |

*(Placeholder paths configured under `docs/screenshots/` with `.gitkeep` tracker).*

---

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

## 2. Approach and logic: panel design, Claim Ledger (shown as the Due Diligence Ledger in the UI), question taxonomy, planner rules, conviction model, verdicts computed in code

### 2.1 Panel Design & Personalities
The boardroom features up to five distinct venture archetypes and one neutral Chair:
- **Rohan (The Numbers Shark / CFO)**: Obsessed with unit economics, CAC, LTV, payback periods, and gross margins. Distrusts hand-waving and "we will monetize later" narratives. Signature question: *"What does it cost you to acquire and serve one customer, and what do they pay you?"*
- **Meera (The Market Hawk / Growth VC)**: Focuses on bottom-up TAM/SAM, adoption velocity, and wedge strategies. Distrusts top-down "1% of a huge market" claims. Signature question: *"Build the market size bottom-up. Who is customer number one thousand?"*
- **Dr. Arjun (The Builder / Deep-Tech Lead)**: Scrutinizes technical defensibility, moats, proprietary architecture, and replication barriers. Distrusts thin wrappers over third-party APIs. Signature question: *"If a funded team copied this in three months, what could they not copy?"*
- **Kavya (The Customer Voice / Product Strategist)**: Probes user behavior, observed switching friction, and customer interviews. Distrusts assumed demand. Signature question: *"Tell me about the last five people you spoke to. What did they do, not say?"*
- **Sam (The Founder Whisperer / Seed Angel)**: Assesses founder grit, execution velocity, and founder-market fit. Signature question: *"What has surprised you most about your users in the last 30 days?"*
- **Marcus Vance (Independent Chair)**: Impartial moderator who introduces the boardroom, enforces speaking discipline, handles transitions, and formally closes deliberations.

**Panel Selection Logic**:
- In **Tough** and **Friendly** modes, the panel consists of **4 investors** (the core 3: Rohan, Meera, Sam, plus a 4th specialist: Dr. Arjun for deep-tech/SaaS or Kavya for consumer/impact).
- In **Shark** mode, all **5 investors** sit simultaneously for maximum pressure.

### 2.2 The Due Diligence Ledger
Every factual assertion made by the founder is extracted into an active relational Due Diligence Ledger with schema:
- `id`, `session_id`, `claim_text`, `category` (problem, market, traction, revenue_model, unit_economics, competition, moat, team, technology, impact, ask), `status`, `severity` (1–5), `thread_state`, `ladder_level`, `followups_used`, `last_asked_by`, `source_turn`.
- **Status State Machine**:
  - `unverified`: Initial state of new assertions (presented in UI as "Needs Proof").
  - `evidenced`: Backed by verifiable sources, methodology, or operating data.
  - `contradicted`: Clashes directly with earlier turns or verified numbers.
  - `conceded`: Founder acknowledged an assertion was ungrounded.
- Discrepancies (e.g. CAC moving from $450 to $4,200) trigger immediate contradiction interrupts.

### 2.3 Question Taxonomy
Questions are categorized into strict taxonomies to prevent generic small-talk:
1. `number_challenge`: Probing specific quantitative claims and metrics.
2. `contradiction_callout`: Immediate interrupt confronting conflicting statements.
3. `dodge_return`: Repeating and re-anchoring dodged or evasive questions.
4. `vagueness_escalation`: Escalating depth ladder on vague, unsubstantiated assertions.
5. `forced_calculation`: Forcing granular unit payback or margin arithmetic.
6. `stress_test`: Testing resilience against adverse market conditions (churn spikes, CAC doubling).
7. `why_you_why_now`: Challenging founder-market fit and timing urgency.
8. `kill_question`: High-stakes make-or-break question during round 3.
9. `clarifying`: Granular operational questions opening new diligence threads.

### 2.4 Planner Rules
A deterministic rule engine in TypeScript (`lib/engine/planner.ts`) selects the next speaker to preserve realistic boardroom dynamics:
- **Interrupt Rule**: If the analyst detects a contradiction with severity $\ge 3$, the category specialist immediately interrupts (prefixed with *"Hold on —"*).
- **Dodge Rule**: If the founder evades or gives vague answers, the active investor escalates the question ladder level on the open thread.
- **Fairness Rule**: Investors with fewer spoken turns receive mathematical priority ($1 - \text{turnsSpoken} / \text{totalTurns}$) to prevent domination.
- **Cross-Talk Rule**: Inter-investor reactions occur when partner conviction scores diverge by $\ge 30$ points (with a 3-turn cooldown).
- **Turn Cap**: Maximum 2 consecutive turns per investor in tough mode (1 in friendly, 3 in shark).

### 2.5 Conviction Model (0–100%)
Each investor maintains an independent conviction score computed deterministically in code:
- **Baseline**: Starts at 50% for all panelists.
- **Delta Computation**:
  - Clamped to $\pm 15\%$ per turn.
  - **Sanity Checks**: Answers with average score $\ge 7$ cannot produce negative deltas; answers with score $\le 3$ cannot produce positive deltas.
- **Clamping**: Strictly bounded to $[0, 100]$.

### 2.6 Verdicts Computed in Code
Unlike naive LLM simulators where the model hallucinates an arbitrary outcome, verdicts are strictly evaluated algorithmically in TypeScript (`lib/engine/conviction.ts`):
- **Tough Mode (Default)**:
  - **IN**: Conviction $\ge 65\%$. Generates a calculated Simulated Offer (e.g., "$500,000 for 10% equity").
  - **CONDITIONAL**: Conviction between $40\%$ and $64\%$. Includes explicit conditions precedent (e.g., "$500,000 for 15% equity, subject to customer reference audit").
  - **OUT**: Conviction $< 40\%$. No offer made.
- **Friendly Mode**: In $\ge 60\%$, Conditional $35\%-59\%$, Out $< 35\%$.
- **Shark Mode**: In $\ge 72\%$, Conditional $45\%-71\%$, Out $< 45\%$.
- **All offers carry mandatory simulation warnings**: `⚠️ SIMULATED OFFER FOR SIMULATION PURPOSES ONLY`.

---

## 3. How the solution works: end-to-end flow plus a text architecture description

### 3.1 End-to-End User Flow
1. **Pitch Ingestion (`/`)**:
   - Founder enters company summary, target audience, pricing, and traction, or drops a PDF pitch deck (parsed server-side via `unpdf` with `%PDF-` magic-byte verification).
   - Selects intensity: **Friendly**, **Tough**, or **Shark**.
2. **Boardroom Stage (`/session/[id]`)**:
   - Independent Chair Marcus Vance welcomes the founder and sets boardroom expectations.
   - The first shark challenges the founder's core assertion.
   - **Real-Time Turn Exchange**: Founder responds via text. The background 20B Analyst evaluates directness, extracts claims, and updates conviction deltas. The 120B Investor streams back authentic dialogue via Server-Sent Events (`text/event-stream`).
   - **Due Diligence Ledger**: Live drawer categorizes claims into **Verified** and **Needs Attention / Proof**.
3. **Verdict & Debrief (`/session/[id]/debrief`)**:
   - Code calculates final verdicts and simulated term sheets.
   - The 120B model compiles an unsparing **Debrief Dossier**:
     - Overall Pitch Readiness Score (0–100).
     - Breakdown by criteria (Directness, Specificity, Evidence, Logic, Honesty).
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
[Next.js 15 App Router API Layer (React 19)]
  ├── /api/session/start        --> Validates input (Zod), sets owner_token cookie, seeds Due Diligence Ledger, delivers Chair intro
  ├── /api/session/answer (SSE) --> 
  │     ├─ Step 1: 20B Analyst evaluates founder response (directness, metric extraction, contradiction flags)
  │     ├─ Step 2: Code engine updates Due Diligence Ledger & recomputes Conviction (0-100%)
  │     ├─ Step 3: Planner selects next investor using deterministic rules (interrupt, dodge, fairness, turn caps)
  │     └─ Step 4: 120B Investor streams persona-grounded speech with SSE back to browser
  ├── /api/session/verdict      --> Computes algorithmic In/Conditional/Out verdicts and simulated term sheets
  ├── /api/session/debrief      --> Synthesizes evidence-grounded debrief dossier with [insert ...] placeholders
  ├── /api/session/retry        --> Forks linked session with inherited parent context for progression tracking
  ├── /api/session/compare      --> Computes side-by-side progression deltas between sessions
  ├── /api/session/behind-doors --> Generates confidential partner deliberation dialogue
  ├── /api/session/radar        --> Computes 5-axis pitch competency scores
  ├── /api/share-card/[id]      --> Generates dynamic social preview card (og:image)
  └── /api/extract-pdf          --> Extracts text from uploaded decks with magic-byte validation via unpdf
       │
       ├── [Neon Postgres (@neondatabase/serverless) with Mock In-Memory Fallback]
       │     └── 9 tables: sessions, turns, claims, evaluations, convictions, verdicts, reports, rate_limits, behind_doors_scenes
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
   - Rohan, Meera, Dr. Arjun, Kavya, and Marcus Vance are synthetic personas designed to represent archetypal venture capital mindsets. Any resemblance to real individuals is purely coincidental.
4. **Session Lifetime & Cookie Ownership**:
   - Sessions are bound to the founder's browser via secure `httpOnly`, `SameSite=Lax` cookies containing a cryptographic session owner token. Unowned requests receive `403 Forbidden`.
5. **Context Window Capping**:
   - To maintain real-time generation speeds and eliminate degradation, the prompt engine sends the active Due Diligence Ledger, the active panel state, and strictly the relevant dialogue turns to the LLM.

---

## 5. Setup, tests and demo script

### 5.1 Prerequisites & Installation
- **Node.js**: v18.17+ or v20+ LTS
- **Package Manager**: npm v9+

```bash
# Clone the repository
git clone https://github.com/rajrishabh23959-oss/GrillRoom.git
cd GrillRoom

# Clean install dependencies
npm ci
```

### 5.2 Environment Variables Setup
Create `.env.local` based on `.env.example`:
```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| :--- | :---: | :--- |
| `GROQ_API_KEY` | Optional (offline mock available) | Groq API key for live 20B/120B model inference |
| `GROQ_BASE_URL` | Optional | Groq API endpoint (defaults to `https://api.groq.com/openai/v1`) |
| `GROQ_BIG_MODEL` | Optional | Primary 120B model (defaults to `openai/gpt-oss-120b`) |
| `GROQ_SMALL_MODEL` | Optional | Fast 20B model (defaults to `openai/gpt-oss-20b`) |
| `DATABASE_URL` | Optional (in-memory mock available) | Neon PostgreSQL connection string |
| `MAX_TURNS` | Optional | Turn limit cap per session (defaults to `14`) |
| `RATE_LIMIT_PER_MIN` | Optional | Max requests per IP per minute (defaults to `30`) |

### Feature Flags Table
| Flag | Default | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_FEATURE_INTRO_GATE` | `false` | Interactive audio onboarding gate on entering session |
| `NEXT_PUBLIC_FEATURE_REACTIONS` | `false` | Real-time panelist reaction badges based on conviction shift |
| `NEXT_PUBLIC_FEATURE_RADAR` | `false` | 5-axis pitch competency radar chart on debrief page |
| `NEXT_PUBLIC_FEATURE_SHARE_CARD` | `false` | Dynamic social sharing preview card generator |
| `NEXT_PUBLIC_FEATURE_BEHIND_DOORS` | `false` | Post-pitch "Behind Closed Doors" partner deliberation scene |

### 5.3 Database Migration & Seeding
```bash
# Run SQL schema migrations
npm run migrate

# Seed investor personas and curated VC rubrics
npm run seed
```

### 5.4 Testing and Accessibility Verification
The test suite consists of **128 tests across 12 test suites** executed via Vitest 2:
```bash
# Run all tests offline (mocked DB and LLM)
npm test

# Run tests with V8 code coverage report
npm run test:coverage

# TypeScript strict type checking
npm run typecheck

# ESLint validation
npm run lint
```

**Real Test Measurements**:
- **Test Count**: 128 passing tests across 12 test files.
- **Coverage**: **50.2% overall project coverage**, with **87.7% on core engine (`lib/engine`)**, **100% on conviction math**, **100% on security sanitization**, and **100% on engine constants**.
- **Automated Axe Accessibility**: 0 critical or serious violations on all UI components (`Stepper`, `Tabs`, `Meter`, `Button`, `Field`, `Dialog`).
- **Color Contrast**: All primary text pairs exceed WCAG 2.1 AA/AAA minimums (Navy on Cream: **12.8:1 AAA**, Accessible Orange on Cream: **5.3:1 AA**).

### 5.5 Security Hardening
- **Strict Zod Validation**: Pitch text clamped to 50–6000 chars, answers to 1–4000 chars, UUID validation on all IDs.
- **Upload Safety**: PDF uploads capped at 10 MB with MIME validation and `%PDF-` magic-byte verification.
- **Atomic Rate Limiter**: IP-based rate limiting using atomic SQL `INSERT ... ON CONFLICT DO UPDATE`.
- **Security Headers**: Production Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Untrusted Input Wrapping**: Founder and PDF content is safely isolated inside `<founder_text>` delimiters.
- **No Stack Traces Leaked**: Internal exceptions logged server-side with random short error IDs (`err_...`).

### 5.6 Limitations
1. **Text-Driven Simulation**: Interrogation is text-based; voice synthesis and live audio streaming are not included.
2. **Synthetic Financial Estimates**: Term sheets and valuations are illustrative algorithmic demonstrations, not legally binding term sheets.
3. **External LLM Uptime**: Real-time generation requires active Groq endpoint availability (offline mock executes if unconfigured).
4. **Browser Cookie Dependency**: Ownership verification requires `httpOnly` cookie support in the user's browser.

### 5.7 3-Minute Demo Script for Evaluators
1. **Step 1: Launch & Ingest (0:00 - 0:45)**
   - Open `http://localhost:3000`.
   - Paste a sample pitch: *"We are an AI-powered enterprise procurement platform that automates vendor compliance audits. We have 12 pilot customers paying $500/month with an initial CAC of $450."*
   - Choose **Tough** intensity and click **Face The Panel**.
   - Observe Chair Marcus Vance establish boardroom decorum, followed by Rohan questioning unit payback.
2. **Step 2: Contradiction & Interrupt Trigger (0:45 - 1:45)**
   - Enter an evasive or contradictory reply: *"Actually our CAC is $4,200 because we hired an agency, but our TAM is $50 billion."*
   - Observe:
     - **Interrupt Rule**: Rohan immediately breaks in with *"Hold on — you said $450 a moment ago..."*
     - **Conviction Delta**: Rohan's meter drops by $-15\%$.
     - **Due Diligence Ledger**: The live drawer flags the discrepancy under **Needs Attention / Contradiction**.
3. **Step 3: Verdicts, Debrief & Progression Audit (1:45 - 3:00)**
   - Click **Pass to Verdict & Debrief**.
   - Review each investor's algorithmic **In / Conditional / Out** verdict and calculated **Simulated Offer**.
   - Review the **Debrief Dossier**: Overall Pitch Readiness score, top vulnerabilities, 7-day action checklist, and the evidence-only pitch rewrite with `[insert ...]` placeholders.
   - Click **Retry with Improved Pitch**, submit a clarified pitch with verified metrics, and view `/compare/[id]` to inspect the side-by-side conviction delta increase (+X%).

---

### Lineage
Built for the CSE Hackathon, inheriting architectural learnings and UI components from the VCRAFT AI exploration.

### Team and License
- **Team**: GrillRoom Team
- **License**: [MIT License](LICENSE)
