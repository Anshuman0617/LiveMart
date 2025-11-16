import React, { useState } from 'react';
import { api, authHeader } from '../api';
import { useNavigate } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete.jsx';

export default function Checkout() {
  const [address, setAddress] = useState('');
  const nav = useNavigate();
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  async function placeOrder() {
    if (!cart.length) return alert('Cart empty');
    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
    try {
      const res = await api.post('/orders', { items, address }, { headers: authHeader() });
      alert('Order created: ' + res.data.orderId);
      localStorage.removeItem('cart');
      nav('/');
    } catch (err) {
      alert('Error placing order. Please log in.');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Checkout</h1>
      <p>Shipping Address</p>
      <AddressAutocomplete value={address} onChange={setAddress} />
      <button onClick={placeOrder} style={{ marginTop: 10 }}>Place Order</button>
    </div>
  );
}
