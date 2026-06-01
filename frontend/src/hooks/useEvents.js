// frontend/src/hooks/useEvents.js
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { unifyAllEvents } from '../services/eventAdapter';
import { demoEvents } from '../services/demoEvents';

export function useEvents({ includeDemo = true } = {}) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .fetchAll()
      .then((raw) => {
        if (cancelled) return;
        const live = unifyAllEvents(raw);
        setEvents(includeDemo ? [...demoEvents, ...live] : live);
        setStatus('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        // Even if backend fails, still show demo events so the UI isn't empty
        setEvents(includeDemo ? demoEvents : []);
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [includeDemo]);

  return { events, status, error };
}