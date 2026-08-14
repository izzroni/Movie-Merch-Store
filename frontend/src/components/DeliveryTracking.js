import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "../styles/DeliveryTracking.css";

const DeliveryTracking = () => {
  const { cartMasterId } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeliveryStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5000/api/customer/delivery/${cartMasterId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDelivery(response.data);
        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to load delivery status");
        setLoading(false);
      }
    };
    fetchDeliveryStatus();
  }, [cartMasterId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="delivery-tracking">
      <h1>Order #{cartMasterId} Tracking</h1>
      {delivery ? (
        <div className="tracking-card">
          <p><strong>Status:</strong> <span className={`tracking-status ${delivery.del_status.toLowerCase()}`}>{delivery.del_status}</span></p>
          <p><strong>Courier:</strong> {delivery.courier_name}</p>
          <p><strong>Last Updated:</strong> {new Date(delivery.del_date).toLocaleString()}</p>
        </div>
      ) : (
        <p className="no-delivery">No delivery information available yet.</p>
      )}
    </div>
  );
};

export default DeliveryTracking;