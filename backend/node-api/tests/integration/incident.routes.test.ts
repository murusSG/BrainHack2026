import request from "supertest";
import { createApp } from "../../src/app";
import { clearIncidentClusterStateForTests } from "../../src/modules/incidents/incidentCluster.service";
import { extractReport } from "../../src/modules/incidents/incidentExtraction.service";
import { recommendResourceAllocation } from "../../src/modules/incidents/resourceAllocation.service";
import type { ExtractedIncident } from "../../src/modules/incidents/incident.types";
import { clearResponderLogStateForTests } from "../../src/repositories/responderLog.repo";

jest.mock("../../src/modules/incidents/incidentExtraction.service", () => ({
  extractReport: jest.fn(),
}));

jest.mock("../../src/modules/incidents/resourceAllocation.service", () => ({
  recommendResourceAllocation: jest.fn(),
  manualReviewRecommendations: jest.requireActual(
    "../../src/modules/incidents/resourceAllocation.service"
  ).manualReviewRecommendations,
}));

const mockedExtractReport = extractReport as jest.MockedFunction<typeof extractReport>;
const mockedRecommendResourceAllocation = recommendResourceAllocation as jest.MockedFunction<
  typeof recommendResourceAllocation
>;

const app = createApp();

const fireExtraction: ExtractedIncident = {
  incident_type: "building fire",
  location_text: "Block 123 Tampines Street 11",
  severity: "high",
  description: "Thick black smoke reported. Possible elderly residents trapped.",
  possible_casualties: true,
  hazards: ["smoke inhalation", "possible trapped persons"],
  confidence: 0.86,
  missing_fields: [],
};

const roadAccidentExtraction: ExtractedIncident = {
  incident_type: "road accident",
  location_text: "Block 123 Tampines Street 11",
  severity: "medium",
  description: "Vehicle collision reported near the same block.",
  possible_casualties: false,
  hazards: ["traffic obstruction"],
  confidence: 0.82,
  missing_fields: [],
};

