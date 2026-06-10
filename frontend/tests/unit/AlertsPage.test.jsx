import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertsPage } from '../../src/pages/AlertsPage';
import { api } from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  api: {
    incidentClusters: vi.fn(),
    oneMapSearch: vi.fn(),
    publishResidentAlert: vi.fn(),
    updateResidentAlert: vi.fn(),
  },
}));

describe('AlertsPage resident alert composer routing', () => {
  beforeEach(() => {
    api.incidentClusters.mockResolvedValue([]);
    api.oneMapSearch.mockResolvedValue([]);
  });

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
    expect(screen.getByText('2 critical active')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Emergency advisory for Toa Payoh residents')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toa Payoh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Severity' })).toHaveValue('danger');
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.queryByText('Spatial Context & Proximity')).not.toBeInTheDocument();
    expect(screen.queryByText('Responders En Route')).not.toBeInTheDocument();
  });

  it('shows live incident clusters in the feed and auto-fills the resident composer from the selected incident', async () => {
    api.incidentClusters.mockResolvedValue([
      {
        incident_id: 'INC-101',
        status: 'pending_approval',
        created_at: '2026-06-11T10:00:00+08:00',
        updated_at: '2026-06-11T10:05:00+08:00',
        extracted_incident: {
          incident_type: 'building fire',
          location_text: 'Block 123 Tampines Street 11',
          severity: 'high',
          description: 'Heavy smoke reported near the loading bay.',
        },
        reports: [{ report_id: 'RPT-1' }, { report_id: 'RPT-2' }],
        recommendations: {
          mandatory_agencies: [{ agency: 'SCDF', reason: 'Primary response' }],
          suggested_agencies: [{ agency: 'SPF', reason: 'Crowd management' }],
        },
        canonical_event: {
          severity: 'HIGH',
          vicinityRadiusMeters: 800,
          location: {
            addressText: 'Block 123 Tampines Street 11',
          },
        },
      },
    ]);
    api.oneMapSearch.mockResolvedValue([
      {
        latitude: '1.3521',
        longitude: '103.9450',
      },
    ]);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/alerts']}>
        <AlertsPage session={{ token: 'leader-token' }} />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /INC-101/i }));

    expect(screen.getByText('3 critical active')).toBeInTheDocument();
    expect(screen.getAllByText('Building Fire - Block 123 Tampines Street 11').length).toBeGreaterThan(1);
    expect(screen.getByText('Heavy smoke reported near the loading bay.')).toBeInTheDocument();
    expect(screen.getByText('Grouped reports')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Building Fire - Block 123 Tampines Street 11')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Block 123 Tampines Street 11')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.3521')).toBeInTheDocument();
    expect(screen.getByDisplayValue('103.945')).toBeInTheDocument();
    expect(screen.getByDisplayValue('800')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Severity' })).toHaveValue('danger');
    expect(screen.getByLabelText('Public action')).toHaveValue('');
    expect(screen.getByLabelText('Body')).toHaveValue('');
  });
});
