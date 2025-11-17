// client/src/components/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { api, authHeader } from '../api';
import AddressAutocomplete from './AddressAutocomplete';

export default function ProfileSettings({ user, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(user);

  // Parse existing address into components
  const parseAddress = (addr) => {
    if (!addr) return { houseFlat: '', locality: '', cityPin: '' };
    // Try to split by common delimiters
    const parts = addr.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      return {
        houseFlat: parts[0],
        locality: parts[1],
        cityPin: parts.slice(2).join(', ')
      };
    }
    // If not comma-separated, try to guess
    return { houseFlat: '', locality: '', cityPin: addr };
  };

  // Initialize state with empty values (will be populated after fetch)
  const [houseFlat, setHouseFlat] = useState('');
  const [locality, setLocality] = useState('');
  const [cityPin, setCityPin] = useState('');
  const [phone, setPhone] = useState('');
  
  // Bank information (for retailers and wholesalers)
  const isSeller = userData?.role === 'retailer' || userData?.role === 'wholesaler';
  // Single address field for sellers
  const [address, setAddress] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payuMerchantKey, setPayuMerchantKey] = useState('');

  // Fetch full user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/users/me', { headers: authHeader() });
        setUserData(res.data);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        // Fallback to prop user if fetch fails
        setUserData(user);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Update fields when userData changes
  useEffect(() => {
    if (!userData) return;
    
    if (isSeller) {
      // For sellers, use single address field
      setAddress(userData.address || '');
      // Update bank information for sellers
      setBankAccountName(userData.bankAccountName || '');
      setBankAccountNumber(userData.bankAccountNumber || '');
      setBankIFSC(userData.bankIFSC || '');
      setBankName(userData.bankName || '');
      setUpiId(userData.upiId || '');
      setPayuMerchantKey(userData.payuMerchantKey || '');
    } else {
      // For regular users, use three separate fields
      const parsed = parseAddress(userData.address || '');
      setHouseFlat(parsed.houseFlat);
      setLocality(parsed.locality);
      setCityPin(parsed.cityPin);
    }
    setPhone(userData.phone || '');
  }, [userData, isSeller]);

  // Handle address autocomplete selection
  const handlePlaceSelected = (selectedAddress, place) => {
    if (!place) return;

    if (isSeller) {
      // For sellers, use the formatted address directly
      setAddress(selectedAddress || place.formatted_address || '');
    } else {
      // For regular users, parse into three fields
      const addressComponents = place.address_components || [];
      
      // Extract components
      let streetNumber = '';
      let route = '';
      let sublocality = '';
      let locality = '';
      let city = '';
      let state = '';
      let postalCode = '';

      addressComponents.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          route = component.long_name;
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
          sublocality = component.long_name;
        } else if (types.includes('locality')) {
          locality = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
      });

      // Build address fields
      const houseFlatValue = [streetNumber, route].filter(Boolean).join(' ');
      const localityValue = sublocality || locality || '';
      const cityPinValue = [city || locality, state, postalCode].filter(Boolean).join(', ');

      setHouseFlat(houseFlatValue);
      setLocality(localityValue);
      setCityPin(cityPinValue);
    }
  };

  const handleSave = async () => {
    // Validate: All users must have address and phone
    let fullAddress = '';
    if (isSeller) {
      fullAddress = address.trim();
    } else {
      fullAddress = [houseFlat, locality, cityPin].filter(Boolean).join(', ');
    }
    
    if (!fullAddress) {
      alert('Please enter your complete address');
      return;
    }

    if (!phone.trim()) {
      alert('Please enter your phone number');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        address: fullAddress,
        phone: phone.trim(),
      };

      // Add bank information for sellers
      if (isSeller) {
        payload.bankAccountName = bankAccountName.trim();
        payload.bankAccountNumber = bankAccountNumber.trim();
        payload.bankIFSC = bankIFSC.trim();
        payload.bankName = bankName.trim();
        payload.upiId = upiId.trim();
        payload.payuMerchantKey = payuMerchantKey.trim();
      }

      const res = await api.put('/users/me', payload, { headers: authHeader() });

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

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading profile data...</p>
          </div>
        )}

        {!loading && (
          <>
        {/* Address Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            Address <span style={{ color: 'red' }}>*</span>
          </h3>
          
          {isSeller ? (
            // Single address field for sellers
            <>
              {/* Address Autocomplete */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Search Address (Auto-fill below)
                </label>
                <AddressAutocomplete
                  placeholder="Search and select your address..."
                  value=""
                  onPlaceSelected={handlePlaceSelected}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Search for your address to auto-fill, or enter manually
                </p>
              </div>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete address"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </>
          ) : (
            // Three separate fields for regular users
            <>
              {/* Address Autocomplete */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Search Address (Auto-fill fields below)
                </label>
                <AddressAutocomplete
                  placeholder="Search and select your address..."
                  value=""
                  onPlaceSelected={handlePlaceSelected}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Search for your address to auto-fill the fields below, or enter manually
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                    House/Flat Number
                  </label>
                  <input
                    type="text"
                    value={houseFlat}
                    onChange={(e) => setHouseFlat(e.target.value)}
                    placeholder="House/Flat number"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                    Locality/Area
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Locality or area"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                    City and Pin Code
                  </label>
                  <input
                    type="text"
                    value={cityPin}
                    onChange={(e) => setCityPin(e.target.value)}
                    placeholder="City, State - Pin Code"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Phone Number Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            Phone Number <span style={{ color: 'red' }}>*</span>
          </h3>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Bank Information Section (for retailers and wholesalers only) */}
        {isSeller && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
              Payment Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Bank Account Name
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="Account holder name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Account number"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  value={bankIFSC}
                  onChange={(e) => setBankIFSC(e.target.value)}
                  placeholder="IFSC code"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
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
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
                  UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
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
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
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
        </>
        )}
      </div>
    </div>
  );
}

