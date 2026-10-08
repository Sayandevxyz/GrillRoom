import { describe, it, expect } from "vitest";
import { getSessionRadar } from "@/lib/features/radar/getSessionRadar";
import { mockDb } from "@/lib/db";

describe("Radar Score Aggregation", () => {
  it("returns null when no evaluations exist for a session", async () => {
    const res = await getSessionRadar("non-existent-session");
    expect(res).toBeNull();
  });

  it("computes 5-axis average scores accurately from evaluations", async () => {
    const sessionId = "test-radar-session-1";
    mockDb.sessions.set(sessionId, { id: sessionId, idea_text: "test" });
    mockDb.evaluations.push(
      {
        id: "e1",
        session_id: sessionId,
        turn_id: "t1",
        directness: 8,
        specificity: 6,
        evidence: 7,
        logic: 9,
        honesty: 8,
        rubric_feedback: "good",
      },
      {
        id: "e2",
        session_id: sessionId,
        turn_id: "t2",
        directness: 6,
        specificity: 8,
        evidence: 5,
        logic: 7,
        honesty: 10,
        rubric_feedback: "solid",
      }
    );

    const res = await getSessionRadar(sessionId);
    expect(res).not.toBeNull();
    expect(res?.current).toEqual({
      directness: 7,
      specificity: 7,
      evidence: 6,
      logic: 8,
      honesty: 9,
    });
  });

  it("handles retry sessions by pulling previous attempt evaluations", async () => {
    const parentId = "test-radar-parent";
    const retryId = "test-radar-retry";

    mockDb.sessions.set(parentId, { id: parentId, idea_text: "original" });
    mockDb.sessions.set(retryId, { id: retryId, idea_text: "revised", parent_session_id: parentId });

    mockDb.evaluations.push(
      {
        id: "e-parent",
        session_id: parentId,
        turn_id: "tp1",
        directness: 4,
        specificity: 4,
        evidence: 4,
        logic: 4,
        honesty: 6,
        rubric_feedback: "weak",
      },
      {
        id: "e-retry",
        session_id: retryId,
        turn_id: "tr1",
        directness: 8,
        specificity: 9,
        evidence: 8,
        logic: 9,
        honesty: 10,
        rubric_feedback: "much stronger",
      }
    );

    const res = await getSessionRadar(retryId);
    expect(res).not.toBeNull();
    expect(res?.parentSessionId).toBe(parentId);
    expect(res?.previous).toEqual({
      directness: 4,
      specificity: 4,
      evidence: 4,
      logic: 4,
      honesty: 6,
    });
    expect(res?.current).toEqual({
      directness: 8,
      specificity: 9,
      evidence: 8,
      logic: 9,
      honesty: 10,
    });
  });
});
