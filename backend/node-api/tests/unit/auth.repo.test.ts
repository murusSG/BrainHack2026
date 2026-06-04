jest.mock("../../src/config/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from "../../src/config/supabase";
import { authRepo } from "../../src/repositories/auth.repo";

const fromMock = supabase?.from as jest.Mock;

describe("auth.repo", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("maps a Supabase profile row to an auth profile", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "user-1", role: "responder", agency: "SCDF" },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ select });

    await expect(authRepo.getProfile("user-1")).resolves.toEqual({
      id: "user-1",
      role: "responder",
      agency: "SCDF",
    });

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, role, agency");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("falls back to public for an unexpected profile role", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: { id: "user-2", role: "admin", agency: null },
              error: null,
            }),
        }),
      }),
    });

    await expect(authRepo.getProfile("user-2")).resolves.toEqual({
      id: "user-2",
      role: "public",
      agency: undefined,
    });
  });

  it("returns null when the profiles table is unavailable or the row is missing", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    await expect(authRepo.getProfile("missing-user")).resolves.toBeNull();

    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: { message: "relation not found" } }),
        }),
      }),
    });

    await expect(authRepo.getProfile("user-3")).resolves.toBeNull();
    consoleError.mockRestore();
  });
});
