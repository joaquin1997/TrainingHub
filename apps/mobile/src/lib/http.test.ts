import { afterEach, describe, expect, it, vi } from 'vitest';

// Avoid loading expo-constants (pulled in by @/config/api) in the node test env.
vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://test.local' }));

import { apiRequest } from './http';

type FakeResponse = {
  status?: number;
  ok?: boolean;
  jsonBody?: unknown;
};

function stubFetch(response: FakeResponse) {
  const fetchMock = vi.fn().mockResolvedValue({
    status: response.status ?? 200,
    ok: response.ok ?? true,
    json: async () => response.jsonBody ?? null,
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('returns the parsed body and prefixes the base url', async () => {
    const fetchMock = stubFetch({ jsonBody: { id: 'x' } });

    const result = await apiRequest<{ id: string }>('/things');

    expect(result).toEqual({ id: 'x' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://test.local/things');
  });

  it('sets a JSON content-type when a body is sent', async () => {
    const fetchMock = stubFetch({ jsonBody: {} });

    await apiRequest('/things', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('returns undefined for 204 responses', async () => {
    stubFetch({ status: 204, ok: true });

    const result = await apiRequest('/things', { method: 'DELETE' });

    expect(result).toBeUndefined();
  });

  it('throws the API error message on non-2xx', async () => {
    stubFetch({ status: 400, ok: false, jsonBody: { message: 'Bad input' } });

    await expect(apiRequest('/things')).rejects.toThrow('Bad input');
  });

  it('throws a generic message when none is provided', async () => {
    stubFetch({ status: 500, ok: false, jsonBody: null });

    await expect(apiRequest('/things')).rejects.toThrow(
      'Request failed with status 500',
    );
  });
});
