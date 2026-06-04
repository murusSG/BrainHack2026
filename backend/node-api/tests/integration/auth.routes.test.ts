import request from "supertest";

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

import { createApp } from "../../src/app";
import { supabase } from "../../src/config/supabase";
import { authRepo } from "../../src/repositories/auth.repo";

const app = createApp();
const getUserMock = supabase?.auth.getUser as jest.Mock;
const getProfileMock = authRepo.getProfile as jest.Mock;

describe("auth routes", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  afterAll(() => {
    consoleError.mockRestore();
  });

  beforeEach(() => {
    consoleError.mockClear();
    getUserMock.mockReset();
    getProfileMock.mockReset();
    getProfileMock.mockResolvedValue(null);
  });

  it("returns the profile role and agency for the authenticated user", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "commander@murus.sg",
          app_metadata: { role: "public" },
        },
      },
      error: null,
    });
    getProfileMock.mockResolvedValue({ id: "user-1", role: "leader", agency: "MOH" });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(getUserMock).toHaveBeenCalledWith("test-token");
    expect(getProfileMock).toHaveBeenCalledWith("user-1");
    expect(response.body.data).toMatchObject({
      id: "user-1",
      email: "commander@murus.sg",
      role: "leader",
      agency: "MOH",
    });
  });

  it("falls back to JWT app metadata when no profile row is available", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          email: "responder@murus.sg",
          app_metadata: { role: "responder" },
        },
      },
      error: null,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer responder-token")
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: "user-2",
      role: "responder",
    });
  });

  it("returns 401 when the bearer token is missing", async () => {
    const response = await request(app).get("/api/v1/auth/me").expect(401);

    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Missing bearer token.",
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase rejects the token", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid jwt" },
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer bad-token")
      .expect(401);

    expect(response.body.error).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token.",
    });
  });
});
