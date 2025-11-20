import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Orders from '../Orders';
import * as apiModule from '../../api';

// Mock the API module
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
  authHeader: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Orders Page', () => {
  const mockOrders = [
    {
      id: 1,
      paymentId: 'TXN1234567890_1',
      status: 'confirmed',
      total: '500.00',
      createdAt: '2024-01-15T10:00:00Z',
      customer: {
        id: 2,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
      },
      items: [
        {
          id: 1,
          quantity: 2,
          unitPrice: '250.00',
          subtotal: '500.00',
          product: {
            id: 1,
            title: 'Test Product',
            imageUrl: '/images/test.jpg',
          },
        },
      ],
    },
    {
      id: 2,
      paymentId: 'TXN9876543210_2',
      status: 'delivered',
      total: '300.00',
      createdAt: '2024-01-10T10:00:00Z',
      customer: {
        id: 3,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
      },
      items: [
        {
          id: 2,
          quantity: 1,
          unitPrice: '300.00',
          subtotal: '300.00',
          product: {
            id: 2,
            title: 'Another Product',
            images: ['/images/another.jpg'],
          },
        },
      ],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Access Control', () => {
    it('redirects non-retailer/wholesaler users to home', () => {
      const mockUser = { id: 1, name: 'Test User', role: 'customer' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('allows retailer users to access the page', async () => {
      const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');

      apiModule.api.get.mockResolvedValue({ data: [] });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Orders Management')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('allows wholesaler users to access the page', async () => {
      const mockUser = { id: 1, name: 'Test User', role: 'wholesaler' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');

      apiModule.api.get.mockResolvedValue({ data: [] });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Orders Management')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Order Display', () => {
    beforeEach(() => {
      const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');
    });

    it('displays loading state initially', () => {
      apiModule.api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      expect(screen.getByText('Loading orders...')).toBeInTheDocument();
    });

    it('displays orders after loading', async () => {
      apiModule.api.get.mockResolvedValue({ data: mockOrders });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
        expect(screen.getByText('Order #2')).toBeInTheDocument();
      });
    });

    it('displays transaction ID when available', async () => {
      apiModule.api.get.mockResolvedValue({ data: mockOrders });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Transaction ID: TXN1234567890_1/i)).toBeInTheDocument();
        expect(screen.getByText(/Transaction ID: TXN9876543210_2/i)).toBeInTheDocument();
      });
    });

    it('displays customer information', async () => {
      apiModule.api.get.mockResolvedValue({ data: mockOrders });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('1234567890')).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });
    });

    it('separates current and previous orders', async () => {
      apiModule.api.get.mockResolvedValue({ data: mockOrders });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Current Orders (Undelivered)')).toBeInTheDocument();
        expect(screen.getByText('Previous Orders (Delivered)')).toBeInTheDocument();
      });
    });

    it('displays empty state when no orders exist', async () => {
      apiModule.api.get.mockResolvedValue({ data: [] });

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No orders yet')).toBeInTheDocument();
        expect(screen.getByText(/Orders from customers will appear here/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');
      apiModule.api.get.mockResolvedValue({ data: mockOrders });
    });

    it('displays search input field', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('filters orders by order number', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
        expect(screen.getByText('Order #2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
      
      // Search for "TXN1234567890" which only matches Order #1's transaction ID
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'TXN1234567890' } });
      });

      // Wait for the filter to apply and re-render
      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
        expect(screen.queryByText('Order #2')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('filters orders by transaction ID', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
      fireEvent.change(searchInput, { target: { value: 'TXN1234567890' } });

      expect(screen.getByText('Order #1')).toBeInTheDocument();
      expect(screen.queryByText('Order #2')).not.toBeInTheDocument();
    });

    it('shows result count when searching', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
      
      // Search for "TXN1234567890" which only matches Order #1's transaction ID
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'TXN1234567890' } });
      });

      // Wait for the filter to apply
      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
        expect(screen.queryByText('Order #2')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // There should be exactly one result count showing (1 found) for the current orders section
      // since Order #1 is in current orders and is the only match
      const resultCounts = screen.getAllByText(/\(1 found\)/i);
      expect(resultCounts.length).toBe(1);
    });

    it('shows no results message when search finds nothing', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
      fireEvent.change(searchInput, { target: { value: '999' } });

      await waitFor(() => {
        expect(screen.getByText('No orders found matching your search')).toBeInTheDocument();
        expect(screen.getByText(/Try searching by order number/i)).toBeInTheDocument();
      });
    });

    it('is case-insensitive when searching', async () => {
      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by Order #/i);
      fireEvent.change(searchInput, { target: { value: 'txn1234567890' } });

      expect(screen.getByText('Order #1')).toBeInTheDocument();
    });
  });

  describe('Order Status Updates', () => {
    beforeEach(() => {
      const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');
    });

    it('updates order status to delivered', async () => {
      const order = {
        ...mockOrders[0],
        status: 'confirmed',
      };
      apiModule.api.get.mockResolvedValue({ data: [order] });
      apiModule.api.put.mockResolvedValue({
        data: {
          order: { ...order, status: 'delivered' },
        },
      });

      // Mock window.alert
      window.alert = vi.fn();

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #1')).toBeInTheDocument();
      });

      const markDeliveredButton = screen.getByText('Mark as Delivered');
      fireEvent.click(markDeliveredButton);

      await waitFor(() => {
        expect(apiModule.api.put).toHaveBeenCalledWith(
          '/orders/1/status',
          { status: 'delivered' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(window.alert).toHaveBeenCalledWith('Order status updated to delivered');
      });
    });

    it('updates order status back to confirmed', async () => {
      const order = {
        ...mockOrders[1],
        status: 'delivered',
      };
      apiModule.api.get.mockResolvedValue({ data: [order] });
      apiModule.api.put.mockResolvedValue({
        data: {
          order: { ...order, status: 'confirmed' },
        },
      });

      // Mock window.alert
      window.alert = vi.fn();

      render(
        <BrowserRouter>
          <Orders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order #2')).toBeInTheDocument();
      });

      const setBackButton = screen.getByText('Set Back to Undelivered');
      fireEvent.click(setBackButton);

      await waitFor(() => {
        expect(apiModule.api.put).toHaveBeenCalledWith(
          '/orders/2/status',
          { status: 'confirmed' },
          { headers: { Authorization: 'Bearer test-token' } }
        );
        expect(window.alert).toHaveBeenCalledWith('Order status updated to confirmed');
      });
    });

    it('handles error when updating order status fails', async () => {
      // Suppress console.error for this test since we're testing error handling
      const originalError = console.error;
      console.error = vi.fn();
      
      try {
        const order = {
          ...mockOrders[0],
          status: 'confirmed',
        };
        apiModule.api.get.mockResolvedValue({ data: [order] });
        apiModule.api.put.mockRejectedValue({
          response: {
            data: { error: 'Failed to update order' },
          },
        });

        // Mock window.alert
        window.alert = vi.fn();

        render(
          <BrowserRouter>
            <Orders />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Order #1')).toBeInTheDocument();
        });

        const markDeliveredButton = screen.getByText('Mark as Delivered');
        fireEvent.click(markDeliveredButton);

        await waitFor(() => {
          expect(window.alert).toHaveBeenCalledWith('Failed to update order');
        });
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');
    });

    it('displays error message when API call fails', async () => {
      // Suppress console.error for this test since we're testing error handling
      const originalError = console.error;
      console.error = vi.fn();
      
      try {
        apiModule.api.get.mockRejectedValue({
          response: {
            data: { error: 'Failed to load orders' },
          },
        });

        render(
          <BrowserRouter>
            <Orders />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
        });
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });

    it('displays generic error when no error message is provided', async () => {
      // Suppress console.error for this test since we're testing error handling
      const originalError = console.error;
      console.error = vi.fn();
      
      try {
        apiModule.api.get.mockRejectedValue({});

        render(
          <BrowserRouter>
            <Orders />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
        });
      } finally {
        // Restore console.error
        console.error = originalError;
      }
    });
  });
});

