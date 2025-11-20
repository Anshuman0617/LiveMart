import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDrivingDistances } from '../distance.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('getDrivingDistances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure API key is set before each test
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Don't delete, just reset to test value
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('returns null distances when API key is missing', async () => {
    // Temporarily remove the API key for this test
    const originalKey = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;

    const products = [
      { id: 1, lat: 40.7128, lng: -74.0060 },
      { id: 2, lat: 34.0522, lng: -118.2437 },
    ];

    const result = await getDrivingDistances(40.7128, -74.0060, products);

    expect(result).toEqual([
      { id: 1, distanceMeters: null },
      { id: 2, distanceMeters: null },
    ]);
    
    // Restore the key
    if (originalKey) {
      process.env.GOOGLE_MAPS_API_KEY = originalKey;
    }
  });

  it('returns distances for valid products', async () => {
    const mockResponse = {
      rows: [
        {
          elements: [
            { status: 'OK', distance: { value: 1000 } },
            { status: 'OK', distance: { value: 2000 } },
          ],
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const products = [
      { id: 1, lat: 40.7128, lng: -74.0060 },
      { id: 2, lat: 34.0522, lng: -118.2437 },
    ];

    const result = await getDrivingDistances(40.7128, -74.0060, products);

    expect(result).toEqual([
      { id: 1, distanceMeters: 1000 },
      { id: 2, distanceMeters: 2000 },
    ]);
  });

  it('handles API errors gracefully', async () => {
    // Suppress console.error for this test since we're testing error handling
    const originalError = console.error;
    console.error = vi.fn();
    
    try {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error',
      });

      const products = [
        { id: 1, lat: 40.7128, lng: -74.0060 },
      ];

      const result = await getDrivingDistances(40.7128, -74.0060, products);

      expect(result[0].distanceMeters).toBeNull();
    } finally {
      // Restore console.error
      console.error = originalError;
    }
  });

  it('handles invalid response structure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rows: [] }),
    });

    const products = [
      { id: 1, lat: 40.7128, lng: -74.0060 },
    ];

    const result = await getDrivingDistances(40.7128, -74.0060, products);

    expect(result[0].distanceMeters).toBeNull();
  });

  it('batches requests when products exceed batch size', async () => {
    const mockResponse1 = {
      rows: [
        {
          elements: Array(20).fill({ status: 'OK', distance: { value: 1000 } }),
        },
      ],
    };

    const mockResponse2 = {
      rows: [
        {
          elements: [{ status: 'OK', distance: { value: 2000 } }],
        },
      ],
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse2,
      });

    const products = Array(21).fill(null).map((_, i) => ({
      id: i + 1,
      lat: 40.7128 + i * 0.01,
      lng: -74.0060 + i * 0.01,
    }));

    const result = await getDrivingDistances(40.7128, -74.0060, products);

    expect(result).toHaveLength(21);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

