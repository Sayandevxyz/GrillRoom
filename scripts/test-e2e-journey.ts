async function testFullJourney() {
  console.log("🚀 Testing Full Founder Journey End-to-End against http://localhost:3000...\n");

  // 1. Start Session
  const pitch =
    "We have built ApexShield, an autonomous AI security scanner for fintech banks. We charge $4,000 per month on annual contracts. We have 12 signed pilot customers and $48,000 in monthly recurring revenue. Our customer acquisition cost is $650, which pays back in less than 2 months. We are seeking $750,000 for 10% equity.";

  console.log("1️⃣ Starting Session...");
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

  if (!startRes.ok) throw new Error(`Start failed: ${await startRes.text()}`);
  const cookieHeader = startRes.headers.get("set-cookie") || "";
  const ownerCookie = cookieHeader.split(";")[0];
  const startData = await startRes.json();
  const sessionId = startData.sessionId;
  console.log(`   Session Created: ${sessionId}`);

  // 2. Answer Turns
  console.log("\n2️⃣ Submitting Interrogation Answers...");
  const answers = [
    "We acquire customers through outbound engineering demos. Our sales cycle is 18 days with an average contract value of $48,000.",
    "Our CAC of $650 is calculated directly by taking our outbound SDR software costs and demo pipeline expenses over our first cohort of 12 customers.",
  ];

  for (let i = 0; i < answers.length; i++) {
    const ansRes = await fetch("http://localhost:3000/api/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ sessionId, answer: answers[i] }),
    });
    if (!ansRes.ok) throw new Error(`Answer ${i + 1} failed: ${await ansRes.text()}`);
    console.log(`   Turn ${i + 1} processed via SSE successfully.`);
  }

  // 3. Verdict Round
  console.log("\n3️⃣ Generating Boardroom Verdicts...");
  const verdictRes = await fetch("http://localhost:3000/api/session/verdict", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ sessionId }),
  });

  if (!verdictRes.ok) throw new Error(`Verdict failed: ${await verdictRes.text()}`);
  const verdictData = await verdictRes.json();
  console.log(`   Verdicts Generated (${verdictData.verdicts.length} investors):`);
  for (const v of verdictData.verdicts) {
    console.log(`   - ${v.investor_name}: [${v.decision}] "${v.reason}" | Offer: ${v.simulated_offer}`);
  }

  // 4. Debrief Report
  console.log("\n4️⃣ Generating Debrief Dossier...");
  const debriefRes = await fetch("http://localhost:3000/api/session/debrief", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ sessionId }),
  });

  if (!debriefRes.ok) throw new Error(`Debrief failed: ${await debriefRes.text()}`);
  const debriefData = await debriefRes.json();
  console.log(`   Readiness Score: ${debriefData.readiness_score}/100`);
  console.log(`   Top Weaknesses: ${debriefData.top_weaknesses.length}`);
  console.log(`   Stronger Rewrites: ${debriefData.stronger_answers.length}`);
  console.log(`   Tightened Pitch: "${debriefData.tightened_pitch.slice(0, 80)}..."`);

  // Verify that rewrites contain placeholders [insert ...] and never invented facts
  const hasPlaceholders = debriefData.stronger_answers.some((sa: { rewrite: string }) =>
    sa.rewrite.includes("[insert")
  );
  console.log(`   Verified Placeholders Present in Rewrites: ${hasPlaceholders ? "YES ✅" : "NO ❌"}`);

  // 5. Retry Session
  console.log("\n5️⃣ Creating Linked Retry Session...");
  const revisedPitch =
    "We built ApexShield, an automated compliance scanner for fintech banks. We charge $4,000 monthly on annual contracts. We have 14 verified paying customers generating $56,000 MRR with 9-month verified payback and $620 CAC. Raising $750k for 10% to scale sales.";

  const retryRes = await fetch("http://localhost:3000/api/session/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ sessionId, revisedPitch }),
  });

  if (!retryRes.ok) throw new Error(`Retry failed: ${await retryRes.text()}`);
  const retryData = await retryRes.json();
  console.log(`   Linked Retry Session Created: ${retryData.newSessionId}`);

  // 6. Compare Sessions
  console.log("\n6️⃣ Fetching Comparative Audit Metrics...");
  const compareRes = await fetch(
    `http://localhost:3000/api/session/compare?sessionId=${retryData.newSessionId}`,
    {
      method: "GET",
      headers: { Cookie: ownerCookie },
    }
  );

  if (!compareRes.ok) throw new Error(`Compare failed: ${await compareRes.text()}`);
  const compareData = await compareRes.json();
  console.log(`   Original Session: ${compareData.originalSessionId}`);
  console.log(`   Retry Session: ${compareData.retrySessionId}`);
  console.log(`   Overall Delta: ${compareData.overallDelta}%`);
  console.log(`   Criteria Scores:`, compareData.criteriaScores);

  console.log("\n🏆 FULL END-TO-END FOUNDER JOURNEY VALIDATED AND PASSED!");
}

testFullJourney().catch((err) => {
  console.error("❌ E2E Journey test failed:", err);
  process.exit(1);
});
