import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AlertsPage } from '../../src/pages/AlertsPage';

vi.mock('../../src/services/api', () => ({
  api: {
    publishResidentAlert: vi.fn(),
    updateResidentAlert: vi.fn(),
  },
}));

describe('AlertsPage resident alert composer routing', () => {
  it('opens the resident alert composer with a routed draft', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/alerts',
            state: {
              openResidentAlertComposer: true,
              residentAlertDraft: {
                title: 'Emergency advisory for Toa Payoh residents',
                body: 'Avoid low-lying walkways.',
                publicAction: 'Use alternate routes.',
                severity: 'danger',
                locationLabel: 'Toa Payoh',
                lat: '1.3343',
                lng: '103.8563',
                radiusMeters: '1800',
              },
            },
          },
        ]}
      >
        <AlertsPage session={{ token: 'leader-token' }} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Publish resident alert' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Emergency advisory for Toa Payoh residents')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toa Payoh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
  });
});