describe("incident grouping routes", () => {
  const consoleInfo = jest.spyOn(console, "info").mockImplementation(() => undefined);
  const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    clearIncidentClusterStateForTests();
    clearResponderLogStateForTests();
    mockedExtractReport.mockReset();
    mockedRecommendResourceAllocation.mockReset();
  });

  afterAll(() => {
    consoleInfo.mockRestore();
    consoleWarn.mockRestore();
  });

  it("creates a new incident and stages resource allocation for a clear report", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [
        { agency: "SCDF", reason: "Primary fire and rescue response." },
        { agency: "SPF", reason: "Cordon and public safety support." },
      ],
      suggested_agencies: [
        {
          agency: "MOH",
          reason: "Possible smoke inhalation and elderly residents affected.",
          confidence: "high",
        },
      ],
      risk_notes: ["Possible trapped persons require urgent dispatcher review."],
      dispatcher_approval_required: true,
    });

    const response = await request(app)
      .post("/api/incidents/report")
      .send({
        report_id: "RPT-001",
        report_text:
          "I saw thick black smoke coming from Block 123 Tampines Street 11. People are gathering downstairs.",
        reported_at: "2026-06-05T10:30:00+08:00",
        source: "public",
        reporter_location: { lat: 1.3521, lng: 103.8198 },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "new_incident_created",
      incident_id: "INC-001",
      resource_allocation_status: "pending_dispatcher_approval",
      recommendations: {
        dispatcher_approval_required: true,
      },
    });
    expect(response.body.recommendations.mandatory_agencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ agency: "SCDF" })])
    );
    expect(mockedRecommendResourceAllocation).toHaveBeenCalledTimes(1);

    const publicReports = await request(app).get("/api/v1/incidents/public-reports").expect(200);
    expect(publicReports.body.reports).toHaveLength(1);
    expect(publicReports.body.reports[0]).toMatchObject({
      report_id: "RPT-001",
      incident_id: "INC-001",
      status: "pending_approval",
    });

    const incidents = await request(app)
      .get("/api/v1/incidents?status=pending_approval")
      .expect(200);
    expect(incidents.body.incidents).toHaveLength(1);
    expect(incidents.body.incidents[0]).toMatchObject({
      incident_id: "INC-001",
      status: "pending_approval",
      marker_status: "pending",
    });
  });

  it("groups a similar second report and does not create duplicate allocation", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Primary fire and rescue response." }],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_id: "RPT-001",
        report_text: "Black smoke from Block 123 Tampines Street 11.",
        reported_at: "2026-06-05T10:30:00+08:00",
        reporter_location: { lat: 1.3521, lng: 103.8198 },
      })
      .expect(201);

    const grouped = await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_id: "RPT-002",
        report_text: "Smoke at the same Tampines block. Residents are outside.",
        reported_at: "2026-06-05T10:45:00+08:00",
        reporter_location: { lat: 1.3522, lng: 103.8199 },
      })
      .expect(200);

    expect(grouped.body).toMatchObject({
      status: "grouped_with_existing_incident",
      incident_id: "INC-001",
      resource_allocation_status: "pending_dispatcher_approval",
    });
    expect(grouped.body.similarity.confidence).toBeGreaterThanOrEqual(0.75);
    expect(mockedRecommendResourceAllocation).toHaveBeenCalledTimes(1);

    const clusters = await request(app).get("/api/v1/incidents/clusters").expect(200);
    expect(clusters.body.clusters).toHaveLength(1);
    expect(clusters.body.clusters[0].reports).toHaveLength(2);
    expect(clusters.body.clusters[0].reports[0].precise_location_redacted).toBe(true);
  });

  it("does not group a different incident type at the same location", async () => {
    mockedExtractReport.mockResolvedValueOnce(fireExtraction).mockResolvedValueOnce(roadAccidentExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Dispatcher review." }],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_text: "Black smoke from Block 123 Tampines Street 11.",
        reported_at: "2026-06-05T10:30:00+08:00",
      })
      .expect(201);

    await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_text: "A vehicle accident happened at Block 123 Tampines Street 11.",
        reported_at: "2026-06-05T10:40:00+08:00",
      })
      .expect(201);

    const clusters = await request(app).get("/api/v1/incidents/clusters").expect(200);
    expect(clusters.body.clusters).toHaveLength(2);
    expect(mockedRecommendResourceAllocation).toHaveBeenCalledTimes(2);
  });

  it("returns the priority queue in backend score order", async () => {
    mockedExtractReport
      .mockResolvedValueOnce(roadAccidentExtraction)
      .mockResolvedValueOnce(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Dispatcher review." }],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_text: "A vehicle accident at Block 123 Tampines Street 11.",
        reported_at: "2026-06-05T10:30:00+08:00",
      })
      .expect(201);
    await request(app)
      .post("/api/v1/incidents/report")
      .send({
        report_text: "Black smoke and trapped residents at Block 123 Tampines Street 11.",
        reported_at: "2026-06-05T10:31:00+08:00",
      })
      .expect(201);

    const queue = await request(app).get("/api/v1/incidents/priority-queue").expect(200);

    expect(queue.body.items.map((item: { incident_id: string }) => item.incident_id)).toEqual([
      "INC-002",
      "INC-001",
    ]);
    expect(queue.body.items.map((item: { queue_position: number }) => item.queue_position)).toEqual([
      1, 2,
    ]);
    expect(queue.body.items[0].priority_score).toBeGreaterThan(
      queue.body.items[1].priority_score
    );
  });

  it("returns manual review for low-confidence extraction", async () => {
    mockedExtractReport.mockResolvedValue({
      incident_type: "unknown",
      location_text: "",
      severity: "unknown",
      description: "Something bad is happening near my block.",
      possible_casualties: false,
      hazards: [],
      confidence: 0.31,
      missing_fields: ["incident_type", "location"],
    });

    const response = await request(app)
      .post("/api/v1/incidents/report")
      .send({ report_text: "Something bad is happening near my block." })
      .expect(200);

    expect(response.body).toMatchObject({
      status: "needs_manual_review",
      incident_id: "INC-001",
      reason: "Extraction confidence below threshold or missing critical fields.",
      resource_allocation_status: "needs_manual_review",
    });
    expect(mockedRecommendResourceAllocation).not.toHaveBeenCalled();

    const queue = await request(app).get("/api/v1/incidents/priority-queue").expect(200);
    expect(queue.body.items).toHaveLength(1);
    expect(queue.body.items[0]).toMatchObject({
      incident_id: "INC-001",
      status: "pending_approval",
      resource_allocation_status: "needs_manual_review",
    });
  });

  it("approves selected agencies without contacting real agencies", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Primary fire and rescue response." }],
      suggested_agencies: [{ agency: "MOH", reason: "Possible smoke inhalation.", confidence: "high" }],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({ report_text: "Black smoke from Block 123 Tampines Street 11." })
      .expect(201);

    const approval = await request(app)
      .post("/api/resource-allocation/approve")
      .send({
        incident_id: "INC-001",
        dispatcher_id: "DISP-001",
        approved_agencies: ["SCDF", "MOH"],
      })
      .expect(200);

    expect(approval.body).toEqual({
      incident_id: "INC-001",
      approved_by: "DISP-001",
      approved_agencies: ["SCDF", "MOH"],
      status: "approved",
      message: "Agency recommendations approved. Real notification workflow is not implemented yet.",
    });
  });

  it("moves an approved incident to the responder dashboard and shares one agency log", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Primary fire and rescue response." }],
      suggested_agencies: [{ agency: "SPF", reason: "Crowd control.", confidence: "high" }],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({ report_text: "Black smoke from Block 123 Tampines Street 11." })
      .expect(201);

    const decision = await request(app)
      .post("/api/v1/resource-allocation/decision")
      .send({
        incident_id: "INC-001",
        dispatcher_id: "DISP-001",
        decision: "approved",
        approved_agencies: ["SCDF", "SPF"],
        dispatcher_note: "Use the east access road.",
      })
      .expect(200);

    expect(decision.body).toMatchObject({
      incident_id: "INC-001",
      decision: "approved",
      status: "dispatched",
    });

    const queue = await request(app).get("/api/v1/incidents/priority-queue").expect(200);
    expect(queue.body.items).toEqual([]);

    const responder = await request(app).get("/api/v1/incidents/responder").expect(200);
    expect(responder.body.incidents).toHaveLength(1);
    expect(responder.body.incidents[0]).toMatchObject({
      incident_id: "INC-001",
      status: "dispatched",
      approved_agencies: ["SCDF", "SPF"],
    });

    const initialLogs = await request(app).get("/api/v1/incidents/INC-001/logs").expect(200);
    expect(initialLogs.body.logs[0]).toMatchObject({
      agency: "MURUS",
      category: "resource_update",
    });
    expect(initialLogs.body.logs[0].message).toContain("SCDF, SPF");

    await request(app)
      .post("/api/v1/incidents/INC-001/logs")
      .send({
        agency: "SPF",
        author: "Alpha 21",
        category: "security",
        message: "Crowd cordon established on the east side.",
      })
      .expect(201);

    const sharedLogs = await request(app).get("/api/v1/incidents/INC-001/logs").expect(200);
    expect(sharedLogs.body.logs).toHaveLength(2);
    expect(sharedLogs.body.logs[1]).toMatchObject({
      agency: "SPF",
      author: "Alpha 21",
      message: "Crowd cordon established on the east side.",
    });
  });

  it("removes declined incidents from both operational queues", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Primary fire and rescue response." }],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({ report_text: "Black smoke from Block 123 Tampines Street 11." })
      .expect(201);

    await request(app)
      .post("/api/v1/resource-allocation/decision")
      .send({
        incident_id: "INC-001",
        dispatcher_id: "DISP-001",
        decision: "declined",
        dispatcher_note: "Duplicate confirmed through manual review.",
      })
      .expect(200);

    const queue = await request(app).get("/api/v1/incidents/priority-queue").expect(200);
    const responder = await request(app).get("/api/v1/incidents/responder").expect(200);
    expect(queue.body.items).toEqual([]);
    expect(responder.body.incidents).toEqual([]);
  });

  it("supports the generic incident status patch route", async () => {
    mockedExtractReport.mockResolvedValue(fireExtraction);
    mockedRecommendResourceAllocation.mockResolvedValue({
      mandatory_agencies: [{ agency: "SCDF", reason: "Primary fire and rescue response." }],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    });

    await request(app)
      .post("/api/v1/incidents/report")
      .send({ report_text: "Black smoke from Block 123 Tampines Street 11." })
      .expect(201);

    const patched = await request(app)
      .patch("/api/v1/incidents/INC-001/status")
      .send({ status: "closed" })
      .expect(200);

    expect(patched.body.incident).toMatchObject({
      incident_id: "INC-001",
      status: "closed",
      marker_status: "closed",
    });
  });

  it("rejects missing approval fields", async () => {
    const response = await request(app)
      .post("/api/v1/resource-allocation/approve")
      .send({ incident_id: "INC-001", approved_agencies: ["SCDF"] })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "BAD_REQUEST",
      message: "incident_id, dispatcher_id, and approved_agencies are required.",
    });
  });
});
