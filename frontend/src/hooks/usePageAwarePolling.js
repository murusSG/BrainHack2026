import { useEffect, useRef } from 'react';

export function usePageAwarePolling(callback, intervalMs, { immediate = true } = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let stopped = false;
    let running = false;
    let timerId = null;

    function clearTimer() {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function schedule() {
      clearTimer();
      if (!stopped && !document.hidden) {
        timerId = window.setTimeout(run, intervalMs);
      }
    }

    async function run() {
      if (stopped || document.hidden || running) return;
      running = true;
      try {
        await callbackRef.current();
      } catch {
        // Polling callbacks own their user-facing error state; keep the scheduler alive.
      } finally {
        running = false;
        schedule();
      }
    }

    function refreshWhenVisible() {
      clearTimer();
      if (!document.hidden) void run();
    }

    if (immediate) void run();
    else schedule();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      stopped = true;
      clearTimer();
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [immediate, intervalMs]);
}
