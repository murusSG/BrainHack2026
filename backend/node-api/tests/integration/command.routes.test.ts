import request from "supertest";
import { createApp } from "../../src/app";
import { clearCommandStateForTests } from "../../src/modules/command/command.service";

jest.mock("../../src/repositories/command.repo", () => ({
  commandRepo: {
    listAllocations: jest.fn().mockResolvedValue(null),
    getAllocation: jest.fn().mockResolvedValue(null),
    saveAllocation: jest.fn().mockResolvedValue(false),
    saveTimelineEntry: jest.fn().mockResolvedValue(false),
    listTimeline: jest.fn().mockResolvedValue(null),
  },
}));

const app = createApp();

describe("command routes", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  afterAll(() => {
    consoleError.mockRestore();
  });

  beforeEach(() => {
    consoleError.mockClear();
    clearCommandStateForTests();
  });

  it("creates, lists, updates, and timelines a command allocation", async () => {
    const createResponse = await request(app)
      .post("/api/v1/command/allocations")
      .send({
        id: "alloc-api-1",
        incidentId: "FORESIGHT",
        incidentTitle: "Flood escalation watch - Orchard Road",
        severity: "critical",
        confidence: 88,
        generatedFrom: "Generated from Foresight staged action",
        linkedPrediction: "Flood escalation watch - Orchard Road",
        modelVersion: "MURUS-FORESIGHT-ALLOC-1.0",
        triggerSignals: ["Forecast source: PUB", "Recommended owner: PUB"],
        draftMessage: "Confirm response window.",
        agencies: [
          {
            id: "pub",
            agency: "PUB",
            channel: "Drainage Ops",
            confidence: 88,
            reason: "Flood risk is escalating.",
            suggestedAction: "Stage PUB crew.",
          },
          {
            id: "command",
            agency: "CMD",
            channel: "Ops Command",
            confidence: 72,
            reason: "Command review required.",
            suggestedAction: "Approve staged action.",
          },
        ],
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      id: "alloc-api-1",
      incidentTitle: "Flood escalation watch - Orchard Road",
      agencies: [
        expect.objectContaining({ id: "pub", status: "pending_approval" }),
        expect.objectContaining({ id: "command", status: "pending_approval" }),
      ],
    });

    const listResponse = await request(app).get("/api/v1/command/allocations").expect(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe("alloc-api-1");

    const updateResponse = await request(app)
      .patch("/api/v1/command/allocations/alloc-api-1/agencies")
      .send({ agencyIds: ["pub", "command"], status: "approved" })
      .expect(200);

    expect(updateResponse.body.data.agencies.map((agency: { status: string }) => agency.status)).toEqual([
      "approved",
      "approved",
    ]);

    const timelineResponse = await request(app).get("/api/v1/command/timeline").expect(200);
    expect(timelineResponse.body.data.map((entry: { title: string }) => entry.title)).toEqual([
      "Allocation approved - Flood escalation watch - Orchard Road",
      "Allocation staged - Flood escalation watch - Orchard Road",
    ]);
  });

  it("returns a 400 for invalid agency status", async () => {
    await request(app)
      .post("/api/v1/command/allocations")
      .send({
        id: "alloc-api-2",
        incidentTitle: "Dengue expansion watch - Tampines",
        agencies: [{ id: "nea", agency: "NEA" }],
      })
      .expect(201);

    const response = await request(app)
      .patch("/api/v1/command/allocations/alloc-api-2/agencies")
      .send({ agencyIds: ["nea"], status: "sent" })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "BAD_REQUEST",
      message: "Unsupported allocation agency status.",
    });
  });
});
