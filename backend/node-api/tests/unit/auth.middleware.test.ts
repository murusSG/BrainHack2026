import type { Request, Response } from "express";
import { requireRole } from "../../src/middlewares/auth";
import { ApiError } from "../../src/utils/apiError";

describe("auth middleware", () => {
  it("allows users with an accepted role", () => {
    const req = { user: { id: "user-1", role: "leader" } } as Request;
    const next = jest.fn();

    requireRole("leader", "responder")(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects users with a non-accepted role", () => {
    const req = { user: { id: "user-2", role: "public" } } as Request;
    const next = jest.fn();

    requireRole("leader")(req, {} as Response, next);

    const error = next.mock.calls[0][0] as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
      details: { required: ["leader"], actual: "public" },
    });
  });

  it("rejects unauthenticated requests", () => {
    const req = {} as Request;
    const next = jest.fn();

    requireRole("leader")(req, {} as Response, next);

    expect(next.mock.calls[0][0]).toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});
