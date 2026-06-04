import request from "supertest";
import { createApp } from "../../src/app";

jest.mock("../../src/modules/crisis/crisis.service", () => ({
  aggregateEvents: jest.fn().mockResolvedValue([
    {
      id: "dengue-cluster:tampines",
      source: "NEA",
      category: "dengue-cluster",
      severity: "warning",
      title: "Dengue cluster - Tampines St 21",
      area: "Tampines St 21",
      location: null,
      vicinityRadiusMeters: 320,
      raw: { caseSize: 12 },
    },
  ]),
}));

const app = createApp();

describe("foresight routes", () => {
  it("returns deterministic predictions and fallback leader brief without LLM credentials", async () => {
    const response = await request(app)
      .get("/api/v1/foresight/predictions")
      .query({ surgeBeds: 10, qrtCount: 2 })
      .expect(200);

    expect(response.body.source).toContain("foresight engine");
    expect(response.body.data).toMatchObject({
      interventions: { surgeBeds: 10, qrtCount: 2 },
      llm: { enabled: false, status: "not_configured" },
      outcomes: {
        overflowProbability: 50,
        responseTime: 17.7,
        livesAtRisk: 737,
      },
      leaderBrief: {
        status: "not_configured",
        headline: "Command priority: Dengue expansion watch - Tampines St 21",
      },
    });
    expect(response.body.data.predictions).toHaveLength(1);
    expect(response.body.data.predictions[0]).toMatchObject({
      riskType: "dengue_expansion",
      source: "NEA",
      confidence: 86,
      horizonLabel: "3 days",
      scenarioSource: "live",
    });
  });
});
