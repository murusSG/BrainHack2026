import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { connectCrisisSocket } from '../services/crisisSocket';

/**
 * Loads the crisis event feed: an initial REST snapshot for fast first paint,
 * then live merges (by id) from the WebSocket. Returns events + connection state.
 */
export function useCrisisEvents() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    apiGet('/crisis/events')
      .then((response) => {
        if (active) setEvents(response.data ?? []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    const disconnect = connectCrisisSocket({
      onStatus: (next) => active && setStatus(next),
      onSnapshot: (incoming) => active && setEvents(incoming),
      onUpsert: (incoming) =>
        active &&
        setEvents((prev) => {
          const byId = new Map(prev.map((event) => [event.id, event]));
          for (const event of incoming) byId.set(event.id, event);
          return Array.from(byId.values());
        }),
    });

    return () => {
      active = false;
      disconnect();
    };
  }, []);

  return { events, status, error };
}
