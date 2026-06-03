import * as populationService from "../../src/modules/population/population.service";

describe("Population service", () => {
  it("returns a configuration error when HDB dataset id is absent", async () => {
    await expect(populationService.getHdbBuildings()).rejects.toThrow("Population dataset id is not configured.");
  });

  it("returns a configuration error when planning area dataset id is absent", async () => {
    await expect(populationService.getImpactContext("toa payoh")).rejects.toThrow("Population dataset id is not configured.");
  });

  it("does not calculate nearby context without configured datasets", async () => {
    await expect(populationService.getNearbyContext(1.2931, 103.852)).rejects.toThrow("Population dataset id is not configured.");
  });
});
