import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearApiRequestCacheForTests } from '../../src/services/api';

describe('API request deduplication', () => {
  beforeEach(() => {
    clearApiRequestCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shares an in-flight GET for duplicate callers', async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal('fetch', fetchMock);

    const first = api.crisisEvents();
    const second = api.crisisEvents();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch({
      ok: true,
      json: async () => ({ data: [{ id: 'event-1' }] }),
    });

    await expect(first).resolves.toEqual([{ id: 'event-1' }]);
    await expect(second).resolves.toEqual([{ id: 'event-1' }]);
  });
});
