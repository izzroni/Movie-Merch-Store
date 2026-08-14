import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf"; // Import jsPDF
import "../styles/OrderHistory.css";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [feedbackData, setFeedbackData] = useState({});
  const [existingFeedback, setExistingFeedback] = useState({});
  const custId = localStorage.getItem("cust_id");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!custId || !token) {
      setError("Please log in to view your order history");
      setLoading(false);
      navigate("/login");
      return;
    }

    const fetchOrdersAndFeedback = async () => {
      try {
        const [ordersResponse, feedbackResponse] = await Promise.all([
          axios.get(`http://localhost:5000/api/customer/orders/${custId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`http://localhost:5000/api/feedback/customer/${custId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        // Ensure payment_id is included; adjust if needed based on your backend response
        setOrders(ordersResponse.data);
        const feedbackMap = feedbackResponse.data.reduce((acc, fb) => {
          acc[fb.item_id] = fb;
          return acc;
        }, {});
        setExistingFeedback(feedbackMap);
        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to load data");
        setLoading(false);
        console.error("Error fetching data:", error);
      }
    };

    fetchOrdersAndFeedback();
  }, [custId, token, navigate]);

  const toggleOrderDetails = (cartMasterId) => {
    setExpandedOrder(expandedOrder === cartMasterId ? null : cartMasterId);
  };

  const handleFeedbackChange = (itemId, field, value) => {
    setFeedbackData((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const submitFeedback = async (itemId) => {
    const feedback = feedbackData[itemId] || {};
    if (!feedback.feedback_text || !feedback.rating) {
      setError("Please provide both feedback text and a rating");
      return;
    }
    const ratingNum = Number(feedback.rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      setError("Rating must be an integer between 1 and 5");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/feedback",
        {
          cust_id: custId,
          item_id: itemId,
          feedback_text: feedback.feedback_text,
          rating: Number(feedback.rating),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExistingFeedback((prev) => ({
        ...prev,
        [itemId]: {
          item_id: itemId,
          feedback_text: feedback.feedback_text,
          rating: Number(feedback.rating),
          fb_date: new Date().toISOString(),
        },
      }));
      setFeedbackData((prev) => {
        const newData = { ...prev };
        delete newData[itemId];
        return newData;
      });
      setError(null);
      alert("Feedback submitted successfully!");
    } catch (error) {
      setError(error.response?.data?.error || "Failed to submit feedback");
    }
  };

  const downloadBill = async (paymentId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/bill/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const billDetails = {
        ...response.data,
        items: response.data.items.map(item => ({
          ...item,
          price_per_item: parseFloat(item.price_per_item),
          total: parseFloat(item.total),
          discount_percentage: parseFloat(item.discount_percentage || 0),
        })),
        summary: {
          subtotal: parseFloat(response.data.summary.subtotal),
          tax: parseFloat(response.data.summary.tax),
          shipping: parseFloat(response.data.summary.shipping),
          total: parseFloat(response.data.summary.total),
        },
      };

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
        const priceText = `Qty: ${item.quantity} × ₹${item.price_per_item.toFixed(2)}${item.discount_percentage > 0 ? ` (-${item.discount_percentage}%)` : ''} = ₹${item.total.toFixed(2)}`;
        const splitItemText = doc.splitTextToSize(itemText, 100);
        const splitPriceText = doc.splitTextToSize(priceText, 70);
        
        doc.text(splitItemText, 20, y);
        doc.text(splitPriceText, 120, y);
        y += Math.max(splitItemText.length, splitPriceText.length) * 7 + 5;
        
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
      doc.text(`Subtotal: ₹${billDetails.summary.subtotal.toFixed(2)}`, 20, y + 20);
      doc.text(`Tax: ₹${billDetails.summary.tax.toFixed(2)}`, 20, y + 30);
      doc.text(`Shipping: ₹${billDetails.summary.shipping.toFixed(2)}`, 20, y + 40);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ₹${billDetails.summary.total.toFixed(2)}`, 20, y + 50);

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for your purchase!", 105, y + 70, { align: "center" });

      doc.save(`Bill_${billDetails.payment_id}.pdf`);
    } catch (error) {
      console.error("Error generating bill:", error);
      setError("Failed to generate bill");
    }
  };

  const renderStars = (itemId) => {
    const rating = feedbackData[itemId]?.rating || 0;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? "filled" : ""}`}
            onClick={() => handleFeedbackChange(itemId, "rating", star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="order-history-container">
      <h1>Your Order History</h1>
      {orders.length === 0 ? (
        <p className="no-orders">You have no completed orders yet.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Total Amount</th>
              <th>Payment Date</th>
              <th>Delivery Status</th>
              <th>Delivery Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <React.Fragment key={order.cart_master_id}>
                <tr>
                  <td>
                    <button
                      className="expand-btn"
                      onClick={() => toggleOrderDetails(order.cart_master_id)}
                    >
                      {order.cart_master_id} {expandedOrder === order.cart_master_id ? "▲" : "▼"}
                    </button>
                  </td>
                  <td>₹{order.cart_tot_amt ? Number(order.cart_tot_amt).toFixed(2) : "0.00"}</td>
                  <td>{order.payment_date ? new Date(order.payment_date).toLocaleString() : "N/A"}</td>
                  <td>
                    <span className={`status-badge ${order.del_status ? order.del_status.toLowerCase() : "pending"}`}>
                      {order.del_status || "Pending"}
                    </span>
                  </td>
                  <td>{order.del_date ? new Date(order.del_date).toLocaleString() : "N/A"}</td>
                  <td>
                    <Link to={`/track-delivery/${order.cart_master_id}`} className="track-btn">
                      Track
                    </Link>
          
                    {/* Add Download Bill button if payment_id exists */}
                    {order.payment_id && (
                      <button
                        className="track-btn" // Reuse styling or create a new class
                        style={{ marginLeft: "10px" }}
                        onClick={() => downloadBill(order.payment_id)}
                      >
                        Download Bill
                      </button>
                    )}
                  </td>
                </tr>
                {expandedOrder === order.cart_master_id && order.items.length > 0 && (
                  <tr className="order-items-row">
                    <td colSpan="6">
                      <div className="order-items">
                        <h4>Items:</h4>
                        <ul>
                          {order.items.map((item) => (
                            <li key={item.item_id}>
                              <span className="item-name">{item.item_name}</span> -
                              <span className="item-quantity"> Quantity: {item.quantity}</span> -
                              <span className="item-price"> ₹{Number(item.price_per_item).toFixed(2)}</span>
                              {existingFeedback[item.item_id] ? (
                                <div className="existing-feedback">
                                  <p><strong>Your Feedback:</strong> {existingFeedback[item.item_id].feedback_text}</p>
                                  <p><strong>Rating:</strong> {existingFeedback[item.item_id].rating}/5</p>
                                  <p><strong>Submitted:</strong> {new Date(existingFeedback[item.item_id].fb_date).toLocaleString()}</p>
                                </div>
                              ) : order.del_status === "Delivered" ? (
                                <div className="feedback-form">
                                  <textarea
                                    placeholder="Your feedback..."
                                    value={feedbackData[item.item_id]?.feedback_text || ""}
                                    onChange={(e) => handleFeedbackChange(item.item_id, "feedback_text", e.target.value)}
                                  />
                                  {renderStars(item.item_id)}
                                  <button onClick={() => submitFeedback(item.item_id)}>Submit Feedback</button>
                                </div>
                              ) : (
                                <p className="feedback-pending">Feedback available after delivery</p>
                              )}
                            </li>
                          ))}
                          {order.payment_id && (
  <button
    className="download-bill-btn" // Changed from track-btn
    onClick={() => downloadBill(order.payment_id)}
  >
  Download Bill
  </button>
)}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderHistory;