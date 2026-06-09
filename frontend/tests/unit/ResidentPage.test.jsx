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
  window.localStorage.clear();
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
    expect(screen.getAllByText('Does this affect me?').length).toBeGreaterThan(1);
    expect(screen.getByText('Next safe action')).toBeInTheDocument();
    expect(screen.getByText('Emergency pack mode')).toBeInTheDocument();
    expect(screen.getByText('0 / 5 ready')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Phone charged/i));
    await user.click(screen.getByLabelText(/Tell family your status/i));

    expect(screen.getByText('2 / 5 ready')).toBeInTheDocument();
    expect(screen.getByText(/I am at Work near Orchard Road/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency pack is 2\/5 ready/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy status' }));

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Simplify alert' }));

    expect(screen.getByRole('button', { name: 'Simple mode on' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Plain language')).toBeInTheDocument();
    expect(screen.getAllByText('Avoid Orchard Road').length).toBeGreaterThan(1);
    expect(screen.getByText('Stay calm and move away from the affected area.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Transport mode'), 'driving');
    await user.selectOptions(screen.getByLabelText('Mobility needs'), 'mobility');
    await user.click(screen.getByRole('button', { name: 'Check my impact' }));

    expect(screen.getByText('Current area is affected')).toBeInTheDocument();
    expect(screen.getByText(/Do not drive through flood water/i)).toBeInTheDocument();
    expect(screen.getByText(/choose lift-accessible exits/i)).toBeInTheDocument();
    expect(screen.getByText('Family and saved places')).toBeInTheDocument();
    expect(screen.getByText('2 affected')).toBeInTheDocument();
    expect(screen.getByText(/Check Current area, Work first/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Review steps' })[1]);

    expect(screen.getByText('Work is affected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ElderlyAvoid stairs and crowded routes/i }));

    expect(screen.getByText(/Use lifts or sheltered street-level paths/i)).toBeInTheDocument();
    expect(screen.getByText('Medication packed')).toBeInTheDocument();
    expect(screen.getByText('2 / 10 ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Am I affected?' }));

    expect(screen.getByText(/Yes. Work is within the advisory area for Orchard Road/i)).toBeInTheDocument();
    expect(screen.getByText('You asked: Am I affected?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Can I still take the MRT?' }));

    expect(screen.getByText('You asked: Can I still take the MRT?')).toBeInTheDocument();
    expect(screen.getByText(/Use the MRT only if MURUS and station staff say the route is clear/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Ask your own question'), 'Where should I avoid with my family?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText('You asked: Where should I avoid with my family?')).toBeInTheDocument();
    expect(screen.getByText(/Check saved places first/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /I need accessible assistance/i }));

    expect(screen.getByText('Status sent to command: I need accessible assistance')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('murusResidentCheckins'))[0]).toMatchObject({
      alertId: 'resident-alert:1',
      pointLabel: 'Work',
      status: 'accessible',
      priority: 'high',
    });

    await user.type(screen.getByLabelText('What did you hear?'), 'Orchard Road basement links are unsafe');
    await user.click(screen.getByRole('button', { name: 'Check against official alerts' }));

    expect(screen.getByText('Matches an official alert')).toBeInTheDocument();
    expect(screen.getByText(/Matched official alert: Avoid Orchard Road/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('What did you hear?'));
    await user.type(screen.getByLabelText('What did you hear?'), 'Changi Airport is closed');
    await user.click(screen.getByRole('button', { name: 'Check against official alerts' }));

    expect(screen.getByText('Not verified by MURUS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acknowledged' })).toBeDisabled();
    });
  });
});
