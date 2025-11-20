import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Navbar', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the brand name', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('LiveMart')).toBeInTheDocument();
  });

  it('shows login button when user is not logged in', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows user name and logout button when user is logged in', () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    
    // Click username button to open menu
    const usernameButton = screen.getByText('Test User').closest('button');
    fireEvent.click(usernameButton);
    
    // Now logout button should be visible
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('shows retailer dashboard button for retailer users', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Retailer Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Buy Wholesale')).toBeInTheDocument();
  });

  it('shows wholesaler dashboard button for wholesaler users', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'wholesaler' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText('Wholesaler Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Retailer Dashboard')).not.toBeInTheDocument();
  });

  it('navigates to home when brand is clicked', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const brandButton = screen.getByText('LiveMart');
    fireEvent.click(brandButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('opens profile menu when username button is clicked', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'test-token');

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Click username button to open menu
    const usernameButton = screen.getByText('Test User').closest('button');
    fireEvent.click(usernameButton);

    // Menu should show Settings and Logout options
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });

  it('logs out user when logout is clicked', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('cart_1', JSON.stringify([{ productId: 1, quantity: 1 }]));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Click username button to open menu
    const usernameButton = screen.getByText('Test User').closest('button');
    fireEvent.click(usernameButton);

    // Click logout button
    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);

    // Check that localStorage is cleared
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('cart_1')).toBeNull();
    
    // Check that navigation to login page was called
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('closes profile menu when clicking outside', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Click username button to open menu
    const usernameButton = screen.getByText('Test User').closest('button');
    fireEvent.click(usernameButton);

    // Menu should be visible
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();

    // Click outside (on the document body)
    fireEvent.mouseDown(document.body);

    // Menu should be closed (Settings and Logout should not be visible)
    expect(screen.queryByText(/Settings/i)).not.toBeInTheDocument();
  });
});

