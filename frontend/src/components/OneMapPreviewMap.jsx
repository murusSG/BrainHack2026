import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

const DEFAULT_CENTER = { latitude: 1.3521, longitude: 103.8198 };
const SINGAPORE_BOUNDS = {
  south: 1.144,
  west: 103.535,
  north: 1.494,
  east: 104.502,
};

let leafletLoadPromise;

function ensureLeafletAssets() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet can only load in the browser.'));
  }

  if (window.L) return Promise.resolve(window.L);

  if (!leafletLoadPromise) {
    leafletLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-onemap-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://www.onemap.gov.sg/web-assets/libs/leaflet/leaflet.css';
        link.setAttribute('data-onemap-leaflet', 'true');
        document.head.appendChild(link);
      }

      const existingScript = document.querySelector('script[data-onemap-leaflet]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.L), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load OneMap Leaflet.')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.onemap.gov.sg/web-assets/libs/leaflet/onemap-leaflet.js';
      script.async = true;
      script.setAttribute('data-onemap-leaflet', 'true');
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Failed to load OneMap Leaflet.'));
      document.body.appendChild(script);
    });
  }

  return leafletLoadPromise;
}

function toneColor(tone) {
  if (tone === 'critical' || tone === 'hazard' || tone === 'danger') return '#c5162b';
  if (tone === 'warning' || tone === 'high' || tone === 'restricted') return '#d9821d';
  if (tone === 'safe' || tone === 'support' || tone === 'success') return '#0d9464';
  return '#b01729';
}

async function resolvePoint(point) {
  if (typeof point.latitude === 'number' && typeof point.longitude === 'number') return point;
  if (!point.query) return null;

  try {
    const results = await api.oneMapSearch(point.query);
    const match = results?.[0];
    if (match?.latitude && match?.longitude) {
      return {
        ...point,
        latitude: Number(match.latitude),
        longitude: Number(match.longitude),
        address: match.address ?? point.address,
      };
    }
  } catch (_error) {
    // OneMap search is optional for this preview; use fallback coordinates below.
  }

  return typeof point.fallbackLatitude === 'number' && typeof point.fallbackLongitude === 'number'
    ? { ...point, latitude: point.fallbackLatitude, longitude: point.fallbackLongitude }
    : null;
}

export function OneMapPreviewMap({ className = '', points = [], zoom = 12 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const [loadState, setLoadState] = useState('loading');

  const stablePoints = useMemo(() => points.map((point) => ({ ...point })), [points]);

  useEffect(() => {
    let isCancelled = false;

    async function setupMap() {
      try {
        const L = await ensureLeafletAssets();
        if (isCancelled || !mapRef.current || leafletMapRef.current) return;

        const bounds = L.latLngBounds(
          L.latLng(SINGAPORE_BOUNDS.south, SINGAPORE_BOUNDS.west),
          L.latLng(SINGAPORE_BOUNDS.north, SINGAPORE_BOUNDS.east)
        );

        const map = L.map(mapRef.current, {
          center: L.latLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
          zoom,
          zoomControl: true,
          attributionControl: true,
        });

        map.setMaxBounds(bounds);
        L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
          detectRetina: true,
          maxZoom: 19,
          minZoom: 11,
          attribution: 'OneMap Singapore',
        }).addTo(map);

        overlayLayerRef.current = L.layerGroup().addTo(map);
        leafletMapRef.current = map;
        setLoadState('ready');
      } catch (_error) {
        if (!isCancelled) setLoadState('error');
      }
    }

    setupMap();

    return () => {
      isCancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        overlayLayerRef.current = null;
      }
    };
  }, [zoom]);

  useEffect(() => {
    let isCancelled = false;

    async function syncPoints() {
      if (!leafletMapRef.current || !overlayLayerRef.current || !window.L) return;

      const L = window.L;
      const resolved = (await Promise.all(stablePoints.map(resolvePoint))).filter(Boolean);
      if (isCancelled || !overlayLayerRef.current || !leafletMapRef.current) return;

      overlayLayerRef.current.clearLayers();
      if (!resolved.length) {
        leafletMapRef.current.setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], zoom);
        return;
      }

      const latLngs = [];
      resolved.forEach((point) => {
        const latLng = L.latLng(point.latitude, point.longitude);
        latLngs.push(latLng);

        if (point.radiusMeters) {
          L.circle(latLng, {
            radius: point.radiusMeters,
            color: toneColor(point.tone),
            fillColor: toneColor(point.tone),
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(overlayLayerRef.current);
        }

        L.circleMarker(latLng, {
          radius: point.markerSize ?? 8,
          color: '#ffffff',
          weight: 2,
          fillColor: toneColor(point.tone),
          fillOpacity: 0.95,
        })
          .bindPopup(
            `<div class="one-map-popup"><strong>${point.title ?? point.label ?? 'Location'}</strong><p>${
              point.description ?? point.address ?? ''
            }</p></div>`
          )
          .addTo(overlayLayerRef.current);
      });

      leafletMapRef.current.fitBounds(L.latLngBounds(latLngs).pad(0.18));
    }

    syncPoints();

    return () => {
      isCancelled = true;
    };
  }, [stablePoints, zoom]);

  return (
    <div className={`one-map-preview ${className}`}>
      <div ref={mapRef} className="one-map-canvas" />
      {loadState === 'loading' ? <div className="one-map-state">Loading OneMap preview...</div> : null}
      {loadState === 'error' ? <div className="one-map-state">Unable to load OneMap preview right now.</div> : null}
    </div>
  );
}
