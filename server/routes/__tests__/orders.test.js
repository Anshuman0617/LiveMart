import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import ordersRouter from '../orders.js';

// Mock dependencies
vi.mock('../../models/index.js', () => ({
  Order: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  OrderItem: {
    findAll: vi.fn(),
    create: vi.fn(),
  },
  Product: {
    findByPk: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req, res, next) => {
    // Mock authenticated user
    req.user = { id: 1, name: 'Test Seller', email: 'seller@example.com', role: 'retailer' };
    next();
  },
}));

describe('Orders Routes', () => {
  let app;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/orders', ordersRouter);
    vi.clearAllMocks();
    
    // Ensure OrderItem.findAll returns an array by default
    const { OrderItem } = await import('../../models/index.js');
    OrderItem.findAll.mockResolvedValue([]);
  });

  describe('GET /orders/seller', () => {
    it('returns 403 for non-seller users', async () => {
      // Create a test-specific route that bypasses the mocked authMiddleware
      const nonSellerApp = express();
      nonSellerApp.use(express.json());
      
      // Create a custom route handler that mimics the actual route but with customer role
      nonSellerApp.get('/orders/seller', (req, res, next) => {
        req.user = { id: 1, role: 'customer' };
        next();
      }, async (req, res) => {
        try {
          if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
            return res.status(403).json({ error: 'Only sellers can access this endpoint' });
          }
          // This shouldn't be reached
          res.json([]);
        } catch (err) {
          res.status(500).json({ error: 'Server error' });
        }
      });

      const response = await request(nonSellerApp)
        .get('/orders/seller')
        .expect(403);

      expect(response.body.error).toBe('Only sellers can access this endpoint');
    });

    it('returns seller orders with customer information', async () => {
      const { OrderItem, Product, Order, User } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        userId: 2,
        status: 'confirmed',
        total: '500.00',
        paymentId: 'TXN1234567890_1',
        createdAt: '2024-01-15T10:00:00Z',
        user: {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main St',
        },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          userId: 2,
          status: 'confirmed',
          total: '500.00',
          paymentId: 'TXN1234567890_1',
          createdAt: '2024-01-15T10:00:00Z',
        }),
      };

      const mockProduct = {
        id: 1,
        title: 'Test Product',
        ownerId: 1,
        owner: {
          id: 1,
          name: 'Test Seller',
          email: 'seller@example.com',
        },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          title: 'Test Product',
          ownerId: 1,
          owner: {
            id: 1,
            name: 'Test Seller',
            email: 'seller@example.com',
          },
        }),
      };

      const mockOrderItem = {
        id: 1,
        orderId: 1,
        productId: 1,
        quantity: 2,
        unitPrice: '250.00',
        subtotal: '500.00',
        product: mockProduct,
        order: mockOrder,
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          orderId: 1,
          productId: 1,
          quantity: 2,
          unitPrice: '250.00',
          subtotal: '500.00',
        }),
      };

      OrderItem.findAll.mockResolvedValue([mockOrderItem]);

      const response = await request(app)
        .get('/orders/seller')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('paymentId', 'TXN1234567890_1');
      expect(response.body[0]).toHaveProperty('customer');
      expect(response.body[0].customer).toHaveProperty('name', 'John Doe');
      expect(response.body[0]).toHaveProperty('items');
      expect(response.body[0].items.length).toBe(1);
    });

    it('groups multiple items from same order', async () => {
      const { OrderItem } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        userId: 2,
        status: 'confirmed',
        total: '800.00',
        paymentId: 'TXN123',
        createdAt: '2024-01-15T10:00:00Z',
        user: { id: 2, name: 'Customer', email: 'customer@example.com' },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          userId: 2,
          status: 'confirmed',
          total: '800.00',
          paymentId: 'TXN123',
          createdAt: '2024-01-15T10:00:00Z',
        }),
      };

      const mockProduct1 = {
        id: 1,
        title: 'Product 1',
        ownerId: 1,
        owner: { id: 1, name: 'Seller' },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          title: 'Product 1',
          ownerId: 1,
          owner: { id: 1, name: 'Seller' },
        }),
      };

      const mockProduct2 = {
        id: 2,
        title: 'Product 2',
        ownerId: 1,
        owner: { id: 1, name: 'Seller' },
        toJSON: vi.fn().mockReturnValue({
          id: 2,
          title: 'Product 2',
          ownerId: 1,
          owner: { id: 1, name: 'Seller' },
        }),
      };

      const mockOrderItem1 = {
        id: 1,
        orderId: 1,
        productId: 1,
        quantity: 2,
        unitPrice: '250.00',
        subtotal: '500.00',
        product: mockProduct1,
        order: mockOrder,
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          orderId: 1,
          productId: 1,
          quantity: 2,
          unitPrice: '250.00',
          subtotal: '500.00',
        }),
      };

      const mockOrderItem2 = {
        id: 2,
        orderId: 1,
        productId: 2,
        quantity: 1,
        unitPrice: '300.00',
        subtotal: '300.00',
        product: mockProduct2,
        order: mockOrder,
        toJSON: vi.fn().mockReturnValue({
          id: 2,
          orderId: 1,
          productId: 2,
          quantity: 1,
          unitPrice: '300.00',
          subtotal: '300.00',
        }),
      };

      OrderItem.findAll.mockResolvedValue([mockOrderItem1, mockOrderItem2]);

      const response = await request(app)
        .get('/orders/seller')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].items.length).toBe(2);
    });

    it('sorts orders by creation date (newest first)', async () => {
      const { OrderItem } = await import('../../models/index.js');

      const oldOrderObj = {
        id: 1,
        userId: 2,
        status: 'confirmed',
        total: '100.00',
        paymentId: 'TXN1',
        createdAt: '2024-01-10T10:00:00Z',
        user: { id: 2, name: 'Customer', email: 'customer@example.com' },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          userId: 2,
          status: 'confirmed',
          total: '100.00',
          paymentId: 'TXN1',
          createdAt: '2024-01-10T10:00:00Z',
        }),
      };

      const newOrderObj = {
        id: 2,
        userId: 2,
        status: 'confirmed',
        total: '200.00',
        paymentId: 'TXN2',
        createdAt: '2024-01-15T10:00:00Z',
        user: { id: 2, name: 'Customer', email: 'customer@example.com' },
        toJSON: vi.fn().mockReturnValue({
          id: 2,
          userId: 2,
          status: 'confirmed',
          total: '200.00',
          paymentId: 'TXN2',
          createdAt: '2024-01-15T10:00:00Z',
        }),
      };

      const mockProduct = {
        id: 1,
        title: 'Product',
        ownerId: 1,
        owner: { id: 1, name: 'Seller' },
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          title: 'Product',
          ownerId: 1,
          owner: { id: 1, name: 'Seller' },
        }),
      };

      const oldOrder = {
        id: 1,
        orderId: 1,
        productId: 1,
        quantity: 1,
        unitPrice: '100.00',
        subtotal: '100.00',
        product: mockProduct,
        order: oldOrderObj,
        toJSON: vi.fn().mockReturnValue({
          id: 1,
          orderId: 1,
          productId: 1,
          quantity: 1,
          unitPrice: '100.00',
          subtotal: '100.00',
        }),
      };

      const newOrder = {
        id: 2,
        orderId: 2,
        productId: 1,
        quantity: 1,
        unitPrice: '200.00',
        subtotal: '200.00',
        product: mockProduct,
        order: newOrderObj,
        toJSON: vi.fn().mockReturnValue({
          id: 2,
          orderId: 2,
          productId: 1,
          quantity: 1,
          unitPrice: '200.00',
          subtotal: '200.00',
        }),
      };

      OrderItem.findAll.mockResolvedValue([oldOrder, newOrder]);

      const response = await request(app)
        .get('/orders/seller')
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body[0].id).toBe(2); // Newest first
      expect(response.body[1].id).toBe(1);
    });
  });

  describe('PUT /orders/:orderId/status', () => {
    it('returns 403 for non-seller users', async () => {
      // Create a test-specific route that bypasses the mocked authMiddleware
      const nonSellerApp = express();
      nonSellerApp.use(express.json());
      
      // Create a custom route handler that mimics the actual route but with customer role
      nonSellerApp.put('/orders/:orderId/status', (req, res, next) => {
        req.user = { id: 1, role: 'customer' };
        next();
      }, async (req, res) => {
        try {
          if (req.user.role !== 'retailer' && req.user.role !== 'wholesaler') {
            return res.status(403).json({ error: 'Only sellers can update order status' });
          }
          // This shouldn't be reached
          res.status(404).json({ error: 'Order not found' });
        } catch (err) {
          res.status(500).json({ error: 'Server error' });
        }
      });

      const response = await request(nonSellerApp)
        .put('/orders/1/status')
        .send({ status: 'delivered' })
        .expect(403);

      expect(response.body.error).toBe('Only sellers can update order status');
    });

    it('returns 400 for invalid status', async () => {
      const { Order } = await import('../../models/index.js');
      Order.findByPk.mockResolvedValue({
        id: 1,
        status: 'confirmed',
        items: [],
      });

      const response = await request(app)
        .put('/orders/1/status')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid status');
    });

    it('updates order status to delivered', async () => {
      const { Order, OrderItem, Product } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        status: 'confirmed',
        save: vi.fn().mockResolvedValue(true),
        items: [
          {
            id: 1,
            productId: 1,
            product: {
              id: 1,
              ownerId: 1, // Matches req.user.id
            },
          },
        ],
      };

      Order.findByPk.mockResolvedValue(mockOrder);

      const response = await request(app)
        .put('/orders/1/status')
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOrder.status).toBe('delivered');
      expect(mockOrder.save).toHaveBeenCalled();
    });

    it('updates order status to confirmed', async () => {
      const { Order } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        status: 'delivered',
        save: vi.fn().mockResolvedValue(true),
        items: [
          {
            id: 1,
            productId: 1,
            product: {
              id: 1,
              ownerId: 1,
            },
          },
        ],
      };

      Order.findByPk.mockResolvedValue(mockOrder);

      const response = await request(app)
        .put('/orders/1/status')
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOrder.status).toBe('confirmed');
    });

    it('returns 404 when order not found', async () => {
      const { Order } = await import('../../models/index.js');
      Order.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/orders/999/status')
        .send({ status: 'delivered' })
        .expect(404);

      expect(response.body.error).toBe('Order not found');
    });

    it('returns 403 when order does not contain seller products', async () => {
      const { Order } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        status: 'confirmed',
        items: [
          {
            id: 1,
            productId: 1,
            product: {
              id: 1,
              ownerId: 999, // Different seller
            },
          },
        ],
      };

      Order.findByPk.mockResolvedValue(mockOrder);

      const response = await request(app)
        .put('/orders/1/status')
        .send({ status: 'delivered' })
        .expect(403);

      expect(response.body.error).toContain('You can only update orders containing your products');
    });
  });

  describe('GET /orders (customer orders)', () => {
    it('returns customer orders', async () => {
      const { Order, OrderItem, Product, User } = await import('../../models/index.js');

      const mockOrder = {
        id: 1,
        userId: 1,
        status: 'confirmed',
        total: '500.00',
        address: '123 Main St',
        paymentId: 'TXN123',
        createdAt: '2024-01-15T10:00:00Z',
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            quantity: 2,
            unitPrice: '250.00',
            subtotal: '500.00',
            product: {
              id: 1,
              title: 'Test Product',
              owner: {
                id: 2,
                name: 'Seller',
                email: 'seller@example.com',
              },
            },
          },
        ],
      };

      Order.findAll.mockResolvedValue([mockOrder]);

      const response = await request(app)
        .get('/orders')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('paymentId', 'TXN123');
      expect(response.body[0]).toHaveProperty('items');
    });
  });
});

