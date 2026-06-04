import {
  clearCommandStateForTests,
  createAllocationRecommendation,
  listAllocationRecommendations,
  listCommandTimeline,
  updateAllocationAgencyStatus,
} from "../../src/modules/command/command.service";

describe("command.service", () => {
  beforeEach(() => {
    clearCommandStateForTests();
  });

  it("stores a Foresight allocation recommendation and records a timeline entry", async () => {
    const recommendation = await createAllocationRecommendation({
      incidentId: "FORESIGHT",
      incidentTitle: "Flood escalation watch - Orchard Road",
      severity: "critical",
      confidence: 88,
      generatedFrom: "Generated from Foresight staged action",
      linkedPrediction: "Flood escalation watch - Orchard Road",
      modelVersion: "MURUS-FORESIGHT-ALLOC-1.0",
      triggerSignals: ["Forecast source: PUB"],
      draftMessage: "Please confirm availability.",
      agencies: [
        {
          id: "pub",
          agency: "PUB",
          channel: "Drainage Ops",
          confidence: 88,
          reason: "Flood risk is escalating.",
          suggestedAction: "Stage PUB crew.",
          status: "pending_approval",
        },
      ],
    });

    await expect(listAllocationRecommendations()).resolves.toHaveLength(1);
    expect(recommendation.agencies[0].status).toBe("pending_approval");
    const timeline = await listCommandTimeline();
    expect(timeline[0]).toMatchObject({
      title: "Allocation staged - Flood escalation watch - Orchard Road",
      recommendationId: recommendation.id,
      severity: "critical",
    });
  });

  it("updates agency status and appends approval/contact timeline entries", async () => {
    const recommendation = await createAllocationRecommendation({
      incidentTitle: "Dengue expansion watch - Tampines",
      severity: "high",
      agencies: [
        {
          id: "nea",
          agency: "NEA",
          channel: "Vector Ops",
          reason: "Dengue cluster is expanding.",
          suggestedAction: "Schedule vector sweep.",
        },
        {
          id: "command",
          agency: "CMD",
          channel: "Ops Command",
          reason: "Command review required.",
          suggestedAction: "Approve staged action.",
        },
      ],
    });

    const approved = await updateAllocationAgencyStatus(recommendation.id, {
      agencyIds: ["nea", "command"],
      status: "approved",
    });
    expect(approved.agencies.map((agency) => agency.status)).toEqual(["approved", "approved"]);

    const contacted = await updateAllocationAgencyStatus(recommendation.id, {
      agencyIds: ["nea"],
      status: "contacted",
    });
    expect(contacted.agencies.find((agency) => agency.id === "nea")?.status).toBe("contacted");
    expect(contacted.agencies.find((agency) => agency.id === "command")?.status).toBe("approved");
    const timeline = await listCommandTimeline();
    expect(timeline.map((entry) => entry.title)).toEqual([
      "Agencies contacted - Dengue expansion watch - Tampines",
      "Allocation approved - Dengue expansion watch - Tampines",
      "Allocation staged - Dengue expansion watch - Tampines",
    ]);
  });
});
