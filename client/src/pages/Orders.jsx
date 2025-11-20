// client/src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { api, authHeader } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role !== 'retailer' && user?.role !== 'wholesaler') {
      navigate('/');
      return;
    }

    setUserRole(user?.role);

    const fetchOrders = async () => {
      try {
        setError(null);
        const res = await api.get('/orders/seller', { headers: authHeader() });
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setError(err.response?.data?.error || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await api.put(
        `/orders/${orderId}/status`,
        { status },
        { headers: authHeader() }
      );
      
      // Update local orders state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: res.data.order.status } : order
        )
      );
      
      alert(`Order status updated to ${status}`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert(err.response?.data?.error || 'Failed to update order status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Separate orders into current (undelivered) and previous (delivered)
  const currentOrders = orders.filter(order => 
    order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'fulfilled'
  );
  const previousOrders = orders.filter(order => 
    order.status === 'delivered' || order.status === 'fulfilled'
  );

  // Filter orders by order number, transaction ID, or customer name
  const filterOrders = (orderList) => {
    if (!searchQuery.trim()) return orderList;
    
    const query = searchQuery.toLowerCase().trim();
    return orderList.filter(order => {
      const orderId = order.id?.toString() || '';
      const transactionId = order.paymentId?.toLowerCase() || '';
      const customerName = order.customer?.name?.toLowerCase() || '';
      const customerEmail = order.customer?.email?.toLowerCase() || '';
      return orderId.includes(query) || 
             transactionId.includes(query) || 
             customerName.includes(query) ||
             customerEmail.includes(query);
    });
  };

  const filteredCurrentOrders = filterOrders(currentOrders);
  const filteredPreviousOrders = filterOrders(previousOrders);

  if (loading) {
    return (
      <div className="App">
        <h1>Orders Management</h1>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Orders Management</h1>

      {/* Search Bar */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder={
            userRole === 'retailer' 
              ? "Search by Order #, Transaction ID, or User Name..." 
              : userRole === 'wholesaler'
              ? "Search by Order #, Transaction ID, or Retailer Name..."
              : "Search by Order # or Transaction ID..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '6px'
          }}
        />
      </div>

      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          borderRadius: '8px', 
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Current Orders (Undelivered) */}
      {filteredCurrentOrders.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 600 }}>
            Current Orders (Undelivered)
            {searchQuery && ` (${filteredCurrentOrders.length} found)`}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredCurrentOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      Order #{order.id}
                    </h3>
                    {order.paymentId && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                        Transaction ID: {order.paymentId}
                      </p>
                    )}
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                      Ordered on: {formatDate(order.createdAt)}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                      Status: <span style={{ 
                        color: order.status === 'confirmed' ? '#059669' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                      ₹{parseFloat(order.total).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Customer Information */}
                {order.customer && (
                  <div style={{ 
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                      Customer Information:
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Name:</strong> {order.customer.name || order.customer.email}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Email:</strong> {order.customer.email}
                    </p>
                    {order.customer.phone && (
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>
                        <strong>Phone:</strong> {order.customer.phone}
                      </p>
                    )}
                    {order.customer.address && (
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>
                        <strong>Address:</strong> {order.customer.address}
                      </p>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>Items:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.items?.map((item) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center',
                          padding: '8px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        {item.product?.imageUrl || (item.product?.images && item.product.images[0]) ? (
                          <img
                            src={`http://localhost:4000${item.product.imageUrl || item.product.images[0]}`}
                            alt={item.product?.title}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        ) : null}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
                            {item.product?.title || 'Product'}
                          </p>
                          <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>
                            Qty: {item.quantity} × ₹{(() => {
                              const unitPrice = parseFloat(item.unitPrice) || 0;
                              return unitPrice.toFixed(2);
                            })()} = ₹{(() => {
                              const subtotal = parseFloat(item.subtotal) || 0;
                              return subtotal.toFixed(2);
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {order.status !== 'delivered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
                    >
                      Mark as Delivered
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                    >
                      Set Back to Undelivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Orders (Delivered) */}
      {filteredPreviousOrders.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 600 }}>
            Previous Orders (Delivered)
            {searchQuery && ` (${filteredPreviousOrders.length} found)`}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredPreviousOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '24px',
                  backgroundColor: '#f9fafb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      Order #{order.id}
                    </h3>
                    {order.paymentId && (
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                        Transaction ID: {order.paymentId}
                      </p>
                    )}
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                      Ordered on: {formatDate(order.createdAt)}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                      ✓ Delivered
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                      ₹{parseFloat(order.total).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Customer Information */}
                {order.customer && (
                  <div style={{ 
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                      Customer Information:
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Name:</strong> {order.customer.name || order.customer.email}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Email:</strong> {order.customer.email}
                    </p>
                    {order.customer.phone && (
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>
                        <strong>Phone:</strong> {order.customer.phone}
                      </p>
                    )}
                    {order.customer.address && (
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>
                        <strong>Address:</strong> {order.customer.address}
                      </p>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>Items:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.items?.map((item) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center',
                          padding: '8px',
                          backgroundColor: '#fff',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        {item.product?.imageUrl || (item.product?.images && item.product.images[0]) ? (
                          <img
                            src={`http://localhost:4000${item.product.imageUrl || item.product.images[0]}`}
                            alt={item.product?.title}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        ) : null}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>
                            {item.product?.title || 'Product'}
                          </p>
                          <p style={{ margin: '2px 0', fontSize: '11px', color: '#6b7280' }}>
                            Qty: {item.quantity} × ₹{(() => {
                              const unitPrice = parseFloat(item.unitPrice) || 0;
                              return unitPrice.toFixed(2);
                            })()} = ₹{(() => {
                              const subtotal = parseFloat(item.subtotal) || 0;
                              return subtotal.toFixed(2);
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                  >
                    Set Back to Undelivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && filteredCurrentOrders.length === 0 && filteredPreviousOrders.length === 0 && (
        <div style={{ marginTop: '40px', textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '18px', color: '#6b7280', fontWeight: 500 }}>
            {searchQuery ? 'No orders found matching your search' : 'No orders yet'}
          </p>
          {searchQuery && (
            <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
              Try searching by order number, transaction ID, or {userRole === 'retailer' ? 'user name' : userRole === 'wholesaler' ? 'retailer name' : 'customer name'}
            </p>
          )}
          {!searchQuery && (
            <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
              Orders from customers will appear here once they purchase your products.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

