const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';
const RETRY_MS = 3000;

/**
 * Connects to the live crisis feed. Invokes the supplied callbacks for the
 * initial snapshot and subsequent upserts, and auto-reconnects on drop.
 * Returns a disconnect function.
 */
export function connectCrisisSocket({ onSnapshot, onUpsert, onStatus }) {
  let socket = null;
  let retryTimer = null;
  let closedByCaller = false;

  const open = () => {
    onStatus?.('connecting');
    socket = new WebSocket(WS_URL);

    socket.onopen = () => onStatus?.('connected');

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'snapshot') onSnapshot?.(message.events ?? []);
        else if (message.type === 'event.upsert') onUpsert?.(message.events ?? []);
      } catch {
        // Ignore malformed frames; the next valid message recovers state.
      }
    };

    socket.onclose = () => {
      onStatus?.('disconnected');
      if (!closedByCaller) retryTimer = setTimeout(open, RETRY_MS);
    };

    socket.onerror = () => socket?.close();
  };

  open();

  return () => {
    closedByCaller = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}
