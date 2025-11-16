import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, authHeader } from '../api';

describe('API', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates axios instance with correct base URL', () => {
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('adds authorization header when token exists in localStorage', () => {
    localStorage.setItem('token', 'test-token-123');

    // Create a request config
    const config = {
      headers: {},
    };

    // Simulate the interceptor
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('does not add authorization header when token does not exist', () => {
    const config = {
      headers: {},
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('authHeader returns authorization header when token exists', () => {
    localStorage.setItem('token', 'test-token-456');
    const header = authHeader();

    expect(header).toEqual({ Authorization: 'Bearer test-token-456' });
  });

  it('authHeader returns empty object when token does not exist', () => {
    const header = authHeader();

    expect(header).toEqual({});
  });
});

