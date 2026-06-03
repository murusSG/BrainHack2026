describe("data.gov.sg client", () => {
  it("normalises an empty datastore page to an empty array", async () => {
    jest.resetModules();
    jest.doMock("axios", () => ({
      __esModule: true,
      default: {
        create: () => ({
          get: jest.fn().mockResolvedValue({ data: { success: true, result: { records: [] } } }),
        }),
        get: jest.fn(),
      },
    }));

    const { datastoreRecords } = await import("../../src/services/dataGovSg.client");
    await expect(datastoreRecords("resource-id")).resolves.toEqual([]);
  });

  it("flattens downloaded GeoJSON point features into tabular records", async () => {
    jest.resetModules();
    const { recordsFromDownloadedDataset } = await import("../../src/services/dataGovSg.client");

    const records = recordsFromDownloadedDataset({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [103.8488, 1.292] },
          properties: { OBJECTID: 962, NAME: "Central Fire Station" },
        },
      ],
    });

    expect(records).toEqual([
      {
        OBJECTID: 962,
        NAME: "Central Fire Station",
        _download_index: 0,
        _geometry_type: "Point",
        longitude: 103.8488,
        latitude: 1.292,
        geometry: { type: "Point", coordinates: [103.8488, 1.292] },
      },
    ]);
  });
});
