import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { useEvents } from '../hooks/useEvents';

// Distance in metres between two lat/lng points (Haversine)
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Demo watch points — in a full build these come from user onboarding
const WATCH_POINTS = [
  { id: 'home', label: 'Home', sublabel: 'Tampines St 21', lat: 1.3536, lng: 103.9450 },
  { id: 'parents', label: "Mum's place", sublabel: 'Woodlands', lat: 1.4382, lng: 103.7890 },
  { id: 'work', label: 'Work', sublabel: 'Orchard Road', lat: 1.3048, lng: 103.8318 },
];

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export function ResidentPage() {
  const { events, status } = useEvents();
  const [activePoint, setActivePoint] = useState(WATCH_POINTS[0].id);

  // For each watch point, find events whose vicinity radius covers it
  const statusByPoint = useMemo(() => {
    return WATCH_POINTS.map((point) => {
      const affecting = events.filter((e) => {
        if (e.lat == null || e.lng == null) return false;
        const d = distanceMeters(point, e);
        return d <= (e.vicinityRadiusMeters ?? 500);
      });
      affecting.sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0));
      return { point, affecting };
    });
  }, [events]);

  const active = statusByPoint.find((s) => s.point.id === activePoint);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', padding: 16, color: '#f5f7fb' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 1, opacity: 0.6, textTransform: 'uppercase' }}>
            MURUS SG
          </p>
          <h1 style={{ margin: 0, fontSize: 22 }}>Your safety brief</h1>
        </div>
        <Link to="/" style={{ fontSize: 13, color: '#55a7ff' }}>Command view ↗</Link>
      </header>

      {/* Watch point selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {WATCH_POINTS.map((p) => {
          const s = statusByPoint.find((x) => x.point.id === p.id);
          const worst = s?.affecting[0]?.severity;
          const dot = worst ? (SEVERITY_RANK[worst] >= 3 ? '#ff7676' : '#ffb554') : '#19d39a';
          return (
            <button
              key={p.id}
              onClick={() => setActivePoint(p.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 12,
                border: activePoint === p.id ? '1px solid #55a7ff' : '1px solid rgba(255,255,255,0.12)',
                background: activePoint === p.id ? 'rgba(85,167,255,0.12)' : '#231d1a',
                color: '#f5f7fb',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: dot, marginRight: 6 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</span>
              <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.6 }}>{p.sublabel}</p>
            </button>
          );
        })}
      </div>

      {/* The Crisis Card */}
      {active && (
        <div
          style={{
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            background: active.affecting.length === 0
              ? 'rgba(25,211,154,0.10)'
              : SEVERITY_RANK[active.affecting[0].severity] >= 3
              ? 'rgba(255,118,118,0.10)'
              : 'rgba(255,181,84,0.10)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {active.affecting.length === 0 ? (
            <>
              <p style={{ fontSize: 40, margin: 0 }}>✅</p>
              <h2 style={{ margin: '8px 0 4px' }}>All clear at {active.point.label}</h2>
              <p style={{ margin: 0, opacity: 0.8 }}>No active hazards in your area right now.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7, margin: 0 }}>
                {active.affecting.length} alert{active.affecting.length > 1 ? 's' : ''} near {active.point.label}
              </p>
              {active.affecting.map((e) => (
                <div key={e.id} style={{ marginTop: 14 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{e.title}</h2>
                  <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 15 }}>
                    👉 {e.publicAction}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btnPrimary}>View on map</button>
                    <button style={btnGhost}>Nearest shelter</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Map showing the active point's surroundings */}
      <div style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <CrisisMap events={events} />
      </div>

      {status === 'loading' && <p style={{ opacity: 0.6 }}>Syncing live data…</p>}
    </div>
  );
}

const btnPrimary = {
  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
  background: '#55a7ff', color: '#0b0d11', fontWeight: 600,
};
const btnGhost = {
  flex: 1, padding: '10px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: '#f5f7fb',
};