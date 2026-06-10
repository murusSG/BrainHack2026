import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResidentPage } from '../../src/pages/ResidentPage';
import { api } from '../../src/services/api';

const buildResidentEvacuationGuideContextMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/components/CrisisMap', () => ({
  CrisisMap: ({ events }) => <div data-testid="resident-map">{events.length} events</div>,
}));

vi.mock('../../src/components/ResidentAlertVisualGuide', () => ({
  buildResidentEvacuationGuideContext: buildResidentEvacuationGuideContextMock,
  ResidentAlertVisualGuide: () => <section>Visual next steps</section>,
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
    askMurus: vi.fn(),
    checkResidentRumor: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  delete navigator.geolocation;
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
    api.askMurus
      .mockRejectedValueOnce(new Error('LLM unavailable'))
      .mockResolvedValueOnce({
        answer: 'AI-grounded: use the MRT only if station staff confirm the route is clear.',
        mode: 'llm',
      })
      .mockRejectedValueOnce(new Error('LLM unavailable'))
      .mockRejectedValueOnce(new Error('LLM unavailable'))
      .mockRejectedValueOnce(new Error('LLM unavailable'));
    api.scdfNearest.mockResolvedValue([
      {
        name: 'Somerset shelter',
        address: 'Somerset Road',
        distance_meters: 320,
      },
    ]);
    api.checkResidentRumor
      .mockResolvedValueOnce({
        status: 'verified',
        label: 'Likely true from MURUS',
        message: 'This matches the official Orchard Road alert to avoid basement links.',
        matchedAlert: {
          id: 'resident-alert:1',
          title: 'Avoid Orchard Road',
          locationLabel: 'Orchard Road',
        },
        confidence: 'high',
        mode: 'llm',
      })
      .mockResolvedValueOnce({
        status: 'unverified',
        label: 'Not confirmed by MURUS',
        message: 'No current official alert confirms Changi Airport is closed.',
        matchedAlert: null,
        confidence: 'low',
        mode: 'llm',
      });
    buildResidentEvacuationGuideContextMock.mockResolvedValue({
      heading: 'Route preview to Somerset shelter',
      summary: 'Your current location is inside the alert radius.',
      detail: 'Confirm with MURUS or staff before moving.',
      riskLabel: 'High-risk zone: leave by the clearest staffed route',
      routeLabel: 'Check route',
      routeTone: 'warning',
      destination: {
        label: 'Somerset shelter',
        address: 'Somerset Road / About 1.8km from alert centre',
        type: 'shelter',
        confidenceLabel: 'Shelter candidate found',
        kind: 'shelter',
        distanceMeters: 320,
      },
      route: {
        source: 'ONEMAP',
        distanceMeters: 640,
        durationSeconds: 420,
        pointCount: 4,
      },
      routeConfidence: {
        label: 'Needs staff confirmation',
        tone: 'warning',
        reasons: [
          'Your current location is inside the alert radius.',
          'Closest suitable SCDF shelter candidate from Live location.',
          'Confirm activation with staff or MURUS before entering.',
        ],
      },
      skippedCandidates: [
        {
          label: 'Nearby shelter inside alert',
          reasons: ['inside alert radius'],
        },
      ],
      steps: [
        {
          title: 'Leave the high-risk zone',
          instruction: 'Face away from the alert area and choose street-level exits where possible.',
          tone: 'danger',
        },
      ],
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({
            coords: {
              latitude: 1.3008,
              longitude: 103.8391,
              accuracy: 18,
            },
          })
        ),
      },
    });
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
    expect(screen.getByRole('tab', { name: 'Alerts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Impact' })).toBeInTheDocument();
    expect(screen.getByText('Next safe action')).toBeInTheDocument();
    expect(screen.getByText('Visual next steps')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Preparedness' }));

    expect(screen.getByText('Emergency pack mode')).toBeInTheDocument();
    expect(screen.getByText('0 / 5 ready')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Phone charged/i));
    await user.click(screen.getByLabelText(/Tell family your status/i));

    expect(screen.getByText('2 / 5 ready')).toBeInTheDocument();
    expect(screen.getByText(/I am at Work near Orchard Road/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency pack is 2\/5 ready/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy status' }));

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    await user.click(screen.getByRole('button', { name: 'Simplify alert' }));

    expect(screen.getByRole('button', { name: 'Simple mode on' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Plain language')).toBeInTheDocument();
    expect(screen.getAllByText('Avoid Orchard Road').length).toBeGreaterThan(1);
    expect(screen.getByText('Stay calm and move away from the affected area.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Impact' }));
    expect(screen.getByText('Does this affect me?')).toBeInTheDocument();
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

    await user.click(screen.getByRole('tab', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: /ElderlyAvoid stairs and crowded routes/i }));

    expect(screen.getByRole('button', { name: /ElderlyAvoid stairs and crowded routes/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('tab', { name: 'Preparedness' }));
    expect(screen.getByText('Medication packed')).toBeInTheDocument();
    expect(screen.getByText('2 / 10 ready')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Profile' }));
    fireEvent.change(screen.getByLabelText('Current situation'), {
      target: { value: 'Waiting with mum near Orchard Gateway' },
    });
    fireEvent.change(screen.getByLabelText('Where you plan to go'), {
      target: { value: 'Home at Tampines by MRT' },
    });
    fireEvent.change(screen.getByLabelText('Support notes'), {
      target: { value: 'Mum walks slowly and needs lift access' },
    });
    await user.click(screen.getByRole('button', { name: 'Use my live location' }));

    await waitFor(() => {
      expect(screen.getByText(/Live location active: GPS 1.30080, 103.83910/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Live locationGPS 1.30080, 103.83910/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    expect(screen.getByText(/Use lifts or sheltered street-level paths/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Am I affected?' }));

    await waitFor(() => {
      expect(screen.getByText(/Yes. Live location is within the advisory area for Orchard Road/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/You asked: Am I affected?/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Can I still take the MRT?' }));

    expect(screen.getByText(/You asked: Can I still take the MRT?/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/AI-grounded: use the MRT only if station staff confirm/i)).toBeInTheDocument();
    });
    expect(api.askMurus).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Can I still take the MRT?',
        deterministicAnswer: expect.stringContaining('Use the MRT only if MURUS'),
        alert: expect.objectContaining({ locationLabel: 'Orchard Road' }),
        residentContext: expect.objectContaining({
          profile: 'elderly',
          profileLabel: 'Elderly',
          residentDetails: expect.objectContaining({
            homeAddress: 'Tampines St 21',
            currentLocationNote: expect.stringContaining('Live GPS captured near GPS 1.30080, 103.83910'),
            plannedDestination: 'Home at Tampines by MRT',
            supportNotes: 'Mum walks slowly and needs lift access',
          }),
          pointLabel: 'Live location',
          liveLocation: expect.objectContaining({
            address: expect.stringContaining('GPS 1.30080, 103.83910'),
            accuracyMeters: 18,
            isInsideAlertRadius: true,
          }),
          savedPlaces: expect.arrayContaining([
            expect.objectContaining({ label: 'Home', address: 'Tampines St 21' }),
            expect.objectContaining({ label: 'Live location', isAffected: true }),
            expect.objectContaining({ label: 'Work', isAffected: true }),
          ]),
          emergencyPack: expect.objectContaining({
            readyCount: 2,
            totalCount: 10,
            readyItems: expect.arrayContaining(['Phone charged', 'Tell family your status']),
          }),
          transportMode: 'Driving',
          mobilityNeed: 'Wheelchair / mobility aid',
        }),
      })
    );

    await user.click(screen.getByRole('button', { name: 'Is it safe to go home?' }));

    expect(screen.getByText(/You asked: Is it safe to go home?/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Tampines St 21 is not currently inside this alert radius/i)).toBeInTheDocument();
    });
    expect(api.askMurus).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question: 'Is it safe to go home?',
        deterministicAnswer: expect.stringContaining('MURUS has not confirmed that your route is clear'),
        residentContext: expect.objectContaining({
          pointLabel: 'Live location',
          residentDetails: expect.objectContaining({
            homeAddress: 'Tampines St 21',
          }),
          liveLocation: expect.objectContaining({
            lat: 1.3008,
            lng: 103.8391,
            accuracyMeters: 18,
          }),
        }),
      })
    );

    await user.click(screen.getByRole('button', { name: 'Where should I evacuate to?' }));

    expect(screen.getByText(/You asked: Where should I evacuate to?/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Nearest SCDF shelter lookup: Somerset shelter/i)).toBeInTheDocument();
    });
    expect(buildResidentEvacuationGuideContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        alert: expect.objectContaining({ locationLabel: 'Orchard Road' }),
        point: expect.objectContaining({ label: 'Live location', lat: 1.3008, lng: 103.8391 }),
        homePoint: expect.objectContaining({ label: 'Home', sublabel: 'Tampines St 21' }),
        transportMode: 'driving',
        mobilityNeed: 'mobility',
        profileLabel: 'Elderly',
      })
    );
    expect(api.askMurus).toHaveBeenLastCalledWith(
      expect.objectContaining({
        question: 'Where should I evacuate to?',
        residentContext: expect.objectContaining({
          nearestShelter: expect.objectContaining({
            name: 'Somerset shelter',
            address: 'Somerset Road / About 1.8km from alert centre',
            distanceMeters: 320,
            source: 'Filtered evacuation guide',
          }),
          evacuationGuide: expect.objectContaining({
            heading: 'Route preview to Somerset shelter',
            routeLabel: 'Check route',
            routeConfidence: expect.objectContaining({
              label: 'Needs staff confirmation',
              reasons: expect.arrayContaining([
                'Your current location is inside the alert radius.',
                'Confirm activation with staff or MURUS before entering.',
              ]),
            }),
            skippedCandidates: expect.arrayContaining([
              expect.objectContaining({
                label: 'Nearby shelter inside alert',
                reasons: ['inside alert radius'],
              }),
            ]),
          }),
        }),
      })
    );

    await user.type(screen.getByLabelText('Ask your own question'), 'Where should I avoid with my family?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));

    expect(screen.getByText(/You asked: Where should I avoid with my family?/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Check saved places first/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /I need accessible assistance/i }));

    expect(screen.getByText('Status sent to command: I need accessible assistance')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('murusResidentCheckins'))[0]).toMatchObject({
      alertId: 'resident-alert:1',
      pointLabel: 'Live location',
      status: 'accessible',
      priority: 'high',
    });

    await user.click(screen.getByRole('tab', { name: 'Rumor check' }));
    await user.type(screen.getByLabelText('What did you hear?'), 'Orchard Road basement links are unsafe');
    await user.click(screen.getByRole('button', { name: 'Check with Ask MURUS' }));

    await waitFor(() => {
      expect(screen.getByText('Likely true from MURUS')).toBeInTheDocument();
    });
    expect(screen.getByText(/Matched official alert: Avoid Orchard Road/i)).toBeInTheDocument();
    expect(screen.getByText(/Source: Ask MURUS AI \/ Confidence: high/i)).toBeInTheDocument();
    expect(api.checkResidentRumor).toHaveBeenCalledWith(
      expect.objectContaining({
        claim: 'Orchard Road basement links are unsafe',
        officialAlerts: expect.arrayContaining([
          expect.objectContaining({
            title: 'Avoid Orchard Road',
            locationLabel: 'Orchard Road',
          }),
        ]),
        deterministicResult: expect.objectContaining({
          status: 'verified',
          matchedAlert: expect.objectContaining({ title: 'Avoid Orchard Road' }),
        }),
      })
    );

    await user.clear(screen.getByLabelText('What did you hear?'));
    await user.type(screen.getByLabelText('What did you hear?'), 'Changi Airport is closed');
    await user.click(screen.getByRole('button', { name: 'Check with Ask MURUS' }));

    await waitFor(() => {
      expect(screen.getByText('Not confirmed by MURUS')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acknowledged' })).toBeDisabled();
    });
  });
});
