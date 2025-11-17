import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import usersRouter from '../users.js';

// Mock dependencies
vi.mock('../../models/index.js', () => ({
  User: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req, res, next) => {
    // Mock authenticated user
    req.user = { id: 1, name: 'Test User', email: 'test@example.com' };
    next();
  },
}));

// Mock geocoding
global.fetch = vi.fn();

describe('Users Routes', () => {
  let app;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/users', usersRouter);
    vi.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  describe('GET /users/me', () => {
    it('returns user profile when authenticated', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'customer'
      };

      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/me');
      
      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name', 'Test User');
      expect(User.findByPk).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /users/me', () => {
    it('updates user name', async () => {
      const mockUser = {
        id: 1,
        name: 'Old Name',
        save: vi.fn().mockResolvedValue(true),
      };

      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/me')
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(200);

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('updates user address and geocodes it', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        address: null,
        lat: null,
        lng: null,
        save: vi.fn().mockResolvedValue(true),
      };

      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(mockUser);

      // Mock geocoding API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 40.7128, lng: -74.0060 },
              },
            },
          ],
        }),
      });

      const response = await request(app)
        .put('/users/me')
        .send({ address: '123 Main St, New York, NY' });
      
      expect(response.status).toBe(200);

      expect(mockUser.address).toBe('123 Main St, New York, NY');
      expect(mockUser.lat).toBe(40.7128);
      expect(mockUser.lng).toBe(-74.0060);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('uses explicit lat/lng when provided', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        lat: null,
        lng: null,
        save: vi.fn().mockResolvedValue(true),
      };

      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/me')
        .send({ lat: 40.7128, lng: -74.0060 })
        .expect(200);

      expect(mockUser.lat).toBe(40.7128);
      expect(mockUser.lng).toBe(-74.0060);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('returns 404 when user not found', async () => {
      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/users/me')
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('handles server errors', async () => {
      const { User } = await import('../../models/index.js');
      User.findByPk.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/users/me')
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(500);

      expect(response.body).toHaveProperty('error', 'Server error');
    });
  });

  describe('GET /users/:id', () => {
    it('returns public user information', async () => {
      const mockUser = {
        id: 2,
        name: 'Public User',
        role: 'retailer',
        picture: 'pic.jpg',
        address: '123 Main St',
        lat: 40.7128,
        lng: -74.0060,
      };

      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/2');
      
      expect(response.status).toBe(200);

      expect(response.body).toHaveProperty('id', 2);
      expect(response.body).toHaveProperty('name', 'Public User');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('email');
    });

    it('returns 404 when user not found', async () => {
      const { User } = await import('../../models/index.js');
      User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/users/999');
      
      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });
});

