import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api auth retry flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes the session once after a 401 and retries the original request', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: 'Invalid or expired token' }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: { username: 'reader' }, access_token: 'fresh-token' }, 200))
      .mockResolvedValueOnce(jsonResponse({ user: { id: '1', username: 'reader', display_name: 'Reader', avatar_url: '', role: 'reader', bio: '', created_at: new Date().toISOString() } }, 200));

    vi.stubGlobal('fetch', fetchMock);

    const result = await api.getMe();

    expect(result.user.username).toBe('reader');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/refresh', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
  });

  it('does not recursively retry the refresh endpoint itself', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: 'No refresh token' }, 401));

    vi.stubGlobal('fetch', fetchMock);

    await expect(api.refresh()).rejects.toThrow('No refresh token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent refresh attempts triggered by parallel 401 responses', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: { username: 'reader' }, access_token: 'fresh-token' }, 200))
      .mockResolvedValueOnce(jsonResponse({ user: { id: '1', username: 'reader', display_name: 'Reader', avatar_url: '', role: 'reader', bio: '', created_at: new Date().toISOString() } }, 200))
      .mockResolvedValueOnce(jsonResponse({ user: { id: '1', username: 'reader', display_name: 'Reader', avatar_url: '', role: 'reader', bio: '', created_at: new Date().toISOString() } }, 200));

    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([api.getMe(), api.getMe()]);

    expect(first.user.username).toBe('reader');
    expect(second.user.username).toBe('reader');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')).toHaveLength(1);
  });
});