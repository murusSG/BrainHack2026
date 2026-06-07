import request from "supertest";
import { clearCommandStateForTests } from "../../src/modules/command/command.service";
import { clearResidentAlertsForTests } from "../../src/modules/residentAlerts/residentAlerts.service";

jest.mock("../../src/config/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock("../../src/repositories/auth.repo", () => ({
  authRepo: {
    getProfile: jest.fn(),
  },
}));

jest.mock("../../src/repositories/command.repo", () => ({
  commandRepo: {
    listAllocations: jest.fn().mockResolvedValue(null),
    getAllocation: jest.fn().mockResolvedValue(null),
    saveAllocation: jest.fn().mockResolvedValue(true),
    saveTimelineEntry: jest.fn().mockResolvedValue(true),
    listTimeline: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("../../src/repositories/residentAlerts.repo", () => ({
  residentAlertsRepo: {
    listBroadcasts: jest.fn().mockResolvedValue(null),
    saveBroadcast: jest.fn().mockResolvedValue(true),
    updateBroadcast: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../src/modules/crisis/crisis.service", () => ({
  aggregateEvents: jest.fn().mockResolvedValue([
    {
      id: "flood-alert:orchard",
      source: "PUB",
      hazardType: "infrastructure",
      category: "flood-alert",
      severity: "warning",
      title: "Flood alert - Orchard Road",
      area: "Orchard Road",
      location: { lat: 1.3048, lng: 103.8318 },
      vicinityRadiusMeters: 900,
      startedAt: "2026-06-07T00:00:00.000Z",
      updatedAt: "2026-06-07T00:05:00.000Z",
      raw: {},
    },
  ]),
}));

import { createApp } from "../../src/app";
import { supabase } from "../../src/config/supabase";
import { authRepo } from "../../src/repositories/auth.repo";

const app = createApp();
const getUserMock = supabase?.auth.getUser as jest.Mock;
const getProfileMock = authRepo.getProfile as jest.Mock;

describe("resident alert routes", () => {
  beforeEach(() => {
    clearResidentAlertsForTests();
    clearCommandStateForTests();
    getUserMock.mockReset();
    getProfileMock.mockReset();
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "leader-1",
          email: "leader@murus.sg",
          app_metadata: { role: "leader" },
        },
      },
      error: null,
    });
    getProfileMock.mockResolvedValue({ id: "leader-1", role: "leader", agency: "MURUS" });
  });

  it("returns citizen-safe alerts generated from active crisis events", async () => {
    const response = await request(app)
      .get("/api/v1/resident-alerts")
      .query({ lat: 1.3048, lng: 103.8318 })
      .expect(200);

    expect(response.body.source).toContain("resident alert system");
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: "resident-alert:event:flood-alert:orchard",
      sourceType: "incident_activated",
      title: "Flood alert - Orchard Road",
      publicAction: "Avoid the affected area and do not enter flood water.",
      severity: "warning",
      locationLabel: "Orchard Road",
      channels: ["in_app", "web"],
    });
  });

  it("creates a command broadcast alert for residents", async () => {
    const response = await request(app)
      .post("/api/v1/resident-alerts")
      .set("Authorization", "Bearer leader-token")
      .send({
        title: "Avoid Orchard Road",
        body: "Flash flooding has been reported near Orchard Road.",
        publicAction: "Use Somerset MRT exits and avoid basement links until further notice.",
        severity: "danger",
        locationLabel: "Orchard Road",
        lat: 1.3048,
        lng: 103.8318,
        radiusMeters: 1200,
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      sourceType: "command_broadcast",
      title: "Avoid Orchard Road",
      publicAction: "Use Somerset MRT exits and avoid basement links until further notice.",
      severity: "danger",
      locationLabel: "Orchard Road",
      audience: { type: "nearby", radiusMeters: 1200 },
    });

    const timeline = await request(app).get("/api/v1/command/timeline").expect(200);
    expect(timeline.body.data[0]).toMatchObject({
      title: "Resident alert published - Avoid Orchard Road",
      detail: "Orchard Road broadcast issued to residents within 1200m.",
      location: "Orchard Road",
      severity: "critical",
    });
  });

  it("lets leaders update and resolve a command broadcast alert", async () => {
    const createResponse = await request(app)
      .post("/api/v1/resident-alerts")
      .set("Authorization", "Bearer leader-token")
      .send({
        title: "Avoid Orchard Road",
        publicAction: "Avoid basement links.",
        severity: "danger",
        locationLabel: "Orchard Road",
      })
      .expect(201);

    const updateResponse = await request(app)
      .patch(`/api/v1/resident-alerts/${encodeURIComponent(createResponse.body.data.id)}`)
      .set("Authorization", "Bearer leader-token")
      .send({
        status: "resolved",
        publicAction: "All clear for immediate danger.",
        severity: "info",
      })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      status: "resolved",
      publicAction: "All clear for immediate danger.",
      severity: "info",
    });

    const timeline = await request(app).get("/api/v1/command/timeline").expect(200);
    expect(timeline.body.data[0]).toMatchObject({
      title: "Resident all-clear issued - Avoid Orchard Road",
      detail: "Orchard Road resident alert marked resolved.",
      severity: "normal",
    });
  });

  it("rejects missing or non-leader publish attempts", async () => {
    await request(app)
      .post("/api/v1/resident-alerts")
      .send({
        title: "Avoid Orchard Road",
        publicAction: "Avoid the affected area.",
      })
      .expect(401);

    getProfileMock.mockResolvedValue({ id: "public-1", role: "public", agency: null });
    const response = await request(app)
      .post("/api/v1/resident-alerts")
      .set("Authorization", "Bearer public-token")
      .send({
        title: "Avoid Orchard Road",
        publicAction: "Avoid the affected area.",
      })
      .expect(403);

    expect(response.body.error).toMatchObject({
      code: "FORBIDDEN",
    });

    await request(app)
      .patch("/api/v1/resident-alerts/resident-alert-1")
      .set("Authorization", "Bearer public-token")
      .send({ status: "resolved" })
      .expect(403);
  });
});
