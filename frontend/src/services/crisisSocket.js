const CONFIGURED_WS_URL = import.meta.env.VITE_WS_URL?.trim();
const LOCAL_WS_URL = /^ws:\/\/(?:localhost|127\.0\.0\.1)(?::|\/|$)/i;
const WS_URL =
  import.meta.env.PROD && LOCAL_WS_URL.test(CONFIGURED_WS_URL ?? '')
    ? null
    : CONFIGURED_WS_URL || (import.meta.env.DEV ? 'ws://localhost:3000/ws' : null);
const INITIAL_RETRY_MS = 3000;
const MAX_RETRY_MS = 30000;

/**
 * Connects to the live crisis feed. Invokes the supplied callbacks for the
 * initial snapshot and subsequent upserts, and auto-reconnects on drop.
 * Returns a disconnect function.
 */
export function connectCrisisSocket({ onSnapshot, onUpsert, onStatus }) {
  if (!WS_URL) {
    onStatus?.('unavailable');
    return () => {};
  }

  let socket = null;
  let retryTimer = null;
  let retryMs = INITIAL_RETRY_MS;
  let closedByCaller = false;

  const clearRetry = () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };

  const scheduleRetry = () => {
    clearRetry();
    if (closedByCaller || document.hidden) return;
    retryTimer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  };

  const open = () => {
    if (
      closedByCaller ||
      document.hidden ||
      socket?.readyState === WebSocket.CONNECTING ||
      socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    onStatus?.('connecting');
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      retryMs = INITIAL_RETRY_MS;
      onStatus?.('connected');
    };

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
      socket = null;
      onStatus?.('disconnected');
      scheduleRetry();
    };

    socket.onerror = () => socket?.close();
  };

  const reconnectWhenVisible = () => {
    if (document.hidden) {
      clearRetry();
      socket?.close();
      return;
    }
    if (!socket) open();
  };

  document.addEventListener('visibilitychange', reconnectWhenVisible);
  open();

  return () => {
    closedByCaller = true;
    clearRetry();
    document.removeEventListener('visibilitychange', reconnectWhenVisible);
    socket?.close();
  };
}
