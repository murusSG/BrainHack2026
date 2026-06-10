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
    saveSmsDeliveries: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../src/modules/residentAlerts/residentAlertSms.service", () => ({
  sendResidentAlertSms: jest.fn().mockResolvedValue([]),
  sendResidentAlertWhatsapp: jest.fn().mockResolvedValue([]),
  sendResidentAlertTelegram: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../src/modules/residentAlerts/residentAskMurus.service", () => ({
  answerAskMurus: jest.fn().mockResolvedValue({
    answer: "Use the MRT only if station staff confirm the route is clear.",
    mode: "llm",
    model: "deepseek-v4-pro:stable",
    guardrail: "Grounded in official alert fields and approved fallback rules.",
  }),
  checkResidentRumorWithLlm: jest.fn().mockResolvedValue({
    status: "partial",
    label: "Partly related, not confirmed",
    message: "This mentions Orchard Road, but the exact claim is not confirmed by the current alert.",
    matchedAlert: {
      id: "resident-alert:1",
      title: "Avoid Orchard Road",
      locationLabel: "Orchard Road",
    },
    confidence: "medium",
    mode: "llm",
    model: "deepseek-v4-pro:stable",
    guardrail: "Grounded in current official alert fields.",
  }),
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
import {
  sendResidentAlertSms,
  sendResidentAlertTelegram,
  sendResidentAlertWhatsapp,
} from "../../src/modules/residentAlerts/residentAlertSms.service";
import { answerAskMurus, checkResidentRumorWithLlm } from "../../src/modules/residentAlerts/residentAskMurus.service";

const app = createApp();
const getUserMock = supabase?.auth.getUser as jest.Mock;
const getProfileMock = authRepo.getProfile as jest.Mock;
const sendResidentAlertSmsMock = sendResidentAlertSms as jest.Mock;
const sendResidentAlertWhatsappMock = sendResidentAlertWhatsapp as jest.Mock;
const sendResidentAlertTelegramMock = sendResidentAlertTelegram as jest.Mock;
const answerAskMurusMock = answerAskMurus as jest.Mock;
const checkResidentRumorWithLlmMock = checkResidentRumorWithLlm as jest.Mock;

describe("resident alert routes", () => {
  beforeEach(() => {
    clearResidentAlertsForTests();
    clearCommandStateForTests();
    getUserMock.mockReset();
    getProfileMock.mockReset();
    sendResidentAlertSmsMock.mockClear();
    sendResidentAlertWhatsappMock.mockClear();
    sendResidentAlertTelegramMock.mockClear();
    answerAskMurusMock.mockClear();
    checkResidentRumorWithLlmMock.mockClear();
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
      channels: ["in_app", "web"],
    });
    expect(sendResidentAlertSmsMock).not.toHaveBeenCalled();
    expect(sendResidentAlertWhatsappMock).not.toHaveBeenCalled();
    expect(sendResidentAlertTelegramMock).not.toHaveBeenCalled();

    const timeline = await request(app).get("/api/v1/command/timeline").expect(200);
    expect(timeline.body.data[0]).toMatchObject({
      title: "Resident alert published - Avoid Orchard Road",
      detail: "Orchard Road broadcast issued to residents within 1200m.",
      location: "Orchard Road",
      severity: "critical",
    });
  });

  it("sends SMS only when the leader opts into SMS delivery", async () => {
    const response = await request(app)
      .post("/api/v1/resident-alerts")
      .set("Authorization", "Bearer leader-token")
      .send({
        title: "Avoid Orchard Road",
        publicAction: "Use Somerset MRT exits and avoid basement links until further notice.",
        severity: "danger",
        locationLabel: "Orchard Road",
        smsEnabled: true,
      })
      .expect(201);

    expect(response.body.data.channels).toEqual(["in_app", "web", "sms"]);
    expect(sendResidentAlertSmsMock).toHaveBeenCalledTimes(1);
    expect(sendResidentAlertSmsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: response.body.data.id,
        title: "Avoid Orchard Road",
      })
    );
  });

  it("sends WhatsApp and Telegram only when the leader opts into those channels", async () => {
    const response = await request(app)
      .post("/api/v1/resident-alerts")
      .set("Authorization", "Bearer leader-token")
      .send({
        title: "Avoid Orchard Road",
        publicAction: "Use Somerset MRT exits and avoid basement links until further notice.",
        severity: "danger",
        locationLabel: "Orchard Road",
        whatsappEnabled: true,
        telegramEnabled: true,
      })
      .expect(201);

    expect(response.body.data.channels).toEqual(["in_app", "web", "whatsapp", "telegram"]);
    expect(sendResidentAlertSmsMock).not.toHaveBeenCalled();
    expect(sendResidentAlertWhatsappMock).toHaveBeenCalledTimes(1);
    expect(sendResidentAlertTelegramMock).toHaveBeenCalledTimes(1);
    expect(sendResidentAlertWhatsappMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: response.body.data.id, title: "Avoid Orchard Road" })
    );
    expect(sendResidentAlertTelegramMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: response.body.data.id, title: "Avoid Orchard Road" })
    );
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

  it("answers Ask MURUS resident questions through the copilot endpoint", async () => {
    const payload = {
      question: "Can I still take the MRT?",
      deterministicAnswer: "Use the MRT only if MURUS and station staff say the route is clear.",
      alert: {
        title: "Avoid Orchard Road",
        body: "Flash flooding has been reported near Orchard Road.",
        publicAction: "Use Somerset MRT exits and avoid basement links.",
        severity: "danger",
        status: "updated",
        locationLabel: "Orchard Road",
        radiusMeters: 1200,
      },
      residentContext: {
        profile: "elderly",
        pointLabel: "Work",
        pointSublabel: "Orchard Road",
        transportMode: "mrt",
        mobilityNeed: "elderly",
      },
    };

    const response = await request(app)
      .post("/api/v1/resident-alerts/ask-murus")
      .send(payload)
      .expect(200);

    expect(response.body.source).toContain("Ask MURUS");
    expect(response.body.data).toMatchObject({
      answer: expect.stringContaining("MRT"),
      mode: "llm",
      model: "deepseek-v4-pro:stable",
    });
    expect(answerAskMurusMock).toHaveBeenCalledWith(payload);
  });

  it("checks resident rumors through the Ask MURUS rumor endpoint", async () => {
    const payload = {
      claim: "Orchard Road MRT is closed",
      officialAlerts: [
        {
          id: "resident-alert:1",
          title: "Avoid Orchard Road",
          body: "Flash flooding has been reported near Orchard Road.",
          publicAction: "Use Somerset MRT exits and avoid basement links.",
          severity: "danger",
          status: "updated",
          locationLabel: "Orchard Road",
        },
      ],
      residentContext: {
        profile: "general",
        pointLabel: "Work",
        pointSublabel: "Orchard Road",
      },
      deterministicResult: {
        status: "partial",
        label: "Partly related, not fully confirmed",
        message: "This mentions a similar area, but the exact closure is not confirmed.",
      },
    };

    const response = await request(app)
      .post("/api/v1/resident-alerts/rumor-check")
      .send(payload)
      .expect(200);

    expect(response.body.source).toContain("rumor checker");
    expect(response.body.data).toMatchObject({
      status: "partial",
      label: "Partly related, not confirmed",
      mode: "llm",
    });
    expect(checkResidentRumorWithLlmMock).toHaveBeenCalledWith(payload);
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
