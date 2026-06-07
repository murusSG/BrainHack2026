import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResidentPage } from '../../src/pages/ResidentPage';
import { api } from '../../src/services/api';

vi.mock('../../src/components/CrisisMap', () => ({
  CrisisMap: ({ events }) => <div data-testid="resident-map">{events.length} events</div>,
}));

vi.mock('../../src/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [],
    status: 'done',
    error: null,
  }),
}));

vi.mock('../../src/services/api', () => ({
  api: {
    residentAlerts: vi.fn(),
    scdfNearest: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ResidentPage alert inbox', () => {
  it('renders command-published resident alerts near the selected watch point', async () => {
    api.residentAlerts.mockResolvedValue([
      {
        id: 'resident-alert:1',
        sourceType: 'command_broadcast',
        status: 'updated',
        title: 'Avoid Orchard Road',
        body: 'Flash flooding has been reported near Orchard Road.',
        publicAction: 'Use Somerset MRT exits and avoid basement links.',
        severity: 'danger',
        locationLabel: 'Orchard Road',
        lat: 1.3048,
        lng: 103.8318,
        radiusMeters: 1200,
        audience: { type: 'nearby', radiusMeters: 1200 },
      },
    ]);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ResidentPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /WorkOrchard Road/i }));

    expect(await screen.findByText('Avoid Orchard Road')).toBeInTheDocument();
    expect(screen.getByText('Command alert')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Action: Use Somerset MRT exits and avoid basement links.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acknowledged' })).toBeDisabled();
    });
  });
});
