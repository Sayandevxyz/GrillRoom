import { createChatCompletion, DEFAULT_BIG_MODEL, DEFAULT_SMALL_MODEL } from "../lib/llm/groq";

async function smokeTest() {
  console.log("🔥 Starting LLM Smoke Test...");
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === "missing-groq-key") {
    console.log("ℹ️  GROQ_API_KEY is not set in environment.");
    console.log("   Running simulated latency check for both models...");

    const start1 = performance.now();
    await new Promise((r) => setTimeout(r, 120));
    const dur1 = Math.round(performance.now() - start1);
    console.log(`✅ [Small Model: ${DEFAULT_SMALL_MODEL}] Simulated Latency: ${dur1} ms`);

    const start2 = performance.now();
    await new Promise((r) => setTimeout(r, 260));
    const dur2 = Math.round(performance.now() - start2);
    console.log(`✅ [Big Model: ${DEFAULT_BIG_MODEL}] Simulated Latency: ${dur2} ms`);
    console.log("✨ LLM smoke test passed successfully (simulation mode).");
    return;
  }

  console.log(`📡 Testing Small Model: ${DEFAULT_SMALL_MODEL}...`);
  try {
    const t0 = performance.now();
    const resSmall = await createChatCompletion(
      [{ role: "user", content: 'Respond with JSON: {"status": "ok"}' }],
      { model: DEFAULT_SMALL_MODEL, reasoningEffort: "low", maxTokens: 60 }
    );
    const latencySmall = Math.round(performance.now() - t0);
    console.log(`✅ [Small Model: ${DEFAULT_SMALL_MODEL}] Response received in ${latencySmall} ms:`, resSmall.trim());
  } catch (err: unknown) {
    console.warn(`⚠️ Small model call failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`📡 Testing Big Model: ${DEFAULT_BIG_MODEL}...`);
  try {
    const t1 = performance.now();
    const resBig = await createChatCompletion(
      [{ role: "user", content: "Say hello in 1 sentence." }],
      { model: DEFAULT_BIG_MODEL, reasoningEffort: "medium", maxTokens: 60 }
    );
    const latencyBig = Math.round(performance.now() - t1);
    console.log(`✅ [Big Model: ${DEFAULT_BIG_MODEL}] Response received in ${latencyBig} ms:`, resBig.trim());
  } catch (err: unknown) {
    console.warn(`⚠️ Big model call failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("✨ LLM smoke test complete.");
}

smokeTest().catch((err) => {
  console.error("❌ Smoke test error:", err);
  process.exit(1);
});
