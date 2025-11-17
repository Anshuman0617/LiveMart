// client/src/components/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { api, authHeader } from '../api';
import AddressAutocomplete from './AddressAutocomplete';

export default function ProfileSettings({ user, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(user?.address || '');
  const [latLng, setLatLng] = useState(
    user?.lat && user?.lng ? { lat: user.lat, lng: user.lng } : null
  );
  const [saving, setSaving] = useState(false);

  // Bank information (for retailers/wholesalers)
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(user?.bankAccountNumber || '');
  const [bankIFSC, setBankIFSC] = useState(user?.bankIFSC || '');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [payuMerchantKey, setPayuMerchantKey] = useState(user?.payuMerchantKey || '');

  const isSeller = user?.role === 'retailer' || user?.role === 'wholesaler';

  const handlePlaceSelected = async (selectedAddress, place) => {
    if (place?.geometry?.location) {
      const newLatLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setLatLng(newLatLng);
      setAddress(selectedAddress);
    }
  };

  const handleSave = async () => {
    // Validate: Sellers must have address
    if (isSeller && !address.trim()) {
      alert('Address is required for retailers and wholesalers');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        address: address || undefined,
      };

      // Include lat/lng if we have them
      if (latLng) {
        payload.lat = latLng.lat;
        payload.lng = latLng.lng;
      }

      // Include bank info for sellers
      if (isSeller) {
        payload.bankAccountName = bankAccountName || undefined;
        payload.bankAccountNumber = bankAccountNumber || undefined;
        payload.bankIFSC = bankIFSC || undefined;
        payload.bankName = bankName || undefined;
        payload.upiId = upiId || undefined;
        payload.payuMerchantKey = payuMerchantKey || undefined;
      }

      const res = await api.put('/users/me', payload, { headers: authHeader() });
      
      // Also update bank info via earnings endpoint if seller
      if (isSeller) {
        await api.put(
          '/earnings/payment-info',
          {
            bankAccountName: bankAccountName || undefined,
            bankAccountNumber: bankAccountNumber || undefined,
            bankIFSC: bankIFSC || undefined,
            bankName: bankName || undefined,
            upiId: upiId || undefined,
            payuMerchantKey: payuMerchantKey || undefined,
          },
          { headers: authHeader() }
        );
      }

      const updatedUser = res.data;
      
      // Update local storage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = { ...currentUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(newUser));
      window.dispatchEvent(new Event('userLogin'));

      alert('Settings saved successfully!');
      onSave(newUser);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert(err.response?.data?.error || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Profile Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Address Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            Address {isSeller && <span style={{ color: 'red' }}>*</span>}
          </h3>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Enter your address"
          />
          {isSeller && !address.trim() && (
            <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
              Address is required for {user?.role === 'retailer' ? 'retailers' : 'wholesalers'}
            </p>
          )}
          {latLng && (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Location: {latLng.lat.toFixed(6)}, {latLng.lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Bank Information Section (Sellers only) */}
        {isSeller && (
          <div style={{ marginBottom: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
              Payment Account Information
            </h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
              Enter your bank details to receive payments from sales
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="Name as per bank account"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Bank account number"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankIFSC}
                  onChange={(e) => setBankIFSC(e.target.value.toUpperCase())}
                  placeholder="IFSC code"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  PayU Merchant Key (Optional)
                </label>
                <input
                  type="text"
                  value={payuMerchantKey}
                  onChange={(e) => setPayuMerchantKey(e.target.value)}
                  placeholder="If you have your own PayU account"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: saving ? '#ccc' : '#3399cc',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

