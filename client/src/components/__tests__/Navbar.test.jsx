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
    expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
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

  it('shows logout modal when logout button is clicked', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'test-token');

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Get the navbar logout button (first one)
    const logoutButtons = screen.getAllByText('Logout');
    const navbarLogoutButton = logoutButtons[0];
    fireEvent.click(navbarLogoutButton);

    expect(screen.getByText('Confirm Logout')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to logout?')).toBeInTheDocument();
  });

  it('logs out user when logout is confirmed', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'test-token');

    // Mock window.location.reload
    const reloadMock = vi.fn();
    delete window.location;
    window.location = { reload: reloadMock };

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Open logout modal - get the navbar logout button (first one)
    const logoutButtons = screen.getAllByText('Logout');
    const navbarLogoutButton = logoutButtons[0];
    fireEvent.click(navbarLogoutButton);

    // Confirm logout - get all logout buttons and find the one with 'danger' class (modal button)
    const allLogoutButtons = screen.getAllByRole('button', { name: 'Logout' });
    const modalLogoutButton = allLogoutButtons.find(btn => btn.classList.contains('danger'));
    expect(modalLogoutButton).toBeDefined();
    fireEvent.click(modalLogoutButton);

    // Check that localStorage is cleared
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('closes logout modal when cancel is clicked', () => {
    const mockUser = { id: 1, name: 'Test User', role: 'retailer' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    // Open logout modal - get the navbar logout button (first one)
    const logoutButtons = screen.getAllByText('Logout');
    const navbarLogoutButton = logoutButtons[0];
    fireEvent.click(navbarLogoutButton);

    expect(screen.getByText('Confirm Logout')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Confirm Logout')).not.toBeInTheDocument();
  });
});

