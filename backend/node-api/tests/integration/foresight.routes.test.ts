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
    {
      id: "flood-alert:orchard",
      source: "PUB",
      category: "flood-alert",
      severity: "warning",
      title: "Flood alert - Orchard Road",
      area: "Orchard Road",
      location: { lat: 1.3048, lng: 103.8318 },
      vicinityRadiusMeters: 900,
      raw: {},
    },
  ]),
}));

jest.mock("../../src/modules/hospitals/hospitals.service", () => ({
  publicHospitalDataService: {
    getOccupancy: jest.fn().mockResolvedValue({
      status: "success",
      data: [
        {
          metric_name: "Beds Occupancy Rate",
          facility_name: "Khoo Teck Puat Hospital",
          value: "96",
          unit: "%",
          source_name: "MOH Beds Occupancy Rate",
          source_url: "https://www.moh.gov.sg/bor",
          last_updated: "2026-06-04",
          notes: "Public statistical BOR; not real-time operational capacity.",
        },
      ],
      sources: [],
      errors: [],
    }),
    getWaitingTimes: jest.fn().mockResolvedValue({
      status: "success",
      data: [],
      sources: [],
      errors: [],
    }),
  },
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
        headline: "Command priority: Hospital bed pressure watch - Khoo Teck Puat Hospital",
      },
    });
    const predictions = response.body.data.predictions;
    expect(predictions).toHaveLength(3);
    expect(predictions.map((prediction: { riskType: string }) => prediction.riskType)).toEqual([
      "health_system_pressure",
      "multi_hazard_watch",
      "dengue_expansion",
    ]);
    expect(predictions[0]).toMatchObject({
      riskType: "health_system_pressure",
      source: "MOH",
      confidence: 91,
      area: "Khoo Teck Puat Hospital",
      evidence: expect.arrayContaining(["MOH public bed occupancy metric at 96%"]),
      scenarioSource: "live",
    });
    expect(predictions[1]).toMatchObject({
      riskType: "multi_hazard_watch",
      source: "MURUS",
      confidence: 90,
      horizonLabel: "3 hrs",
    });
    expect(predictions[2]).toMatchObject({
      riskType: "dengue_expansion",
      source: "NEA",
      confidence: 86,
      horizonLabel: "3 days",
      scenarioSource: "live",
    });
  });
});
