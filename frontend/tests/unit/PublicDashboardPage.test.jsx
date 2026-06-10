import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicDashboardPage } from '../../src/pages/PublicDashboardPage';
import { api } from '../../src/services/api';

vi.mock('../../src/components/OneMapPreviewMap', () => ({
  OneMapPreviewMap: () => <div data-testid="public-onemap-preview" />,
}));

vi.mock('../../src/services/api', () => ({
  api: {
    reportIncident: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('PublicDashboardPage', () => {
  it('opens the report form and submits a public incident report to command', async () => {
    api.reportIncident.mockResolvedValue({
      status: 'new_incident_created',
      incident_id: 'INC-101',
      message: 'Incident cluster created and routed for dispatcher approval.',
    });

    const user = userEvent.setup();

    render(<PublicDashboardPage />);

    await user.click(screen.getByRole('button', { name: /Report an Issue/i }));

    await user.type(
      screen.getByLabelText('What is happening?'),
      'Heavy smoke is coming from Block 123 and people are gathering downstairs.'
    );
    await user.click(screen.getByRole('button', { name: 'Submit to Command' }));

    await waitFor(() => {
      expect(api.reportIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          report_text:
            'Heavy smoke is coming from Block 123 and people are gathering downstairs.',
          source: 'public',
          reported_at: expect.any(String),
        })
      );
    });

    expect(await screen.findByText('Report sent to command')).toBeInTheDocument();
    expect(screen.getByText('Incident cluster created and routed for dispatcher approval.')).toBeInTheDocument();
    expect(screen.getByText('Incident ID: INC-101')).toBeInTheDocument();
  });

  it('shows validation feedback when the report is blank', async () => {
    const user = userEvent.setup();

    render(<PublicDashboardPage />);

    await user.click(screen.getByRole('button', { name: /Report an Issue/i }));
    await user.click(screen.getByRole('button', { name: 'Submit to Command' }));

    expect(
      screen.getByText('Please describe what you are seeing before submitting.')
    ).toBeInTheDocument();
    expect(api.reportIncident).not.toHaveBeenCalled();
  });
});
