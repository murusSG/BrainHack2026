import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrisisMap } from '../../src/components/CrisisMap';

const leaflet = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  setView: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Circle: () => null,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => leaflet,
}));

function event(id, lat, lng, overrides = {}) {
  return {
    id,
    lat,
    lng,
    title: id,
    location: 'Singapore',
    publicAction: 'Review incident.',
    hazardType: 'fire',
    source: 'MURUS',
    severity: 'high',
    ...overrides,
  };
}

beforeEach(() => {
  leaflet.fitBounds.mockReset();
  leaflet.setView.mockReset();
});

describe('CrisisMap auto fitting', () => {
  it('does not change zoom when polling returns the same marker geometry', () => {
    const first = event('INC-001', 1.3, 103.8);
    const { rerender } = render(<CrisisMap events={[first]} />);

    expect(leaflet.setView).toHaveBeenCalledTimes(1);

    rerender(
      <CrisisMap
        events={[
          event('INC-001', 1.3, 103.8, {
            markerColor: '#19d39a',
            publicAction: 'Dispatch approved.',
          }),
        ]}
      />
    );

    expect(leaflet.setView).toHaveBeenCalledTimes(1);
    expect(leaflet.fitBounds).not.toHaveBeenCalled();
  });

  it('fits again when a new marker changes the map geometry', () => {
    const first = event('INC-001', 1.3, 103.8);
    const { rerender } = render(<CrisisMap events={[first]} />);

    rerender(
      <CrisisMap
        events={[first, event('INC-002', 1.36, 103.86)]}
      />
    );

    expect(leaflet.setView).toHaveBeenCalledTimes(1);
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1);
  });

  it('does not change the viewport when a marker is removed', () => {
    const first = event('INC-001', 1.3, 103.8);
    const second = event('INC-002', 1.36, 103.86);
    const { rerender } = render(<CrisisMap events={[first, second]} />);

    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1);

    rerender(<CrisisMap events={[first]} />);

    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1);
    expect(leaflet.setView).not.toHaveBeenCalled();
  });

  it('ignores invalid out-of-region coordinates when fitting the viewport', () => {
    render(<CrisisMap events={[event('INC-001', 0, 0), event('INC-002', 1.36, 103.86)]} />);

    expect(leaflet.setView).toHaveBeenCalledTimes(1);
    expect(leaflet.setView).toHaveBeenCalledWith([1.36, 103.86], 13, { animate: false });
    expect(leaflet.fitBounds).not.toHaveBeenCalled();
  });
});
