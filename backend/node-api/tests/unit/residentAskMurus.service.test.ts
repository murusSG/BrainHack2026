import { violatesResidentSafetyGuardrails } from "../../src/modules/residentAlerts/residentAskMurus.service";

describe("residentAskMurus.service", () => {
  it("allows cautious conditional transport guidance from the LLM", () => {
    expect(
      violatesResidentSafetyGuardrails(
        "Situation: Flooding is reported near Orchard Road.\nWhat to do now: Use the MRT only if station staff confirm the route is clear. Avoid basement links until officials advise otherwise."
      )
    ).toBe(false);
  });

  it("allows explicit not-confirmed route wording", () => {
    expect(
      violatesResidentSafetyGuardrails(
        "What to do now: MURUS has not confirmed the route is clear, so wait for staff before moving."
      )
    ).toBe(false);
  });

  it("blocks direct invented route clearance claims", () => {
    expect(violatesResidentSafetyGuardrails("The MRT route is clear and safe to use.")).toBe(true);
  });

  it("blocks direct boarding instructions", () => {
    expect(violatesResidentSafetyGuardrails("Board the MRT now to leave the area.")).toBe(true);
  });
});
