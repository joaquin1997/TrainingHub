import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./repository.js', () => ({
  listMeasurements: vi.fn(),
  createMeasurement: vi.fn(),
  updateMeasurement: vi.fn(),
  deleteMeasurement: vi.fn(),
}));
vi.mock('../../infrastructure/userContext.js', () => ({
  resolveUserPublicId: vi.fn(async () => 'user-test'),
}));

import { createApp } from '../../app.js';
import {
  createMeasurement,
  deleteMeasurement,
  listMeasurements,
  updateMeasurement,
} from './repository.js';
import { parseMeasurementInput } from './validation.js';

const app = createApp({ logger: false });

const entry = {
  id: 'm1',
  measuredAt: '2026-10-16T07:30:00.000Z',
  createdAt: '2026-10-16T07:30:00.000Z',
  updatedAt: '2026-10-16T07:30:00.000Z',
  weightKg: 82.4,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await app.close();
});

describe('parseMeasurementInput', () => {
  it('keeps a partial entry and nulls the measurements not taken (AC-3)', () => {
    const result = parseMeasurementInput({
      measuredAt: '2026-10-16T07:30:00.000Z',
      waistCm: 88,
      bodyFatPercent: 18,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.measuredAt.toISOString()).toBe('2026-10-16T07:30:00.000Z');
      expect(result.value.waistCm).toBe(88);
      expect(result.value.bodyFatPercent).toBe(18);
      expect(result.value.weightKg).toBeNull();
    }
  });

  it.each([
    ['weightKg', 0],
    ['bodyFatPercent', 80],
    ['waistCm', 300],
  ])('rejects %s = %s with its range (EF-2)', (field, value) => {
    const result = parseMeasurementInput({ measuredAt: '2026-10-16', [field]: value });

    expect(result).toMatchObject({ ok: false, error: { field } });
  });

  it('rejects an empty entry, a bad date, a non-number and unknown fields', () => {
    expect(parseMeasurementInput({ measuredAt: '2026-10-16' }).ok).toBe(false);
    expect(parseMeasurementInput({ measuredAt: 'yesterday', weightKg: 80 }).ok).toBe(false);
    expect(parseMeasurementInput({ measuredAt: '2026-10-16', weightKg: '80' }).ok).toBe(false);
    expect(parseMeasurementInput({ measuredAt: '2026-10-16', weightLb: 180 }).ok).toBe(false);
  });
});

describe('measurement routes', () => {
  it('GET /measurements lists the caller entries', async () => {
    vi.mocked(listMeasurements).mockResolvedValue([entry]);

    const response = await app.inject({ method: 'GET', url: '/measurements' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([entry]);
    expect(listMeasurements).toHaveBeenCalledWith('user-test');
  });

  it('POST /measurements creates an entry (201)', async () => {
    vi.mocked(createMeasurement).mockResolvedValue(entry);

    const response = await app.inject({
      method: 'POST',
      url: '/measurements',
      payload: { measuredAt: entry.measuredAt, weightKg: 82.4 },
    });

    expect(response.statusCode).toBe(201);
    expect(createMeasurement).toHaveBeenCalledWith(
      'user-test',
      expect.objectContaining({ weightKg: 82.4, waistCm: null }),
    );
  });

  it('POST /measurements answers 400 with the range when out of range', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/measurements',
      payload: { measuredAt: entry.measuredAt, waistCm: 300 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ field: 'waistCm', min: 40, max: 200 });
    expect(createMeasurement).not.toHaveBeenCalled();
  });

  it('PUT /measurements/:id answers 404 for an entry that is not the caller', async () => {
    vi.mocked(updateMeasurement).mockResolvedValue(null);

    const response = await app.inject({
      method: 'PUT',
      url: '/measurements/other',
      payload: { measuredAt: entry.measuredAt, weightKg: 80 },
    });

    expect(response.statusCode).toBe(404);
    expect(updateMeasurement).toHaveBeenCalledWith('user-test', 'other', expect.anything());
  });

  it('DELETE /measurements/:id answers 204, or 404 when not the caller', async () => {
    vi.mocked(deleteMeasurement).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const deleted = await app.inject({ method: 'DELETE', url: '/measurements/m1' });
    const missing = await app.inject({ method: 'DELETE', url: '/measurements/other' });

    expect(deleted.statusCode).toBe(204);
    expect(missing.statusCode).toBe(404);
  });
});
