import { jest } from "@jest/globals";

jest.mock("../../../repositories/responderLog.repo");
jest.mock("../incidentCluster.service", () => ({
  getIncidentCluster: jest.fn(),
}));

import * as responderLogRepo from "../../../repositories/responderLog.repo";
import { getIncidentCluster } from "../incidentCluster.service";
import {
  createResponderIncidentLog,
  getResponderIncidentLogs,
} from "../responderLog.service";

const mockRepo = responderLogRepo as jest.Mocked<typeof responderLogRepo>;
const mockGetIncidentCluster = getIncidentCluster as jest.MockedFunction<typeof getIncidentCluster>;

function makeCluster(overrides = {}) {
  return {
    incident_id: "INC-001",
    status: "dispatched",
    responder_logs: [
      {
        id: "INC-001-LOG-001",
        incident_id: "INC-001",
        agency: "MURUS",
        category: "resource_update",
        message: "Dispatch approved.",
        timestamp: "2026-06-09T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("getResponderIncidentLogs", () => {
  it("returns persisted shared logs for a dispatched incident", async () => {
    mockGetIncidentCluster.mockResolvedValue(makeCluster() as never);
    mockRepo.listResponderLogs.mockResolvedValue([
      {
        id: "db-log-0",
        incident_id: "INC-001",
        agency: "MURUS",
        category: "resource_update",
        message: "Dispatch approved.",
        timestamp: "2026-06-09T10:00:00.000Z",
      },
      {
        id: "db-log-1",
        incident_id: "INC-001",
        agency: "SPF",
        author: "Alpha 21",
        category: "security",
        message: "Crowd cordon established.",
        timestamp: "2026-06-09T10:05:00.000Z",
      },
    ]);

    const result = await getResponderIncidentLogs("INC-001");

    expect(result).toHaveLength(2);
    expect(result[0].agency).toBe("MURUS");
    expect(result[1].agency).toBe("SPF");
  });

  it("returns 404 when the incident does not exist anywhere", async () => {
    mockGetIncidentCluster.mockResolvedValue(undefined);
    mockRepo.listResponderLogs.mockResolvedValue([]);

    await expect(getResponderIncidentLogs("INC-404")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("createResponderIncidentLog", () => {
  it("persists a valid shared log entry", async () => {
    mockGetIncidentCluster.mockResolvedValue(makeCluster() as never);
    mockRepo.insertResponderLog.mockResolvedValue({
      id: "db-log-2",
      incident_id: "INC-001",
      agency: "SCDF",
      author: "Rescue 3",
      category: "hazard",
      message: "Smoke concentration remains high.",
      timestamp: "2026-06-09T10:08:00.000Z",
    });

    const result = await createResponderIncidentLog("INC-001", {
      agency: "SCDF",
      author: "Rescue 3",
      category: "hazard",
      message: "Smoke concentration remains high.",
    });

    expect(result.agency).toBe("SCDF");
    expect(mockRepo.insertResponderLog).toHaveBeenCalledWith(
      "INC-001",
      expect.objectContaining({
        agency: "SCDF",
        category: "hazard",
        message: "Smoke concentration remains high.",
      })
    );
  });

  it("rejects log creation for incidents that are not dispatched", async () => {
    mockGetIncidentCluster.mockResolvedValue(makeCluster({ status: "pending_approval" }) as never);

    await expect(
      createResponderIncidentLog("INC-001", {
        agency: "SCDF",
        message: "Attempted early update.",
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects blank log messages", async () => {
    mockGetIncidentCluster.mockResolvedValue(makeCluster() as never);

    await expect(
      createResponderIncidentLog("INC-001", {
        agency: "SCDF",
        message: "   ",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
