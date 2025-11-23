import React, { useState } from 'react';
import { api, authHeader } from '../api';
import { useNavigate } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete.jsx';
import { useModal } from '../hooks/useModal';

export default function Checkout() {
  const { showModal, ModalComponent } = useModal();
  const [address, setAddress] = useState('');
  const nav = useNavigate();
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');

  async function placeOrder() {
    if (!cart.length) {
      showModal('Cart empty', "Empty Cart", "warning");
      return;
    }
    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
    try {
      const res = await api.post('/orders', { items, address }, { headers: authHeader() });
      showModal('Order created: ' + res.data.orderId, "Success", "success");
      localStorage.removeItem('cart');
      nav('/');
    } catch (err) {
      showModal('Error placing order. Please log in.', "Error", "error");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <ModalComponent />
      <h1>Checkout</h1>
      <p>Shipping Address</p>
      <AddressAutocomplete value={address} onChange={setAddress} />
      <button onClick={placeOrder} style={{ marginTop: 10 }}>Place Order</button>
    </div>
  );
}
