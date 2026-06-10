jest.mock("../../src/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "../../src/config/supabase";
import {
  clearIncidentStateForTests,
  insertPublicIncidentReport,
  listPublicIncidentReports,
} from "../../src/repositories/incidentState.repo";

const fromMock = supabase?.from as jest.Mock;

describe("incidentState.repo", () => {
  const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    clearIncidentStateForTests();
    fromMock.mockReset();
    consoleWarn.mockClear();
  });

  afterAll(() => {
    consoleWarn.mockRestore();
  });

  it("falls back to memory when Supabase is missing public_incident_reports in the schema cache", async () => {
    fromMock.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: {
                code: "PGRST205",
                message: "Could not find the table 'public.public_incident_reports' in the schema cache",
              },
            }),
        }),
      }),
    });

    const created = await insertPublicIncidentReport({
      report_id: "RPT-001",
      report_text: "Smoke seen near the block.",
      reported_at: "2026-06-09T10:30:00+08:00",
      source: "public",
      reporter_location: { lat: 1.3521, lng: 103.8198 },
      media_urls: [],
    });

    expect(created).toMatchObject({
      id: "public-report-0001",
      report_id: "RPT-001",
      status: "received",
      source: "public",
    });
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Supabase table "public_incident_reports" is unavailable'),
      expect.stringContaining("schema cache")
    );

    const reports = await listPublicIncidentReports();

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      id: "public-report-0001",
      report_id: "RPT-001",
    });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to memory when Supabase rejects public_incident_reports writes with RLS", async () => {
    fromMock.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: {
                code: "42501",
                message:
                  'new row violates row-level security policy for table "public_incident_reports"',
              },
            }),
        }),
      }),
    });

    const created = await insertPublicIncidentReport({
      report_id: "RPT-002",
      report_text: "Residents report smoke near the loading bay.",
      reported_at: "2026-06-09T10:45:00+08:00",
      source: "public",
      reporter_location: { lat: 1.3012, lng: 103.8421 },
      media_urls: [],
    });

    expect(created).toMatchObject({
      id: "public-report-0001",
      report_id: "RPT-002",
      status: "received",
      source: "public",
    });
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Supabase table "public_incident_reports" is unavailable'),
      expect.stringContaining("row-level security policy")
    );

    const reports = await listPublicIncidentReports();

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      id: "public-report-0001",
      report_id: "RPT-002",
    });
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
