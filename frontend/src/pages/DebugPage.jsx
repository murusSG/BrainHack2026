import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { unifyAllEvents } from '../services/eventAdapter';

export function DebugPage() {
  const [events, setEvents] = useState([]);
  const [raw, setRaw] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .fetchAll()
      .then((rawData) => {
        setRaw(rawData);
        setEvents(unifyAllEvents(rawData));
        setStatus('done');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  return (
    <div style={{ padding: 24, color: '#f5f7fb' }}>
      <h1>Live Data Debug</h1>
      <p>Status: <strong>{status}</strong></p>
      {error && <p style={{ color: '#ff7676' }}>Error: {error}</p>}

      {raw && (
        <div style={{ marginBottom: 24 }}>
          <h2>Feed counts (raw from backend)</h2>
          <ul>
            <li>PSI readings: {raw.psi?.length ?? 0}</li>
            <li>PM2.5 readings: {raw.pm25?.length ?? 0}</li>
            <li>Flood alerts: {raw.floods?.length ?? 0}</li>
            <li>Dengue clusters: {raw.dengue?.length ?? 0}</li>
            <li>Traffic incidents: {raw.traffic?.length ?? 0}</li>
          </ul>
        </div>
      )}

      <h2>Unified events ({events.length})</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: 12,
              background: '#231d1a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{e.title}</strong>
              <span style={{ textTransform: 'uppercase', fontSize: 12, opacity: 0.7 }}>
                {e.source} · {e.severity}
              </span>
            </div>
            <p style={{ margin: '4px 0', opacity: 0.8 }}>{e.location}</p>
            <p style={{ margin: '4px 0', fontSize: 13 }}>{e.publicAction}</p>
            <code style={{ fontSize: 12, opacity: 0.6 }}>
              {e.lat?.toFixed(4)}, {e.lng?.toFixed(4)} · radius {e.vicinityRadiusMeters}m
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}