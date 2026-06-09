import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewPage } from '../../src/pages/OverviewPage';

vi.mock('../../src/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [],
    status: 'done',
    error: null,
  }),
}));

vi.mock('../../src/services/api', () => ({
  api: {
    commandAllocations: vi.fn().mockResolvedValue([]),
    commandTimeline: vi.fn().mockResolvedValue([]),
    createCommandAllocation: vi.fn(),
    updateCommandAllocationAgencies: vi.fn(),
  },
}));

vi.mock('../../src/components/AgencyFeedPanel', () => ({
  AgencyFeedPanel: () => <section aria-label="Agency feed" />,
}));

vi.mock('../../src/components/AllocationApprovalPanel', () => ({
  AllocationApprovalPanel: () => <section aria-label="Allocation approvals" />,
}));

vi.mock('../../src/components/ForesightEngine', () => ({
  ForesightEngine: () => <section aria-label="Foresight engine" />,
}));

vi.mock('../../src/components/MetricCard', () => ({
  MetricCard: ({ label }) => <article>{label}</article>,
}));

vi.mock('../../src/components/RecommendationPanel', () => ({
  RecommendationPanel: () => <section aria-label="Recommendations" />,
}));

vi.mock('../../src/components/TimelinePanel', () => ({
  TimelinePanel: () => <section aria-label="Timeline" />,
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location-state">
      {JSON.stringify({ pathname: location.pathname, state: location.state })}
    </output>
  );
}

function renderOverview() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <OverviewPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function currentLocation() {
  return JSON.parse(screen.getByTestId('location-state').textContent);
}

describe('Overview quick actions', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('routes Create New Incident to the dispatcher workflow', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole('button', { name: /Create New Incident/i }));

    expect(currentLocation()).toMatchObject({
      pathname: '/dispatcher',
      state: {
        quickActionNotice: expect.stringContaining('Create new incident selected'),
      },
    });
  });

  it('routes Broadcast Emergency Alert to the resident alert composer with a draft', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole('button', { name: /Broadcast Emergency Alert/i }));

    expect(currentLocation()).toMatchObject({
      pathname: '/alerts',
      state: {
        openResidentAlertComposer: true,
        residentAlertDraft: {
          title: 'Emergency advisory for Orchard Road residents',
          locationLabel: 'Orchard Road',
          publicAction: 'Use Somerset MRT exits and avoid basement links until further notice.',
        },
      },
    });
  });

  it('routes Request Resource Transfer to the resource request workflow', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole('button', { name: /Request Resource Transfer/i }));

    expect(currentLocation()).toMatchObject({
      pathname: '/resources',
      state: {
        quickActionNotice: expect.stringContaining('Resource transfer shortcut selected'),
        requestForm: {
          resourceType: 'Mobile Water Pumps',
          quantity: '2',
          priority: 'High',
        },
      },
    });
  });

  it('summarizes resident check-ins for command', () => {
    window.localStorage.setItem(
      'murusResidentCheckins',
      JSON.stringify([
        {
          id: 'resident-alert:1:accessible:1',
          alertId: 'resident-alert:1',
          alertTitle: 'Avoid Orchard Road',
          alertLocation: 'Orchard Road',
          pointLabel: 'Work',
          status: 'accessible',
          statusLabel: 'I need accessible assistance',
          residentProfile: 'mobility',
          priority: 'high',
        },
        {
          id: 'resident-alert:2:safe:2',
          alertId: 'resident-alert:2',
          alertTitle: 'Avoid Orchard Road',
          alertLocation: 'Orchard Road',
          pointLabel: 'Home',
          status: 'safe',
          statusLabel: "I'm safe",
          residentProfile: 'general',
          priority: 'normal',
        },
      ])
    );

    renderOverview();

    expect(screen.getByRole('region', { name: 'Resident response summary' })).toBeInTheDocument();
    expect(screen.getByText('2 responses')).toBeInTheDocument();
    expect(screen.getByText('Priority assistance')).toBeInTheDocument();
    expect(screen.getAllByText('I need accessible assistance').length).toBeGreaterThan(1);
    expect(screen.getByText(/Work near Orchard Road \/ mobility/i)).toBeInTheDocument();
  });
});
