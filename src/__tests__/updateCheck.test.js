import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkForUpdate } from '../services/updateCheck.js';

describe('updateCheck.js — checkForUpdate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(tagName) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: tagName, html_url: `https://github.com/Lukentony/broom/releases/tag/${tagName}` }),
    }));
  }

  it('should report a newer version when the remote tag is higher', async () => {
    mockFetch('v0.2.0');
    const result = await checkForUpdate('0.1.9');
    expect(result).toEqual({ version: 'v0.2.0', url: 'https://github.com/Lukentony/broom/releases/tag/v0.2.0' });
  });

  it('should return null when already on the latest version', async () => {
    mockFetch('v0.1.9');
    const result = await checkForUpdate('0.1.9');
    expect(result).toBeNull();
  });

  it('should return null when the local version is newer (shouldn\'t normally happen)', async () => {
    mockFetch('v0.1.0');
    const result = await checkForUpdate('0.1.9');
    expect(result).toBeNull();
  });

  it('should return null and not throw when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await checkForUpdate('0.1.9');
    expect(result).toBeNull();
  });

  it('should return null and not throw on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await checkForUpdate('0.1.9');
    expect(result).toBeNull();
  });

  it('should not check again within the same day (rate-limits the API calls)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v0.2.0', html_url: 'https://x' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await checkForUpdate('0.1.9');
    const second = await checkForUpdate('0.1.9');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBeNull();
  });
});
