// client/src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { api, authHeader } from '../api';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../hooks/useModal';

export default function Orders() {
  const { showModal, ModalComponent } = useModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState({});
  const [currentOrdersExpanded, setCurrentOrdersExpanded] = useState(true);
  const [previousOrdersExpanded, setPreviousOrdersExpanded] = useState(true);
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
    
    // Load delivery persons if user is a seller
    const loadDeliveryPersons = async () => {
      try {
        const res = await api.get('/orders/delivery/persons', { headers: authHeader() });
        setDeliveryPersons(res.data || []);
      } catch (err) {
        console.error('Failed to load delivery persons:', err);
      }
    };
    
    loadDeliveryPersons();
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
      
      // Dispatch custom event to notify other pages (Cart, WholesaleCart) to refresh orders
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, status: res.data.order.status }
      }));
      
      showModal(`Order status updated to ${status}`, "Success", "success");
    } catch (err) {
      console.error('Failed to update order status:', err);
      showModal(err.response?.data?.error || 'Failed to update order status', "Error", "error");
    }
  };

  const markOutForDelivery = async (orderId) => {
    try {
      const deliveryPersonId = selectedDeliveryPerson[orderId] || null;
      const res = await api.put(
        `/orders/${orderId}/out-for-delivery`,
        { deliveryPersonId },
        { headers: authHeader() }
      );
      
      // Update local orders state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { 
            ...order, 
            trackingStatus: res.data.order.trackingStatus,
            outForDelivery: res.data.order.outForDelivery,
            deliveryType: res.data.order.deliveryType,
            deliveryPersonId: res.data.order.deliveryPersonId
          } : order
        )
      );
      
      // Dispatch custom event to notify other pages (Cart, WholesaleCart) to refresh orders
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, trackingStatus: res.data.order.trackingStatus }
      }));
      
      showModal('Order marked as out for delivery', "Success", "success");
    } catch (err) {
      console.error('Failed to mark order as out for delivery:', err);
      showModal(err.response?.data?.error || 'Failed to mark order as out for delivery', "Error", "error");
    }
  };

  const markOrderReceived = async (orderId) => {
    try {
      const res = await api.put(
        `/orders/${orderId}/mark-received`,
        {},
        { headers: authHeader() }
      );
      
      // Reload all orders to ensure proper filtering into current/previous sections
      const ordersRes = await api.get('/orders/seller', { headers: authHeader() });
      setOrders(ordersRes.data || []);
      
      // Dispatch custom event to notify other pages (Cart, WholesaleCart) to refresh orders
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, trackingStatus: res.data.order.trackingStatus }
      }));
      
      showModal('Order marked as received', "Success", "success");
    } catch (err) {
      console.error('Failed to mark order as received:', err);
      showModal(err.response?.data?.error || 'Failed to mark order as received', "Error", "error");
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

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setCurrentOrdersExpanded(!currentOrdersExpanded)}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Current Orders (Undelivered)
              {searchQuery && ` (${filteredCurrentOrders.length} found)`}
            </h2>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentOrdersExpanded(!currentOrdersExpanded);
              }}
            >
              {currentOrdersExpanded ? '−' : '+'}
            </button>
          </div>
          {currentOrdersExpanded && (
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
                    {order.scheduledPickupTime && (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: '#dbeafe', 
                        borderRadius: '6px',
                        border: '1px solid #93c5fd',
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
                          📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                        </p>
                      </div>
                    )}
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                      Status: <span style={{ 
                        color: order.status === 'confirmed' ? '#059669' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </p>
                    {/* Tracking Status - Show delivery status for regular orders, pickup status for store pickup */}
                    {order.scheduledPickupTime ? (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                        borderRadius: '6px',
                        border: `1px solid ${(order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                          {(order.trackingStatus === 'delivered') ? '✓ Picked Up' : '📦 Pending Pickup'}
                        </p>
                        {order.deliveredAt && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Picked up: {formatDate(order.deliveredAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: (order.trackingStatus === 'out_for_delivery') ? '#fef3c7' : (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                        borderRadius: '6px',
                        border: `1px solid ${(order.trackingStatus === 'out_for_delivery') ? '#fbbf24' : (order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'out_for_delivery') ? '#92400e' : (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                          {(order.trackingStatus === 'out_for_delivery') ? '🚚 Out for Delivery' : (order.trackingStatus === 'delivered') ? '✓ Delivered' : '📦 Pending Delivery'}
                        </p>
                        {order.outForDelivery && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Out: {formatDate(order.outForDelivery)}
                          </p>
                        )}
                        {order.deliveredAt && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Delivered: {formatDate(order.deliveredAt)}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Delivery Person Information */}
                    {order.deliveryPerson && !order.scheduledPickupTime && (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                          🚚 Delivery Person:
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e3a8a' }}>
                          {order.deliveryPerson.name || order.deliveryPerson.email}
                        </p>
                        {order.deliveryPerson.phone && (
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
                            📞 {order.deliveryPerson.phone}
                          </p>
                        )}
                      </div>
                    )}
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
                          {order.scheduledPickupTime && (
                            <p style={{ margin: '2px 0', fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                              📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Actions - Only show for non-store-pickup orders */}
                {order.status === 'confirmed' && (order.trackingStatus === 'pending' || !order.trackingStatus) && userRole && !order.scheduledPickupTime && (
                  <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>Delivery Tracking:</p>
                    {deliveryPersons.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>
                          Select Delivery Person (Optional):
                        </label>
                        <select
                          value={selectedDeliveryPerson[order.id] || ''}
                          onChange={(e) => setSelectedDeliveryPerson({ ...selectedDeliveryPerson, [order.id]: e.target.value || null })}
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '6px'
                          }}
                        >
                          <option value="">None (Self Delivery)</option>
                          {deliveryPersons.map((dp) => (
                            <option key={dp.id} value={dp.id}>
                              {dp.name} ({dp.phone || dp.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => markOutForDelivery(order.id)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                      Mark Out for Delivery
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
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
                  {/* Mark Received button for retailers receiving from wholesalers */}
                  {userRole === 'retailer' && order.trackingStatus === 'out_for_delivery' && order.deliveryType === 'wholesaler_to_retailer' && !order.scheduledPickupTime && (
                    <button
                      onClick={() => markOrderReceived(order.id)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                    >
                      Mark as Received
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
          )}
        </div>
      )}

      {/* Previous Orders (Delivered) */}
      {filteredPreviousOrders.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }} onClick={() => setPreviousOrdersExpanded(!previousOrdersExpanded)}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Previous Orders (Delivered)
              {searchQuery && ` (${filteredPreviousOrders.length} found)`}
            </h2>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setPreviousOrdersExpanded(!previousOrdersExpanded);
              }}
            >
              {previousOrdersExpanded ? '−' : '+'}
            </button>
          </div>
          {previousOrdersExpanded && (
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
                    {order.scheduledPickupTime && (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: '#dbeafe', 
                        borderRadius: '6px',
                        border: '1px solid #93c5fd',
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
                          📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                        </p>
                      </div>
                    )}
                    {/* Tracking Status - Show delivery status for regular orders, pickup status for store pickup */}
                    {order.scheduledPickupTime ? (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                        borderRadius: '6px',
                        border: `1px solid ${(order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                          {(order.trackingStatus === 'delivered') ? '✓ Picked Up' : '📦 Pending Pickup'}
                        </p>
                        {order.deliveredAt && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Picked up: {formatDate(order.deliveredAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: (order.trackingStatus === 'out_for_delivery') ? '#fef3c7' : (order.trackingStatus === 'delivered') ? '#d1fae5' : '#f3f4f6',
                        borderRadius: '6px',
                        border: `1px solid ${(order.trackingStatus === 'out_for_delivery') ? '#fbbf24' : (order.trackingStatus === 'delivered') ? '#10b981' : '#d1d5db'}`,
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '14px', color: (order.trackingStatus === 'out_for_delivery') ? '#92400e' : (order.trackingStatus === 'delivered') ? '#065f46' : '#374151', fontWeight: 600 }}>
                          {(order.trackingStatus === 'out_for_delivery') ? '🚚 Out for Delivery' : (order.trackingStatus === 'delivered') ? '✓ Delivered' : '📦 Pending Delivery'}
                        </p>
                        {order.outForDelivery && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Out: {formatDate(order.outForDelivery)}
                          </p>
                        )}
                        {order.deliveredAt && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            Delivered: {formatDate(order.deliveredAt)}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Delivery Person Information */}
                    {order.deliveryPerson && !order.scheduledPickupTime && (
                      <div style={{ 
                        margin: '8px 0', 
                        padding: '8px 12px', 
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        display: 'inline-block'
                      }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                          🚚 Delivery Person:
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e3a8a' }}>
                          {order.deliveryPerson.name || order.deliveryPerson.email}
                        </p>
                        {order.deliveryPerson.phone && (
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
                            📞 {order.deliveryPerson.phone}
                          </p>
                        )}
                      </div>
                    )}
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
                          {order.scheduledPickupTime && (
                            <p style={{ margin: '2px 0', fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                              📅 Store Pickup: {formatDateOnly(order.scheduledPickupTime)}
                            </p>
                          )}
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
          )}
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

