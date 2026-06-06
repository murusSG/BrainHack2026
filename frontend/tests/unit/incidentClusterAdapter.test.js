import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearIncidentCoordinateCacheForTests,
  normaliseIncidentClusters,
} from '../../src/services/incidentClusterAdapter';

function cluster(overrides = {}) {
  return {
    incident_id: 'INC-001',
    status: 'pending_approval',
    resource_allocation_status: 'pending_dispatcher_approval',
    created_at: '2026-06-06T02:00:00.000Z',
    updated_at: '2026-06-06T02:00:00.000Z',
    approved_agencies: [],
    reports: [{ report_id: 'RPT-001' }],
    extracted_incident: {
      incident_type: 'building fire',
      location_text: '10 Example Road',
      severity: 'high',
    },
    canonical_event: {
      hazardType: 'FIRE',
      severity: 'HIGH',
      vicinityRadiusMeters: 500,
      location: { addressText: '10 Example Road' },
    },
    ...overrides,
  };
}

beforeEach(() => {
  clearIncidentCoordinateCacheForTests();
});

describe('incident cluster map normalization', () => {
  it('retains cached marker coordinates when geocoding later becomes unavailable', async () => {
    const api = {
      oneMapSearch: vi
        .fn()
        .mockResolvedValueOnce([{ latitude: '1.301', longitude: '103.801' }])
        .mockRejectedValue(new Error('OneMap unavailable')),
    };

    const first = await normaliseIncidentClusters([cluster()], api);
    const second = await normaliseIncidentClusters([cluster()], api, first);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: 'cluster-INC-001',
      lat: 1.301,
      lng: 103.801,
    });
    expect(api.oneMapSearch).toHaveBeenCalledTimes(1);
  });

  it('preserves the previous marker when all fresh coordinate resolution fails', async () => {
    const previous = [
      {
        id: 'cluster-INC-001',
        lat: 1.31,
        lng: 103.81,
        raw: { incident_id: 'INC-001' },
      },
    ];
    const api = {
      oneMapSearch: vi.fn().mockRejectedValue(new Error('OneMap unavailable')),
    };

    const events = await normaliseIncidentClusters([cluster()], api, previous);

    expect(events[0]).toMatchObject({ lat: 1.31, lng: 103.81 });
  });

  it('updates marker color without changing its cached position after dispatch', async () => {
    const api = {
      oneMapSearch: vi.fn().mockResolvedValue([
        { latitude: '1.301', longitude: '103.801' },
      ]),
    };
    const pending = await normaliseIncidentClusters([cluster()], api);
    const dispatched = await normaliseIncidentClusters(
      [
        cluster({
          status: 'dispatched',
          resource_allocation_status: 'approved',
          approved_agencies: ['SCDF'],
        }),
      ],
      api,
      pending
    );

    expect(dispatched[0]).toMatchObject({
      lat: 1.301,
      lng: 103.801,
      markerColor: '#19d39a',
      incidentStatus: 'dispatched',
    });
    expect(api.oneMapSearch).toHaveBeenCalledTimes(1);
  });
});
