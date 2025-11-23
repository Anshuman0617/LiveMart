// client/src/pages/DeliveryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api, authHeader } from '../api';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../hooks/useModal';

export default function DeliveryDashboard() {
  const { showModal, ModalComponent } = useModal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otpInputs, setOtpInputs] = useState({}); // Store OTP inputs per order
  const [requestingOTP, setRequestingOTP] = useState({}); // Track OTP request status
  const [markingDelivered, setMarkingDelivered] = useState({}); // Track delivery marking status
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.role !== 'delivery') {
      navigate('/');
      return;
    }

    loadOrders();
    
    // Listen for order status updates from seller dashboards
    const handleOrderStatusUpdate = () => {
      loadOrders();
    };
    window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    
    // Refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate);
    };
  }, [navigate]);

  const loadOrders = async () => {
    try {
      setError(null);
      const res = await api.get('/orders/delivery/assigned', { headers: authHeader() });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
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

  const getDeliveryTypeLabel = (type) => {
    if (type === 'wholesaler_to_retailer') return 'Wholesaler → Retailer';
    if (type === 'retailer_to_consumer') return 'Retailer → Consumer';
    return type;
  };

  if (loading) {
    return (
      <div className="App">
        <h2>Delivery Dashboard</h2>
        <p>Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <h2>Delivery Dashboard</h2>
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="App">
      <ModalComponent />
      <h2>Delivery Dashboard</h2>
      <p style={{ marginBottom: '20px', color: '#6b7280' }}>
        You have {orders.length} order{orders.length !== 1 ? 's' : ''} assigned to you
      </p>

      {orders.length === 0 ? (
        <div style={{ 
          marginTop: '40px', 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>No orders assigned yet</p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>
            Orders will appear here when sellers assign them to you
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #e5e7eb',
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
                  <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                    Type: {getDeliveryTypeLabel(order.deliveryType)}
                  </p>
                  {order.outForDelivery && (
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#2563eb' }}>
                      Out for delivery: {formatDate(order.outForDelivery)}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                    ₹{parseFloat(order.total).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Delivery Address */}
              <div style={{ 
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                  Delivery Address:
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  {order.address || 'No address provided'}
                </p>
                {order.user && (
                  <>
                    <p style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
                      Recipient:
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>
                      <strong>Name:</strong> {order.user.name || order.user.email}
                    </p>
                    {order.user.phone && (
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>
                        <strong>Phone:</strong> {order.user.phone}
                      </p>
                    )}
                  </>
                )}
              </div>

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

              {/* Status Badge */}
              <div style={{ 
                marginTop: '16px',
                padding: '8px 12px',
                backgroundColor: order.trackingStatus === 'out_for_delivery' ? '#dbeafe' : '#dcfce7',
                borderRadius: '6px',
                border: `1px solid ${order.trackingStatus === 'out_for_delivery' ? '#93c5fd' : '#86efac'}`,
                display: 'inline-block'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: order.trackingStatus === 'out_for_delivery' ? '#1e40af' : '#166534', fontWeight: 600 }}>
                  Status: {order.trackingStatus === 'out_for_delivery' ? '🚚 Out for Delivery' : '✓ Delivered'}
                </p>
              </div>

              {/* Delivery Actions - Only for out-for-delivery orders */}
              {order.trackingStatus === 'out_for_delivery' && (
                <div style={{ marginTop: '16px' }}>
                  {/* Request OTP Section */}
                  {(!order.deliveryOTP || (order.deliveryOTPExpiresAt && new Date() > new Date(order.deliveryOTPExpiresAt))) ? (
                    <button
                      onClick={async () => {
                        setRequestingOTP({ ...requestingOTP, [order.id]: true });
                        try {
                          const res = await api.post(
                            `/orders/${order.id}/request-delivery-otp`,
                            {},
                            { headers: authHeader() }
                          );
                          if (res.data.success) {
                            showModal(`OTP sent to recipient's email!\n\nPlease ask the recipient for the OTP and enter it below to complete delivery.`, "OTP Sent", "success");
                            loadOrders(); // Reload to show updated status
                          }
                        } catch (err) {
                          console.error('Failed to request OTP:', err);
                          showModal(err.response?.data?.error || 'Failed to request OTP', "Error", "error");
                        } finally {
                          setRequestingOTP({ ...requestingOTP, [order.id]: false });
                        }
                      }}
                      disabled={requestingOTP[order.id]}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: requestingOTP[order.id] ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: requestingOTP[order.id] ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'background 0.2s',
                        width: '100%',
                        marginBottom: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (!requestingOTP[order.id]) e.target.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        if (!requestingOTP[order.id]) e.target.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      {requestingOTP[order.id] ? 'Sending OTP...' : '📧 Request Delivery OTP'}
                    </button>
                  ) : (
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '12px', 
                      backgroundColor: '#f0fdf4', 
                      borderRadius: '6px', 
                      border: '1px solid #86efac' 
                    }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                        ✓ OTP Sent to Recipient
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#374151' }}>
                        Please ask the recipient for the OTP they received via email.
                      </p>
                      {order.deliveryOTPExpiresAt && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                          Expires: {formatDate(order.deliveryOTPExpiresAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* OTP Input and Mark Delivered Section */}
                  {order.deliveryOTP && order.deliveryOTPExpiresAt && new Date() < new Date(order.deliveryOTPExpiresAt) && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#eff6ff', 
                      borderRadius: '6px', 
                      border: '1px solid #3b82f6',
                      marginBottom: '12px'
                    }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                        Enter OTP from Recipient
                      </p>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="Enter 6-digit OTP"
                        value={otpInputs[order.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Only digits
                          setOtpInputs({ ...otpInputs, [order.id]: value });
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          letterSpacing: '4px',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          marginBottom: '8px'
                        }}
                      />
                      <button
                        onClick={async () => {
                          const otp = otpInputs[order.id];
                          if (!otp || otp.length !== 6) {
                            showModal('Please enter a valid 6-digit OTP', "OTP Required", "warning");
                            return;
                          }
                          
                          setMarkingDelivered({ ...markingDelivered, [order.id]: true });
                          try {
                            const res = await api.put(
                              `/orders/${order.id}/mark-delivered`,
                              { otp },
                              { headers: authHeader() }
                            );
                            if (res.data.success) {
                              showModal('Order marked as delivered successfully!', "Success", "success");
                              setOtpInputs({ ...otpInputs, [order.id]: '' });
                              loadOrders(); // Reload to show updated status
                              // Dispatch event to notify other components
                              window.dispatchEvent(new CustomEvent('orderStatusUpdated', { detail: { orderId: order.id } }));
                            }
                          } catch (err) {
                            console.error('Failed to mark order as delivered:', err);
                            const errorMessage = err.response?.data?.error || 'Failed to mark order as delivered';
                            // Check if it's an invalid OTP error (backend returns "Invalid OTP. Please check and try again.")
                            const lowerErrorMessage = errorMessage.toLowerCase();
                            if (lowerErrorMessage.includes('invalid otp') || 
                                (lowerErrorMessage.includes('otp') && (lowerErrorMessage.includes('check') || lowerErrorMessage.includes('invalid')))) {
                              showModal('Invalid OTP. Please check the OTP you received from the recipient and try again.', "Invalid OTP", "error");
                            } else {
                              showModal(errorMessage, "Error", "error");
                            }
                          } finally {
                            setMarkingDelivered({ ...markingDelivered, [order.id]: false });
                          }
                        }}
                        disabled={markingDelivered[order.id] || !otpInputs[order.id] || otpInputs[order.id]?.length !== 6}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: (markingDelivered[order.id] || !otpInputs[order.id] || otpInputs[order.id]?.length !== 6) ? '#9ca3af' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (markingDelivered[order.id] || !otpInputs[order.id] || otpInputs[order.id]?.length !== 6) ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          transition: 'background 0.2s',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          if (!markingDelivered[order.id] && otpInputs[order.id] && otpInputs[order.id].length === 6) {
                            e.target.style.backgroundColor = '#059669';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!markingDelivered[order.id] && otpInputs[order.id] && otpInputs[order.id].length === 6) {
                            e.target.style.backgroundColor = '#10b981';
                          }
                        }}
                      >
                        {markingDelivered[order.id] ? 'Marking as Delivered...' : '✓ Mark as Delivered'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

