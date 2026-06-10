import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../renderWithProviders';
import { ResidentAlertVisualGuide } from '../../src/components/ResidentAlertVisualGuide';
import { api } from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  api: {
    scdfNearest: vi.fn(),
    oneMapRoute: vi.fn(),
    streetViewPreview: vi.fn(),
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="route-map">{children}</div>,
  TileLayer: () => null,
  Circle: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Polyline: () => null,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

const orchardAlert = {
  title: 'Avoid Orchard Road',
  publicAction: 'Use Somerset MRT exits and avoid basement links.',
  severity: 'danger',
  locationLabel: 'Orchard Road',
  lat: 1.3048,
  lng: 103.8318,
  radiusMeters: 1200,
};

const livePoint = { label: 'Live location', lat: 1.3008, lng: 103.8391 };
const homePoint = { label: 'Home', lat: 1.3536, lng: 103.945, sublabel: 'Tampines St 21' };
const tampinesShelter = {
  name: 'Tampines shelter',
  address: 'Tampines Street 21',
  latitude: 1.3536,
  longitude: 103.945,
  distance_meters: 1200,
};

describe('ResidentAlertVisualGuide', () => {
  it('shows a route guide with filtered shelter confidence when routing is unavailable', async () => {
    api.scdfNearest.mockResolvedValue([tampinesShelter]);
    api.oneMapRoute.mockRejectedValue(new Error('route unavailable'));
    api.streetViewPreview.mockRejectedValue(new Error('Google Street View is not configured.'));

    renderWithProviders(
      <ResidentAlertVisualGuide
        alert={orchardAlert}
        point={livePoint}
        homePoint={homePoint}
        transportMode="mrt"
        mobilityNeed="elderly"
        profileLabel="Elderly"
      />
    );

    expect(screen.getByText('Visual next steps')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Route preview to Tampines shelter/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Evacuation route steps')).toBeInTheDocument();
    expect(screen.getByText('High-risk zone: leave by the clearest staffed route')).toBeInTheDocument();
    expect(screen.getByText('Needs staff confirmation')).toBeInTheDocument();
    expect(screen.getAllByText(/Closest suitable SCDF shelter candidate/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Leave the high-risk zone')).toBeInTheDocument();
    expect(screen.getByText('Prefer accessible movement')).toBeInTheDocument();
    expect(screen.getByText(/generated schematic visuals/i)).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /schematic/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/OneMap routing was unavailable/i)).toBeInTheDocument();
    expect(screen.getByText('Leave the hazard edge')).toBeInTheDocument();
    expect(screen.getByText('Do not trust the preview blindly')).toBeInTheDocument();
    expect(screen.getByText('Choose accessible movement')).toBeInTheDocument();
    expect(screen.getByText('Confirm shelter before entering')).toBeInTheDocument();
  });

  it('opens a full evacuation guide modal with route confidence and street-view fallback messaging', async () => {
    const user = userEvent.setup();
    api.scdfNearest.mockResolvedValue([tampinesShelter]);
    api.oneMapRoute.mockResolvedValue({
      distance_meters: 420,
      duration_seconds: 360,
      geometry: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [103.8391, 1.3008],
          [103.8391, 1.302],
          [103.9, 1.33],
          [103.945, 1.3536],
        ],
      }),
    });
    api.streetViewPreview.mockRejectedValue(new Error('Google Street View is not configured.'));

    renderWithProviders(
      <ResidentAlertVisualGuide
        alert={orchardAlert}
        point={livePoint}
        homePoint={homePoint}
        transportMode="walking"
        mobilityNeed="none"
        profileLabel="General"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Route preview to Tampines shelter/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /open full evacuation guide/i }));

    expect(screen.getByRole('dialog', { name: /Route preview to Tampines shelter/i })).toBeInTheDocument();
    expect(screen.getByText('Full evacuation guide')).toBeInTheDocument();
    expect(screen.getByText('Nearest suitable destination')).toBeInTheDocument();
    expect(screen.getAllByText('Needs staff confirmation').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your current location is inside the alert radius/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Closest suitable SCDF shelter candidate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Street View can be enabled/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Street View not configured; using schematic/i).length).toBeGreaterThan(0);
    expect(api.streetViewPreview).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /close evacuation guide/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows configured street-view images in the full guide when available', async () => {
    const user = userEvent.setup();
    api.scdfNearest.mockResolvedValue([tampinesShelter]);
    api.oneMapRoute.mockResolvedValue({
      distance_meters: 240,
      duration_seconds: 180,
      geometry: '1.3008,103.8391;1.3536,103.945',
    });
    api.streetViewPreview.mockResolvedValue({
      available: true,
      status: 'OK',
      imageUrl: 'http://localhost:3000/api/v1/street-view/image?lat=1.3008&lng=103.8391',
      provider: 'GOOGLE_STREET_VIEW',
      metadata: { date: '2025-01' },
    });

    renderWithProviders(
      <ResidentAlertVisualGuide
        alert={orchardAlert}
        point={livePoint}
        homePoint={homePoint}
        transportMode="walking"
        mobilityNeed="none"
        profileLabel="General"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Route preview to Tampines shelter/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /open full evacuation guide/i }));

    await waitFor(() => {
      expect(screen.getByText('Images available')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('img', { name: /Street-view visual aid/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/visual aid only, not live clearance; captured 2025-01/i).length).toBeGreaterThan(0);
  });

  it('rejects shelter candidates inside the alert buffer and generates a move-away waypoint', async () => {
    api.scdfNearest.mockResolvedValue([
      {
        name: 'Nearby shelter inside alert',
        address: 'Orchard Road',
        latitude: 1.3049,
        longitude: 103.8319,
        distance_meters: 80,
      },
    ]);
    api.oneMapRoute.mockRejectedValue(new Error('route unavailable'));
    api.streetViewPreview.mockRejectedValue(new Error('Google Street View is not configured.'));

    renderWithProviders(
      <ResidentAlertVisualGuide
        alert={orchardAlert}
        point={livePoint}
        homePoint={{ label: 'Home', lat: 1.3049, lng: 103.8319, sublabel: 'Orchard Road' }}
        transportMode="walking"
        mobilityNeed="none"
        profileLabel="General"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Route preview to Move/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Generated waypoint fallback')).toBeInTheDocument();
    expect(screen.getAllByText(/No suitable shelter candidate was found/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not an official shelter/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nearby shelter inside alert, then confirm entry/i)).not.toBeInTheDocument();
  });
});
