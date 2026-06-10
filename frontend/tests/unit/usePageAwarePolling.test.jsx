import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageAwarePolling } from '../../src/hooks/usePageAwarePolling';

describe('usePageAwarePolling', () => {
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses while hidden, refreshes when visible, and cleans up timers', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePageAwarePolling(callback, 5000));

    await act(async () => {
      await Promise.resolve();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    hidden = true;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(10000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(callback).toHaveBeenCalledTimes(2);

    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
