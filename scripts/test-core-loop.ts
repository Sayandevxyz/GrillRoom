async function testCoreLoop() {
  console.log("🧪 Testing Phase 4 Core Interrogation Loop against http://localhost:3000...");

  // 1. Start Session
  const pitch =
    "We have built ApexShield, an autonomous AI security scanner for fintech infrastructure. We charge $4,000 per month on annual contracts. We have 12 signed pilot customers and $48,000 in monthly recurring revenue. Our customer acquisition cost is $650, which pays back in less than 2 months. We are seeking $750,000 for 10% equity.";

  const startRes = await fetch("http://localhost:3000/api/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idea: pitch,
      industry: "Technology / AI",
      stage: "Seed",
      ask: "$750,000 for 10%",
      intensity: "tough",
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Start session failed (${startRes.status}): ${err}`);
  }

  const cookieHeader = startRes.headers.get("set-cookie") || "";
  const ownerCookie = cookieHeader.split(";")[0];
  const startData = await startRes.json();

  console.log("✅ Session started successfully!");
  console.log(`   Session ID: ${startData.sessionId}`);
  console.log(`   Panel: ${(startData.panel as Array<{ name: string }>).map((p) => p.name).join(", ")}`);
  console.log(`   Initial Claims: ${startData.initialClaims.length}`);
  console.log(`   Initial Turns: ${startData.initialTurns.length}`);
  console.log(`   Chair Intro: "${startData.initialTurns[0].text.slice(0, 60)}..."`);
  console.log(`   First Question (${startData.initialTurns[1].speakerName}): "${startData.initialTurns[1].text}"`);

  // Scripted answers for turns (testing directness, numbers, and an intentional contradiction)
  const answers = [
    "We acquire customers through outbound engineering demos. Our sales cycle is 18 days with an average contract value of $48,000.",
    "Our CAC of $650 is calculated directly by taking our outbound SDR software costs and demo pipeline expenses over our first cohort of 12 customers.",
    "Actually, our CAC is $4,500 and we only have 2 enterprise customers live right now.", // Contradiction test
    "The core defensibility is our proprietary AST static analysis parser which operates with zero hallucination on Rust and Go microservices.",
  ];

  let currentClaimsCount = startData.initialClaims.length;

  for (let i = 0; i < answers.length; i++) {
    console.log(`\n💬 Submitting Turn ${i + 1}...`);
    console.log(`   Founder: "${answers[i]}"`);

    const answerRes = await fetch("http://localhost:3000/api/session/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify({
        sessionId: startData.sessionId,
        answer: answers[i],
      }),
    });

    if (!answerRes.ok) {
      const err = await answerRes.text();
      throw new Error(`Answer failed at turn ${i + 1} (${answerRes.status}): ${err}`);
    }

    const text = await answerRes.text();
    // Parse SSE stream events
    const lines = text.split("\n\n");
    let speaker = "";
    let questionType = "";
    let isInterrupt = false;
    let tokens = "";
    let finalState: { meters?: Record<string, number>; claims?: Array<{ status: string }> } | null = null;

    for (const chunk of lines) {
      const parts = chunk.split("\n");
      let ev = "";
      let dt = "";
      for (const p of parts) {
        if (p.startsWith("event: ")) ev = p.slice(7).trim();
        if (p.startsWith("data: ")) dt = p.slice(6).trim();
      }
      if (!dt) continue;
      const parsed = JSON.parse(dt);
      if (ev === "meta") {
        speaker = parsed.speakerName;
        questionType = parsed.questionType;
        isInterrupt = parsed.isInterrupt;
      } else if (ev === "token") {
        tokens += parsed.token;
      } else if (ev === "state") {
        finalState = parsed;
      }
    }

    console.log(`   Investor (${speaker}) [${questionType}] ${isInterrupt ? "[INTERRUPTING]" : ""}:`);
    console.log(`   "${tokens.trim()}"`);
    if (finalState) {
      console.log(`   Meters: ${JSON.stringify(finalState.meters)}`);
      if (finalState.claims) {
        console.log(`   Total Ledger Claims: ${finalState.claims.length}`);
        const contradicted = finalState.claims.filter((c) => c.status === "contradicted");
        if (contradicted.length > 0) {
          console.log(`   ⚠️ Contradictions detected in ledger: ${contradicted.length}`);
        }
      }
    }
  }

  console.log("\n🎉 Phase 4 Core Interrogation Loop test PASSED successfully!");
}

testCoreLoop().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
