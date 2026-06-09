import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DispatcherPage } from '../../src/pages/DispatcherPage';
import { ResponderPage } from '../../src/pages/ResponderPage';
import { api } from '../../src/services/api';

vi.mock('../../src/components/CrisisMap', () => ({
  CrisisMap: ({ events }) => <div data-testid="crisis-map">{events.length} markers</div>,
}));

vi.mock('../../src/services/api', () => ({
  api: {
    incidentPriorityQueue: vi.fn(),
    incidentClusters: vi.fn(),
    decideResourceAllocation: vi.fn(),
    responderIncidents: vi.fn(),
    responderLogs: vi.fn(),
    createResponderLog: vi.fn(),
    oneMapSearch: vi.fn(),
  },
}));

function cluster({
  id,
  severity,
  score,
  position,
  location,
  status = 'pending_approval',
  agencies = ['SCDF'],
}) {
  return {
    incident_id: id,
    status,
    resource_allocation_status: status === 'dispatched' ? 'approved' : 'pending_dispatcher_approval',
    created_at: '2026-06-06T02:00:00.000Z',
    updated_at: '2026-06-06T02:00:00.000Z',
    approved_at: status === 'dispatched' ? '2026-06-06T02:05:00.000Z' : undefined,
    queue_position: position,
    priority_score: score,
    priority_reason: `${severity} severity`,
    approved_agencies: status === 'dispatched' ? agencies : [],
    reports: [{ report_id: `${id}-R1` }],
    extracted_incident: {
      incident_type: severity === 'critical' ? 'building fire' : 'road accident',
      location_text: location,
      severity,
      description: `${severity} incident description`,
      hazards: ['access risk'],
      confidence: 0.9,
    },
    recommendations: {
      mandatory_agencies: agencies.map((agency) => ({
        agency,
        reason: `${agency} response required.`,
      })),
      suggested_agencies: [],
      risk_notes: [],
    },
    canonical_event: {
      hazardType: severity === 'critical' ? 'FIRE' : 'ROAD_INCIDENT',
      severity: severity.toUpperCase(),
      vicinityRadiusMeters: 500,
      location: { latitude: 1.35, longitude: 103.82, addressText: location },
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('dispatcher and responder incident flow', () => {
  it('renders backend queue order and removes an approved incident', async () => {
    const critical = cluster({
      id: 'INC-002',
      severity: 'critical',
      score: 100,
      position: 1,
      location: 'Tampines',
      agencies: ['SCDF', 'SPF'],
    });
    const medium = cluster({
      id: 'INC-001',
      severity: 'medium',
      score: 57,
      position: 2,
      location: 'Jurong',
    });
    api.incidentPriorityQueue.mockResolvedValueOnce([critical, medium]).mockResolvedValueOnce([]);
    api.incidentClusters
      .mockResolvedValueOnce([critical, medium])
      .mockResolvedValueOnce([{ ...critical, status: 'dispatched', resource_allocation_status: 'approved' }]);
    api.decideResourceAllocation.mockResolvedValue({
      message: 'Dispatch approved and shared with responder agencies.',
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DispatcherPage session={{ identity: 'DISP-001' }} />
      </MemoryRouter>
    );

    const queueItems = await screen.findAllByRole('button', { name: /incident description|Tampines|Jurong/i });
    expect(queueItems[0]).toHaveTextContent('Tampines');
    expect(queueItems[1]).toHaveTextContent('Jurong');
    expect(screen.getByText('100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve Dispatch' }));

    await waitFor(() => {
      expect(api.decideResourceAllocation).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_id: 'INC-002',
          dispatcher_id: 'DISP-001',
          decision: 'approved',
          approved_agencies: ['SCDF', 'SPF'],
        })
      );
    });
    expect(await screen.findByText('No incidents awaiting dispatch approval.')).toBeInTheDocument();
  });

  it('shows only dispatched incidents and posts into the shared log', async () => {
    const dispatched = cluster({
      id: 'INC-003',
      severity: 'high',
      score: 85,
      location: 'Orchard Road',
      status: 'dispatched',
      agencies: ['SPF', 'SCDF'],
    });
    api.responderIncidents.mockResolvedValue([dispatched]);
    api.responderLogs
      .mockResolvedValueOnce([
        {
          id: 'INC-003-LOG-001',
          agency: 'MURUS',
          author: 'DISP-001',
          category: 'resource_update',
          timestamp: '2026-06-06T02:05:00.000Z',
          message: 'Dispatch approved. Resources assigned: SPF, SCDF.',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'INC-003-LOG-002',
          agency: 'SPF',
          author: 'Alpha 21',
          category: 'security',
          timestamp: '2026-06-06T02:06:00.000Z',
          message: 'Crowd cordon established.',
        },
      ]);
    api.createResponderLog.mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResponderPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Dispatch approved. Resources assigned: SPF, SCDF.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Agency'), 'SPF');
    await user.type(screen.getByLabelText('Author / unit'), 'Alpha 21');
    await user.selectOptions(screen.getByLabelText('Category'), 'security');
    await user.type(screen.getByLabelText('Operational update'), 'Crowd cordon established.');
    await user.click(screen.getByRole('button', { name: 'Add shared update' }));

    expect(api.createResponderLog).toHaveBeenCalledWith('INC-003', {
      agency: 'SPF',
      author: 'Alpha 21',
      category: 'security',
      message: 'Crowd cordon established.',
    });
    expect(await screen.findByText('Crowd cordon established.')).toBeInTheDocument();
  });

  it('keeps the latest shared logs visible when an older empty refresh resolves late', async () => {
    const dispatched = cluster({
      id: 'INC-004',
      severity: 'high',
      score: 81,
      location: 'Jurong East Station',
      status: 'dispatched',
      agencies: ['SPF', 'SCDF'],
    });
    const firstRefresh = deferred();

    api.responderIncidents.mockResolvedValue([dispatched]);
    api.responderLogs
      .mockReturnValueOnce(firstRefresh.promise)
      .mockResolvedValueOnce([
        {
          id: 'INC-004-LOG-002',
          agency: 'SPF',
          author: 'alpha',
          category: 'medical',
          timestamp: '2026-06-09T14:09:00.000Z',
          message: '23 injured, all in stable condition.',
        },
      ]);
    api.createResponderLog.mockResolvedValue({});
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResponderPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Jurong East Station/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Agency'), 'SPF');
    await user.type(screen.getByLabelText('Author / unit'), 'alpha');
    await user.selectOptions(screen.getByLabelText('Category'), 'medical');
    await user.type(screen.getByLabelText('Operational update'), '23 injured, all in stable condition.');
    await user.click(screen.getByRole('button', { name: 'Add shared update' }));

    expect(await screen.findByText('23 injured, all in stable condition.')).toBeInTheDocument();

    firstRefresh.resolve([]);

    await waitFor(() => {
      expect(screen.getByText('23 injured, all in stable condition.')).toBeInTheDocument();
    });
    expect(screen.queryByText('No shared updates recorded yet for this incident.')).not.toBeInTheDocument();
  });
});
