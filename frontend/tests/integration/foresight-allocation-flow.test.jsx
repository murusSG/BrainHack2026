import { render, screen } from '@testing-library/react';
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

describe('Foresight staging on the cleaned Overview', () => {
  it('keeps staged actions within Foresight without rendering a dispatcher review queue', async () => {
    api.foresightPredictions.mockResolvedValue(foresightPayload);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Command priority: Orchard flood watch')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stage PUB crew' }));

    expect(await screen.findByRole('heading', { name: 'Staged Actions' })).toBeInTheDocument();
    expect(screen.getByText('Staged for command review')).toBeInTheDocument();
    expect(screen.queryByText('Dispatcher Review Queue')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Recommendations')).not.toBeInTheDocument();
    expect(api.foresightPredictions).toHaveBeenCalled();
  });
});
