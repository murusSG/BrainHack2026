jest.mock("../../src/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "../../src/config/supabase";
import { commandRepo } from "../../src/repositories/command.repo";
import type { CommandAllocationRecommendation } from "../../src/modules/command/command.types";

const fromMock = supabase?.from as jest.Mock;

describe("command.repo", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("persists allocation and agency rows to Supabase tables", async () => {
    const allocation: CommandAllocationRecommendation = {
      id: "alloc-1",
      incidentId: "FORESIGHT",
      incidentTitle: "Flood watch",
      severity: "critical",
      confidence: 88,
      generatedAt: "just now",
      generatedFrom: "Generated from Foresight staged action",
      linkedPrediction: "Flood watch",
      modelVersion: "MURUS-FORESIGHT-ALLOC-1.0",
      triggerSignals: ["Forecast source: PUB"],
      draftMessage: "Confirm response window.",
      agencies: [
        {
          id: "pub",
          agency: "PUB",
          channel: "Drainage Ops",
          confidence: 88,
          reason: "Flood risk.",
          suggestedAction: "Stage crew.",
          status: "pending_approval",
        },
      ],
      createdAt: "2026-06-04T04:00:00.000Z",
      updatedAt: "2026-06-04T04:00:00.000Z",
    };
    const allocationUpsert = jest.fn().mockResolvedValue({ error: null });
    const agencyUpsert = jest.fn().mockResolvedValue({ error: null });
    fromMock
      .mockReturnValueOnce({ upsert: allocationUpsert })
      .mockReturnValueOnce({ upsert: agencyUpsert });

    await expect(commandRepo.saveAllocation(allocation)).resolves.toBe(true);

    expect(fromMock).toHaveBeenNthCalledWith(1, "command_allocations");
    expect(allocationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "alloc-1",
        incident_id: "FORESIGHT",
        incident_title: "Flood watch",
        trigger_signals: ["Forecast source: PUB"],
      })
    );
    expect(fromMock).toHaveBeenNthCalledWith(2, "command_allocation_agencies");
    expect(agencyUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          allocation_id: "alloc-1",
          agency_id: "pub",
          suggested_action: "Stage crew.",
        }),
      ],
      { onConflict: "allocation_id,agency_id" }
    );
  });

  it("maps allocation rows with agencies from Supabase", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "command_allocations") {
        return {
          select: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "alloc-1",
                      incident_id: "FORESIGHT",
                      incident_title: "Dengue watch",
                      severity: "high",
                      confidence: 74,
                      generated_at: "just now",
                      generated_from: "Generated from Foresight staged action",
                      linked_prediction: "Dengue watch",
                      model_version: "MURUS-FORESIGHT-ALLOC-1.0",
                      trigger_signals: ["Forecast source: NEA"],
                      draft_message: "Confirm vector ops.",
                      created_at: "2026-06-04T04:00:00.000Z",
                      updated_at: "2026-06-04T04:00:00.000Z",
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          in: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    allocation_id: "alloc-1",
                    agency_id: "nea",
                    agency: "NEA",
                    channel: "Vector Ops",
                    confidence: 74,
                    reason: "Cluster expansion.",
                    suggested_action: "Schedule sweep.",
                    status: "approved",
                  },
                ],
                error: null,
              }),
          }),
        }),
      };
    });

    const allocations = await commandRepo.listAllocations();

    expect(allocations).toHaveLength(1);
    expect(allocations?.[0]).toMatchObject({
      id: "alloc-1",
      incidentTitle: "Dengue watch",
      triggerSignals: ["Forecast source: NEA"],
      agencies: [
        expect.objectContaining({
          id: "nea",
          agency: "NEA",
          suggestedAction: "Schedule sweep.",
          status: "approved",
        }),
      ],
    });
  });
});
