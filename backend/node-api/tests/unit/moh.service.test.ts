import * as mohService from "../../src/modules/moh/moh.service";

describe("MOH service", () => {
  it("returns a configuration error when infectious disease dataset id is absent", async () => {
    await expect(mohService.getInfectiousDiseases("dengue")).rejects.toThrow("MOH dataset id is not configured.");
  });

  it("returns a configuration error when health capacity dataset id is absent", async () => {
    await expect(mohService.getHealthCapacity()).rejects.toThrow("MOH dataset id is not configured.");
  });

  it("returns a configuration error when summary source datasets are absent", async () => {
    await expect(mohService.getSignalsSummary()).rejects.toThrow("MOH dataset id is not configured.");
  });
});
