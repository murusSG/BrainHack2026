import { BadRequestError } from "../../src/utils/apiError";
import { parseCoordinatePair } from "../../src/utils/geo";
import * as scdfService from "../../src/modules/scdf/scdf.service";

describe("SCDF service", () => {
  it("returns a configuration error when dataset ids are absent", async () => {
    await expect(scdfService.getResources("FIRE_STATION")).rejects.toThrow("SCDF dataset id is not configured.");
  });

  it("does not calculate nearest resources without configured datasets", async () => {
    await expect(scdfService.getNearestResources(1.2931, 103.8492, "FIRE_STATION")).rejects.toThrow(
      "SCDF dataset id is not configured."
    );
  });

  it("rejects invalid latitude", () => {
    expect(() => parseCoordinatePair("999", "103.85")).toThrow(BadRequestError);
  });

  it("rejects unsupported resource type", () => {
    expect(() => scdfService.parseScdfResourceType("boat")).toThrow(BadRequestError);
  });
});
