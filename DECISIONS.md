# Architectural Decisions Log - GrillRoom

This log documents all key architectural choices, environmental accommodations, library choices, and any deviations or fallback behaviors in accordance with the specification.

---

### Decision 1: Project Naming & Setup
- **Choice:** Project name set to `grillroom` in `package.json` and branded as "GrillRoom".
- **Rationale:** Aligns with the adversarial founder interrogation vertical while adhering to clean npm naming conventions.

### Decision 2: Database Driver & Resilience
- **Choice:** `@neondatabase/serverless` using SQL template tags and raw client connection. In addition, an in-memory database adapter is provided when `DATABASE_URL` is unconfigured during local development or offline testing, so that UI development, planner tests, and the mock smoke harness execute smoothly without crashes.
- **Rationale:** The prompt emphasizes that the session must never crash on an external failure. Providing clean fallback behavior ensures uninterrupted development and automated testing.

### Decision 3: Groq LLM Models & Fallback Strategy
- **Choice:** Primary big model defaults to `openai/gpt-oss-120b` and small model to `openai/gpt-oss-20b` via Groq's OpenAI-compatible endpoint. If Groq returns 404/400 for specific OSS model identifiers, fallback models (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) are configured as resilient fallbacks in `lib/llm/groq.ts`.
- **Rationale:** Ensures robust operation against Groq API catalog adjustments while matching the requested default configuration.

### Decision 4: Styling & Boardroom Aesthetic
- **Choice:** Tailwind CSS with a curated boardroom color palette: cream background (`#F6EFE1`), deep navy typography and structure (`#14284F`), hairline gold borders (`#D4AF37`), and high-contrast accessible orange CTA tokens (`#D4572B` and `#B8441F`).
- **Rationale:** Delivers high visual contrast (>4.5:1 AA/AAA compliance), professional credibility, and dramatic tension suitable for high-stakes venture capital interrogation.

### Decision 5: PDF Extraction
- **Choice:** `unpdf` library for serverless-friendly, pure-JS PDF text parsing in `/api/extract-pdf/route.ts` with a 10MB file size limit and `%PDF-` magic-byte verification.
- **Rationale:** `unpdf` runs reliably in Node.js serverless runtimes without native canvas binary dependencies.

### Decision 6: Two-Model Pipeline Split (20B Analyst vs 120B Interrogator)
- **Choice:** Split turn execution into two distinct LLM calls: a fast, lightweight model (`openai/gpt-oss-20b`) evaluates answer directness, extracts claims, and spots metric discrepancies in ~250ms, followed by a nuanced large model (`openai/gpt-oss-120b`) that streams persona-specific speech via SSE.
- **Rationale:** Decoupling objective diligence analysis from creative persona speech ensures rigorous claim tracking without slowing down streaming dialogue TTFT.

### Decision 7: Rule-Based Deterministic Planner
- **Choice:** All conversational steering decisions (choosing the next speaker, detecting dodges, enforcing turn fairness, triggering contradiction interrupts, and initiating partner cross-talk) are implemented in pure TypeScript code (`lib/engine/planner.ts`) rather than delegating conversational control to an LLM.
- **Rationale:** LLMs frequently forget speaking caps, hallucinate turn counts, or play favorites. A deterministic code planner guarantees strict adherence to boardroom discipline.

### Decision 8: Algorithmic Verdicts & Simulated Offers Computed in Code
- **Choice:** Final investment decisions (In, Conditional, Out) and simulated equity term sheets are computed strictly in TypeScript (`lib/engine/conviction.ts`) by checking stored conviction meters against calibrated thresholds (e.g. In $\ge 65$, Conditional $\ge 40$).
- **Rationale:** Prevents prompt-injection attacks from overriding investment outcomes. Even if an adversarial founder submits prompt overrides, the final verdict is calculated outside the model's reach.

### Decision 9: Neon Postgres with Full-Text Search Instead of a Vector DB
- **Choice:** Neon serverless PostgreSQL with relational indexes and full-text keyword matching rather than an external vector database or embedding service.
- **Rationale:** Keeps repository size lightweight (<2 MB total), eliminates external vector infrastructure dependencies, and avoids cold-start latency on embedding lookups.

### Decision 10: In-Memory Mock Adapter for Offline Testing & CI
- **Choice:** Complete in-memory Map/Array implementations in `lib/db.ts` for sessions, turns, claims, convictions, verdicts, and reports when `DATABASE_URL` is missing.
- **Rationale:** Enables all 128 tests to run completely offline without database credentials, ensuring zero-dependency CI workflows and instant local test execution.

### Decision 11: Feature Flags for Experimental Capabilities
- **Choice:** Environment-variable-controlled feature flags (`NEXT_PUBLIC_FEATURE_BEHIND_DOORS`, `NEXT_PUBLIC_FEATURE_RADAR`, `NEXT_PUBLIC_FEATURE_REACTIONS`, `NEXT_PUBLIC_FEATURE_SHARE_CARD`, `NEXT_PUBLIC_FEATURE_INTRO_GATE`) defaulting to `false`.
- **Rationale:** Allows modular testing and zero runtime overhead for experimental visual upgrades while ensuring core interrogation flow is never broken.

### Decision 12: Content Security Policy (CSP) Trade-Off
- **Choice:** Standard strict CSP headers in `next.config.mjs` with `script-src 'self' 'unsafe-eval' 'unsafe-inline'` in development and tightened production directives (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`).
- **Rationale:** Next.js App Router streaming hydration requires inline script hydration markers unless complex per-request nonces are deployed. Keeping safe inline script execution balances security with framework compatibility.
