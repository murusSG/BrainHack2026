import { jest } from "@jest/globals";

jest.mock("../../../repositories/incidentReport.repo");

import * as repo from "../../../repositories/incidentReport.repo";
import {
  getIncidentReports,
  createIncidentReport,
  updateIncidentReport,
} from "../incidentReport.service";
import type { IncidentReport } from "../incident.types";

const mockRepo = repo as jest.Mocked<typeof repo>;

function makeReport(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    id: "report-uuid-1",
    incident_id: "INC-001",
    agency: "SCDF",
    author_id: "user-uuid-1",
    author_name: "Alpha 21",
    situation_summary: "Fire contained to 3rd floor.",
    casualties: { injured: 2, deceased: 0, missing: 1 },
    location: "Block 93, Toa Payoh",
    resources_deployed: "3 fire engines",
    actions_taken: "Hoselines deployed",
    hazards: ["smoke"],
    next_steps: "Await assessment",
    status: "draft",
    created_at: "2026-06-07T10:00:00.000Z",
    updated_at: "2026-06-07T10:00:00.000Z",
    ...overrides,
  };
}

describe("getIncidentReports", () => {
  it("delegates to repo.listReports", async () => {
    const reports = [makeReport()];
    mockRepo.listReports.mockResolvedValue(reports);
    const result = await getIncidentReports("INC-001");
    expect(result).toEqual(reports);
    expect(mockRepo.listReports).toHaveBeenCalledWith("INC-001");
  });
});

describe("createIncidentReport", () => {
  it("creates a report with agency from auth user", async () => {
    const created = makeReport();
    mockRepo.insertReport.mockResolvedValue(created);
    const result = await createIncidentReport("INC-001", "user-uuid-1", "SCDF", {
      situation_summary: "Fire contained to 3rd floor.",
    });
    expect(result).toEqual(created);
    expect(mockRepo.insertReport).toHaveBeenCalledWith(
      "INC-001",
      "user-uuid-1",
      "SCDF",
      expect.objectContaining({ situation_summary: "Fire contained to 3rd floor." })
    );
  });

  it("rejects when situation_summary is empty", async () => {
    await expect(
      createIncidentReport("INC-001", "user-uuid-1", "SCDF", { situation_summary: "  " })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects when agency is empty (user profile missing agency)", async () => {
    await expect(
      createIncidentReport("INC-001", "user-uuid-1", "", { situation_summary: "Fire on 3F." })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("updateIncidentReport", () => {
  it("allows author to advance draft → submitted", async () => {
    const report = makeReport({ status: "draft" });
    const updated = makeReport({ status: "submitted" });
    mockRepo.findReport.mockResolvedValue(report);
    mockRepo.patchReport.mockResolvedValue(updated);

    const result = await updateIncidentReport("report-uuid-1", "user-uuid-1", "SCDF", {
      status: "submitted",
    });
    expect(result.status).toBe("submitted");
  });

  it("rejects non-author advancing draft → submitted", async () => {
    const report = makeReport({ status: "draft", author_id: "user-uuid-1" });
    mockRepo.findReport.mockResolvedValue(report);

    await expect(
      updateIncidentReport("report-uuid-1", "user-uuid-2", "SPF", { status: "submitted" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a different user to acknowledge a submitted report", async () => {
    const report = makeReport({ status: "submitted", author_id: "user-uuid-1" });
    const updated = makeReport({ status: "acknowledged" });
    mockRepo.findReport.mockResolvedValue(report);
    mockRepo.patchReport.mockResolvedValue(updated);

    const result = await updateIncidentReport("report-uuid-1", "user-uuid-2", "SPF", {
      status: "acknowledged",
    });
    expect(result.status).toBe("acknowledged");
  });

  it("rejects author acknowledging their own report", async () => {
    const report = makeReport({ status: "submitted", author_id: "user-uuid-1" });
    mockRepo.findReport.mockResolvedValue(report);

    await expect(
      updateIncidentReport("report-uuid-1", "user-uuid-1", "SCDF", { status: "acknowledged" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects any transition from acknowledged", async () => {
    const report = makeReport({ status: "acknowledged" });
    mockRepo.findReport.mockResolvedValue(report);

    await expect(
      updateIncidentReport("report-uuid-1", "user-uuid-1", "SCDF", { status: "submitted" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects non-author editing report content fields", async () => {
    const report = makeReport({ status: "draft", author_id: "user-uuid-1" });
    mockRepo.findReport.mockResolvedValue(report);

    await expect(
      updateIncidentReport("report-uuid-1", "user-uuid-2", "SPF", {
        situation_summary: "Different summary",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 404 when report does not exist", async () => {
    mockRepo.findReport.mockResolvedValue(null);

    await expect(
      updateIncidentReport("nonexistent", "user-uuid-1", "SCDF", { status: "submitted" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
