import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CheckoutPage.css';

const CheckoutAddressPage = () => {
  const [addressData, setAddressData] = useState({
    f_name: '',
    l_name: '',
    house_add: '',
    area_add: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const navigate = useNavigate();

  // Get auth data from localStorage
  const token = localStorage.getItem('token');
  const custId = localStorage.getItem('cust_id');
  const baseUrl = 'http://localhost:5000';


useEffect(() => {
  console.log("isEditing state:", isEditing);
}, [isEditing]);

  useEffect(() => {
    if (!token || !custId) {
      navigate('/login', { replace: true });
      return;
    }
    

    const fetchCustomerData = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/customers/${custId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch customer data');
        }

        const customerData = await response.json();
        setAddressData({
          f_name: customerData.f_name || '',
          l_name: customerData.l_name || '',
          house_add: customerData.house_add || '',
          area_add: customerData.area_add || '',
          city: customerData.city || '',
          state: customerData.state || '',
          pincode: customerData.pincode || '',
          phone_number: customerData.phone_number || ''
        });
      } catch (err) {
        console.error("Customer data fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [token, custId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddressData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    let errors = {};
    const nameRegex = /^[A-Za-z]{1,15}$/;
    const phoneRegex = /^\d{10}$/;
    const pincodeRegex = /^\d{6}$/;
  
    if (!nameRegex.test(addressData.f_name)) {
      errors.f_name = 'First name must be 1-15 letters only.';
    }
    if (!nameRegex.test(addressData.l_name)) {
      errors.l_name = 'Last name must be 1-15 letters only.';
    }
    if (addressData.house_add.length > 50) {
      errors.house_add = 'House address max length is 50 characters.';
    }
    if (addressData.area_add.length > 40) {
      errors.area_add = 'Area address max length is 40 characters.';
    }
    if (addressData.city.length > 15) {
      errors.city = 'City max length is 15 characters.';
    }
    if (addressData.state.length > 12) {
      errors.state = 'State max length is 12 characters.';
    }
    if (!pincodeRegex.test(addressData.pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }
    if (!phoneRegex.test(addressData.phone_number)) {
      errors.phone_number = 'Phone number must be exactly 10 digits.';
    }
  
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  

  const saveAddress = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;  // 🚀 Add this line to prevent submission if validation fails
  
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/customers/${custId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressData),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update address');
      }
  
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const proceedToPayment = () => {
    navigate('/checkout/payment');
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="checkout-loading-spinner"></div>
      </div>
    );
  }
  

  return (
    <div className="checkout-container">
      <div className="checkout-bg-overlay"></div>
      
      <div className="checkout-content">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-progress">
          <div className="progress-step active">1. Shipping Address</div>
          <div className="progress-step">2. Payment</div>
        </div>
        
        {error && <div className="checkout-error-message">{error}</div>}
        
        <div className="checkout-card">
          <h2 className="checkout-section-title">Shipping Address</h2>
          
          <form 
  key={isEditing ? "edit-mode" : "view-mode"} 
  className="checkout-form" 
  onSubmit={saveAddress}
>

            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label className="checkout-label">First Name</label>
                <input
                  type="text"
                  name="f_name"
                  className="checkout-input"
                  value={addressData.f_name}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
                  {validationErrors.f_name && <p className="error">{validationErrors.f_name}</p>}

              </div>
              
              <div className="checkout-form-group">
                <label className="checkout-label">Last Name</label>
                <input
                  type="text"
                  name="l_name"
                  className="checkout-input"
                  value={addressData.l_name}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
              </div>
              {validationErrors.l_name && <p className="error">{validationErrors.l_name}</p>}

            </div>
            
            <div className="checkout-form-group">
              <label className="checkout-label">House/Building Address</label>
              <input
                type="text"
                name="house_add"
                className="checkout-input"
                value={addressData.house_add}
                onChange={handleInputChange}
                readOnly={!isEditing}
                required
              />
                {validationErrors.house_add && <p className="error">{validationErrors.house_add}</p>}

            </div>
            
            <div className="checkout-form-group">
              <label className="checkout-label">Area/Street Address</label>
              <input
                type="text"
                name="area_add"
                className="checkout-input"
                value={addressData.area_add}
                onChange={handleInputChange}
                readOnly={!isEditing}
              />
                {validationErrors.area_add && <p className="error">{validationErrors.area_add}</p>}

            </div>
            
            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label className="checkout-label">City</label>
                <input
                  type="text"
                  name="city"
                  className="checkout-input"
                  value={addressData.city}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
                  {validationErrors.city && <p className="error">{validationErrors.city}</p>}

              </div>
              
              <div className="checkout-form-group">
                <label className="checkout-label">State</label>
                <input
                  type="text"
                  name="state"
                  className="checkout-input"
                  value={addressData.state}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
                  {validationErrors.state && <p className="error">{validationErrors.state}</p>}

              </div>
            </div>
            
            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label className="checkout-label">PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  className="checkout-input"
                  value={addressData.pincode}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
                  {validationErrors.pincode && <p className="error">{validationErrors.pincode}</p>}

              </div>
              
              <div className="checkout-form-group">
                <label className="checkout-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  className="checkout-input"
                  value={addressData.phone_number}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                  required
                />
                  {validationErrors.phone_number && <p className="error">{validationErrors.phone_number}</p>}

              </div>
            </div>
            
            <div className="checkout-actions">
              {isEditing ? (
                <>
                  <button type="submit" className="checkout-button primary">Save Address</button>
                  <button 
                    type="button" 
                    className="checkout-button secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                
                  <button 
  type="button" 
  className="checkout-button secondary"
  onClick={() => {
    console.log("Edit button clicked"); 
    setIsEditing(true);
  }}
>
  Edit Address
</button>
                  <button 
                    type="button" 
                    className="checkout-button primary"
                    onClick={proceedToPayment}
                  >
                    Continue to Payment
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutAddressPage;