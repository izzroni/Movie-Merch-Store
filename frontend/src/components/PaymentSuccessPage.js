import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import '../styles/CheckoutPage.css';

// Create a formatter for INR (for UI display)
const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

// Custom formatter for PDF to avoid issues with jsPDF
const formatINRForPDF = (value) => {
  // Format the number without single quotes, using commas for thousands
  const formattedNumber = Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `\u20B9${formattedNumber}`; // Use Unicode for ₹ symbol
};

const PaymentSuccessPage = () => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { paymentId } = useParams();
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');
  const custId = localStorage.getItem('cust_id');
  const baseUrl = 'http://localhost:5000';
  
  const preventBackNavigation = (e) => {
    window.history.pushState(null, null, window.location.pathname);
  };
  
  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', preventBackNavigation);
    
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
  
    const fetchPaymentDetails = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/payment/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch payment details');
        const data = await response.json();
        setPaymentDetails(data);
      } catch (err) {
        console.error("Error fetching payment details:", err);
        setError(err.message);
      }
    };

    const fetchBillDetails = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/bill/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch bill details');
        const data = await response.json();
        // Parse numeric fields to ensure they are numbers
        const parsedBillDetails = {
          ...data,
          items: data.items.map(item => ({
            ...item,
            price_per_item: parseFloat(item.price_per_item),
            total: parseFloat(item.total),
            discount_percentage: parseFloat(item.discount_percentage || 0),
          })),
          summary: {
            subtotal: parseFloat(data.summary.subtotal),
            tax: parseFloat(data.summary.tax),
            shipping: parseFloat(data.summary.shipping),
            total: parseFloat(data.summary.total),
          },
        };
        setBillDetails(parsedBillDetails);
      } catch (err) {
        console.error("Error fetching bill details:", err);
        setError(err.message);
      }
    };

    const finalizePayment = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/payment/finalize/${paymentId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ custId })
        });
        if (response.ok) {
          console.log("Payment finalized");
          const cartCleared = sessionStorage.getItem('cartCleared') === 'true';
          if (!cartCleared && custId) {
            await clearCartWithRetry(custId, 3);
          }
          sessionStorage.removeItem('cartCleared');
        }
      } catch (err) {
        console.error("Error finalizing payment:", err);
      }
    };
    
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchPaymentDetails(), fetchBillDetails(), finalizePayment()]);
      setLoading(false);
    };

    fetchData();

    return () => {
      window.removeEventListener('popstate', preventBackNavigation);
    };
  }, [paymentId, token, navigate, custId]);

  const clearCartWithRetry = async (custId, maxRetries) => {
    let retries = 0;
    let success = false;
    
    while (retries < maxRetries && !success) {
      try {
        const response = await fetch(`${baseUrl}/api/cart/clear/${custId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          success = true;
          sessionStorage.setItem('cartCleared', 'true');
          break;
        }
      } catch (err) {
        console.error(`Error clearing cart on attempt ${retries + 1}:`, err);
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    return success;
  };

  const downloadBill = () => {
    if (!billDetails) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", 105, 20, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment ID: #${billDetails.payment_id}`, 20, 35);
    doc.text(`Date: ${new Date(billDetails.date).toLocaleString()}`, 20, 45);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Details:", 20, 60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${billDetails.customer.name}`, 20, 70);
    doc.text(`Email: ${billDetails.customer.email}`, 20, 80);
    const addressLines = doc.splitTextToSize(`Address: ${billDetails.customer.address}`, 170);
    doc.text(addressLines, 20, 90);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Items Purchased:", 20, 110);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    let y = 120;
    billDetails.items.forEach((item, index) => {
      const itemText = `${index + 1}. ${item.item_name}${item.size ? ` (Size: ${item.size})` : ''}`;
      const priceText = `Qty: ${item.quantity} × ${formatINRForPDF(item.price_per_item)}${item.discount_percentage > 0 ? ` (-${item.discount_percentage}%)` : ''} = ${formatINRForPDF(item.total)}`;
      
      // Render item name
      const splitItemText = doc.splitTextToSize(itemText, 170);
      doc.text(splitItemText, 20, y);
      y += splitItemText.length * 7; // Adjust y based on item name height
      
      // Render price details on the next line
      const splitPriceText = doc.splitTextToSize(priceText, 170);
      doc.text(splitPriceText, 30, y); // Indent price details slightly for clarity
      y += splitPriceText.length * 7 + 5; // Add extra spacing after each item
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary:", 20, y + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${formatINRForPDF(billDetails.summary.subtotal)}`, 20, y + 20);
    doc.text(`Tax: ${formatINRForPDF(billDetails.summary.tax)}`, 20, y + 30);
    doc.text(`Shipping: ${formatINRForPDF(billDetails.summary.shipping)}`, 20, y + 40);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${formatINRForPDF(billDetails.summary.total)}`, 20, y + 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your purchase!", 105, y + 70, { align: "center" });

    doc.save(`Bill_${billDetails.payment_id}.pdf`);
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="checkout-loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-container">
        <div className="checkout-bg-overlay"></div>
        <div className="checkout-content">
          <div className="checkout-card">
            <h2 className="checkout-section-title">Error</h2>
            <p className="checkout-error-message">{error}</p>
            <div className="checkout-actions">
              <button 
                className="checkout-button primary"
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-bg-overlay"></div>
      <div className="checkout-content">
        <div className="checkout-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '2rem',
            color: 'var(--checkout-success-color)'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>✓</div>
            <h1 className="checkout-title" style={{ color: 'var(--checkout-success-color)' }}>
              Payment Successful!
            </h1>
          </div>
          
          {paymentDetails && billDetails && (
            <>
              <div className="checkout-summary-totals">
                <div className="checkout-summary-row">
                  <span>Payment ID</span>
                  <span>#{paymentDetails.payment_id}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Date</span>
                  <span>{new Date(paymentDetails.payment_date).toLocaleString()}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Customer</span>
                  <span>{billDetails.customer.name}</span>
                </div>
                <div className="checkout-summary-row total">
                  <span>Total Paid</span>
                  <span>{formatter.format(Number(paymentDetails.payment_amount))}</span>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ color: 'var(--checkout-text-primary)' }}>Items:</h3>
                {billDetails.items.map(item => (
                  <div key={item.item_id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--checkout-border-color)' }}>
                    <p>{item.item_name} {item.size ? `(Size: ${item.size})` : ''}</p>
                    <p>Qty: {item.quantity} × {formatter.format(item.price_per_item)} {item.discount_percentage > 0 && `(-${item.discount_percentage}%)`} = {formatter.format(item.total)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="checkout-actions" style={{ marginTop: '2rem' }}>
            <button 
              className="checkout-button secondary"
              onClick={downloadBill}
              disabled={!billDetails}
            >
              Download Bill (PDF)
            </button>
            <button 
              className="checkout-button primary"
              onClick={() => navigate('/', { replace: true })}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;