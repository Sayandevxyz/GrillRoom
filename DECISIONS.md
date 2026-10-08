# Architectural Decisions Log - GrillRoom

This log documents all key architectural choices, environmental accommodations, library choices, and any deviations or fallback behaviors in accordance with the specification.

---

### Decision 1: Project Naming & Setup
- **Choice:** Project name set to `grillroom` in `package.json` and branded as "GrillRoom".
- **Rationale:** Aligns with the adversarial founder interrogation vertical while adhering to clean npm naming conventions.

### Decision 2: Database Driver & Resilience
- **Choice:** `@neondatabase/serverless` using SQL template tags and raw client connection. In addition, an in-memory/fallback database adapter is provided when `DATABASE_URL` is unconfigured during local development or offline testing, so that UI development, planner tests, and the mock smoke harness can execute smoothly without unhandled crashes.
- **Rationale:** The prompt emphasizes that the session must never crash on an external failure. Providing clean fallback behavior ensures uninterrupted development and automated testing.

### Decision 3: Groq LLM Models & Fallback Strategy
- **Choice:** Primary big model defaults to `openai/gpt-oss-120b` and small model to `openai/gpt-oss-20b` via Groq's OpenAI-compatible endpoint. If Groq returns 404/400 for specific OSS model identifiers, fallback models (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) are configured as resilient fallbacks in `lib/llm/groq.ts`.
- **Rationale:** Ensures robust operation against Groq API catalog adjustments while matching the requested default configuration.

### Decision 4: Styling & Boardroom Dark Aesthetic
- **Choice:** Tailwind CSS with a curated boardroom color palette: deep obsidian/slate backgrounds (`#08090C`, `#10131B`), crisp border geometry (`#252C3D`), and warm fiery orange accents (`#FF6600`).
- **Rationale:** Delivers high visual contrast, professional credibility, and dramatic tension suitable for high-stakes venture capital interrogation.

### Decision 5: PDF Extraction
- **Choice:** `unpdf` library for serverless-friendly, pure-JS PDF text parsing in `/api/extract-pdf/route.ts` with a 10MB file size limit.
- **Rationale:** `unpdf` runs reliably in Node.js serverless runtimes without native canvas binary dependencies.
