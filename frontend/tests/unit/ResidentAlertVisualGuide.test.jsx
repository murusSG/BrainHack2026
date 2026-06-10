import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResidentAlertVisualGuide } from '../../src/components/ResidentAlertVisualGuide';
import { api } from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  api: {
    scdfNearest: vi.fn(),
    oneMapRoute: vi.fn(),
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

describe('ResidentAlertVisualGuide', () => {
  it('shows a route guide with steps and fallback visuals when routing is unavailable', async () => {
    api.scdfNearest.mockResolvedValue([
      {
        name: 'Somerset shelter',
        address: 'Somerset Road',
        latitude: 1.3001,
        longitude: 103.8381,
        distance_meters: 320,
      },
    ]);
    api.oneMapRoute.mockRejectedValue(new Error('route unavailable'));

    render(
      <ResidentAlertVisualGuide
        alert={{
          title: 'Avoid Orchard Road',
          publicAction: 'Use Somerset MRT exits and avoid basement links.',
          locationLabel: 'Orchard Road',
          lat: 1.3048,
          lng: 103.8318,
          radiusMeters: 1200,
        }}
        point={{ label: 'Live location', lat: 1.3008, lng: 103.8391 }}
        homePoint={{ label: 'Home', lat: 1.3536, lng: 103.945, sublabel: 'Tampines St 21' }}
        transportMode="mrt"
        mobilityNeed="elderly"
        profileLabel="Elderly"
      />
    );

    expect(screen.getByText('Visual next steps')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Route preview to Somerset shelter/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/This preview may cross the affected radius/i)).toBeInTheDocument();
    expect(screen.getByText('Leave the hazard edge')).toBeInTheDocument();
    expect(screen.getByText('Do not trust the preview blindly')).toBeInTheDocument();
    expect(screen.getByText('Choose accessible movement')).toBeInTheDocument();
    expect(screen.getByText('Confirm shelter before entering')).toBeInTheDocument();
  });
});
