// frontend/src/hooks/useEvents.js
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { unifyAllEvents } from '../services/eventAdapter';
import { normaliseCrisisEvents } from '../services/crisisEventAdapter';
import { connectCrisisSocket } from '../services/crisisSocket';
import { demoEvents } from '../services/demoEvents';

function withDemo(events, includeDemo) {
  return includeDemo ? [...demoEvents, ...events] : events;
}

function liveEventsOnly(events) {
  return events.filter((event) => !event.isDemo);
}

function mergeById(existing, incoming) {
  const byId = new Map(existing.map((event) => [event.id, event]));
  incoming.forEach((event) => byId.set(event.id, event));
  return Array.from(byId.values());
}

export function useEvents({ includeDemo = true } = {}) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let disconnect = null;

    async function loadRawFeedFallback(err) {
      try {
        const raw = await api.fetchAll();
        if (cancelled) return;
        const live = unifyAllEvents(raw);
        setError(err.message);
        setEvents(withDemo(live, includeDemo));
        setStatus('done');
      } catch {
        if (cancelled) return;
        setError(err.message);
        setEvents(withDemo([], includeDemo));
        setStatus('error');
      }
    }

    async function loadCrisisFeed() {
      try {
        const crisisEvents = await api.crisisEvents();
        if (cancelled) return;
        const live = normaliseCrisisEvents(crisisEvents);
        setEvents(withDemo(live, includeDemo));
        setError(null);
        setStatus('done');

        disconnect = connectCrisisSocket({
          onSnapshot(snapshot) {
            if (cancelled) return;
            setEvents(withDemo(normaliseCrisisEvents(snapshot), includeDemo));
            setStatus('done');
          },
          onUpsert(upserts) {
            if (cancelled) return;
            const incoming = normaliseCrisisEvents(upserts);
            setEvents((current) => withDemo(mergeById(liveEventsOnly(current), incoming), includeDemo));
            setStatus('done');
          },
        });
      } catch (err) {
        if (!cancelled) await loadRawFeedFallback(err);
      }
    }

    loadCrisisFeed();

    return () => {
      cancelled = true;
      disconnect?.();
    };
  }, [includeDemo]);

  return { events, status, error };
}
