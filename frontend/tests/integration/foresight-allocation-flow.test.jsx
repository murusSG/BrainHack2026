import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverviewPage } from '../../src/pages/OverviewPage';
import { api } from '../../src/services/api';

vi.mock('../../src/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [],
    status: 'done',
    error: null,
  }),
}));

vi.mock('../../src/services/api', () => ({
  api: {
    foresightPredictions: vi.fn(),
    commandAllocations: vi.fn(),
    commandTimeline: vi.fn(),
    createCommandAllocation: vi.fn(),
    updateCommandAllocationAgencies: vi.fn(),
  },
}));

const foresightPayload = {
  predictions: [
    {
      id: 'test:flood:orchard',
      riskType: 'flood_escalation',
      source: 'PUB',
      title: 'Flood escalation watch - Orchard Road',
      confidence: 88,
      horizonLabel: '40 min',
      severity: 'critical',
      recommendedAction: 'Stage PUB crew',
      publicAction: 'Avoid underpasses and flood water.',
      scenarioSource: 'rule',
      evidence: ['PUB sensor above threshold', 'High commuter density corridor'],
      narrative: {
        status: 'generated',
        commanderBrief: 'Stage PUB crew before access routes degrade.',
      },
    },
  ],
  baseline: {
    overflowProbability: 64,
    responseTime: 18,
    livesAtRisk: 847,
  },
  outcomes: {
    overflowProbability: 64,
    responseTime: 18,
    livesAtRisk: 847,
  },
  llm: {
    enabled: true,
    status: 'generated',
    model: 'gpt-5.5:stable',
  },
  leaderBrief: {
    status: 'generated',
    model: 'gpt-5.5:stable',
    headline: 'Command priority: Orchard flood watch',
    summary: 'Stage crews for Orchard Road before access routes degrade.',
    posture: 'stage_resources',
    priorityActions: [
      {
        label: 'Stage PUB crew',
        owner: 'PUB',
        urgency: 'now',
        rationale: 'PUB sensor trend is above the deterministic action threshold.',
        linkedPredictionIds: ['test:flood:orchard'],
      },
    ],
    publicComms: 'Avoid underpasses and flood water.',
    uncertainty: 'Confidence and horizon come from deterministic rules.',
    tradeoff: 'No additional surge beds or QRTs selected.',
  },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('Foresight to allocation review flow', () => {
  it('stages a forecast action into the dispatcher review queue', async () => {
    api.foresightPredictions.mockResolvedValue(foresightPayload);
    api.commandAllocations.mockResolvedValue([]);
    api.commandTimeline
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'timeline-staged',
          time: '12:00 SGT',
          title: 'Allocation staged - Flood escalation watch - Orchard Road',
          detail: 'Dispatcher review opened for PUB, LTA, CMD.',
          location: 'Flood escalation watch - Orchard Road',
          severity: 'critical',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'timeline-approved',
          time: '12:01 SGT',
          title: 'Allocation approved - Flood escalation watch - Orchard Road',
          detail: 'PUB, LTA, CMD marked approved.',
          location: 'Flood escalation watch - Orchard Road',
          severity: 'critical',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'timeline-contacted',
          time: '12:02 SGT',
          title: 'Agencies contacted - Flood escalation watch - Orchard Road',
          detail: 'PUB, LTA, CMD marked contacted.',
          location: 'Flood escalation watch - Orchard Road',
          severity: 'critical',
        },
      ]);
    api.createCommandAllocation.mockImplementation(async (recommendation) => ({
      ...recommendation,
      id: 'alloc-persisted-1',
      createdAt: '2026-06-04T04:00:00.000Z',
      updatedAt: '2026-06-04T04:00:00.000Z',
    }));
    api.updateCommandAllocationAgencies.mockImplementation(async (id, payload) => ({
      id,
      incidentId: 'FORESIGHT',
      incidentTitle: 'Flood escalation watch - Orchard Road',
      severity: 'critical',
      confidence: 88,
      generatedAt: 'just now',
      generatedFrom: 'Generated from Foresight staged action',
      linkedPrediction: 'Flood escalation watch - Orchard Road',
      modelVersion: 'MURUS-FORESIGHT-ALLOC-1.0',
      triggerSignals: ['Forecast source: PUB', 'Recommended owner: PUB', 'PUB sensor above threshold'],
      draftMessage: 'Please confirm agency availability.',
      agencies: ['pub', 'lta', 'command'].map((agencyId) => ({
        id: agencyId,
        agency: agencyId === 'command' ? 'CMD' : agencyId.toUpperCase(),
        channel: agencyId === 'command' ? 'Ops Command' : 'Ops',
        confidence: 80,
        reason: 'Reason',
        suggestedAction: 'Action',
        status: payload.status,
      })),
    }));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Command priority: Orchard flood watch')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stage PUB crew' }));

    expect(await screen.findByRole('heading', { name: 'Staged Actions' })).toBeInTheDocument();
    expect(screen.getByText('Staged for dispatcher review')).toBeInTheDocument();
    expect(screen.getByText('Generated from Foresight staged action')).toBeInTheDocument();
    expect(await screen.findByText('Saved to command state')).toBeInTheDocument();
    expect(screen.getAllByText('Flood escalation watch - Orchard Road').length).toBeGreaterThan(0);
    expect(screen.getByText('MURUS-FORESIGHT-ALLOC-1.0')).toBeInTheDocument();
    expect(screen.getAllByText('PUB sensor above threshold').length).toBeGreaterThan(0);
    expect(await screen.findByText('Allocation staged - Flood escalation watch - Orchard Road')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve selected' }));

    await waitFor(() => {
      expect(screen.getByText('PUB: Approved')).toBeInTheDocument();
      expect(screen.getByText('LTA: Approved')).toBeInTheDocument();
      expect(screen.getByText('CMD: Approved')).toBeInTheDocument();
    });
    expect(await screen.findByText('Allocation approved - Flood escalation watch - Orchard Road')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Contact agencies' }));

    await waitFor(() => {
      expect(screen.getByText('PUB: Contacted')).toBeInTheDocument();
      expect(screen.getByText('LTA: Contacted')).toBeInTheDocument();
      expect(screen.getByText('CMD: Contacted')).toBeInTheDocument();
    });
    expect(await screen.findByText('Agencies contacted - Flood escalation watch - Orchard Road')).toBeInTheDocument();
  });
});
