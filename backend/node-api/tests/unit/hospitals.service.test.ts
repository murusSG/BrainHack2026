import {
  normaliseEdWaitingTime,
  normaliseFacilityReference,
  normaliseWideHospitalRows,
} from "../../src/modules/hospitals/hospitals.service";

describe("PublicHospitalDataService normalisers", () => {
  it("normalises MOH bed occupancy wide workbook rows without inventing missing hospital values", () => {
    const metrics = normaliseWideHospitalRows(
      [
        ["Bed Occupancy Rate", null, null],
        ["Years", "Date", "AH", "CGH"],
        ["2026", "20/5/26", "78.1%", null],
      ],
      {
        metricName: "Beds Occupancy Rate",
        unit: "%",
        sourceName: "MOH Beds Occupancy Rate",
        sourceUrl: "https://www.moh.gov.sg/bor",
        notes: "Public statistical BOR.",
      }
    );

    expect(metrics).toEqual([
      {
        metric_name: "Beds Occupancy Rate",
        facility_name: "Alexandra Hospital",
        value: "78.1",
        unit: "%",
        source_name: "MOH Beds Occupancy Rate",
        source_url: "https://www.moh.gov.sg/bor",
        last_updated: "20/5/26",
        notes: "Public statistical BOR.",
      },
    ]);
  });

  it("normalises MOH health facilities and beds as reference capacity only", () => {
    const metric = normaliseFacilityReference(
      {
        year: "2024",
        institution_type: "Hospital",
        facility_type_a: "Acute",
        no_of_facilities: "19",
        no_beds: "10084",
      },
      "d_74ee2734189f4124fefbf01c3fe48bec"
    );

    expect(metric).toMatchObject({
      metric_name: "Reference Bed Capacity",
      facility_name: "Hospital - Acute",
      value: "10084",
      unit: "beds",
      dataset_id: "d_74ee2734189f4124fefbf01c3fe48bec",
      notes: "Static/reference public dataset; not real-time bed availability.",
    });
  });

  it("normalises configured ED waiting-time records only when facility and value are present", () => {
    expect(
      normaliseEdWaitingTime(
        {
          hospital_name: "Example Hospital",
          median_waiting_time_minutes: "42",
          date: "2026-06-01",
        },
        "dataset-id"
      )
    ).toMatchObject({
      metric_name: "Emergency Department Waiting Time",
      facility_name: "Example Hospital",
      value: "42",
      unit: "minutes",
      dataset_id: "dataset-id",
      last_updated: "2026-06-01",
    });

    expect(normaliseEdWaitingTime({ hospital_name: "Example Hospital" }, "dataset-id")).toBeUndefined();
  });
});

