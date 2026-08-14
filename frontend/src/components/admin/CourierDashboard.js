import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api"; // Adjust the import path
import "./courierDashboard.css";

const CourierDashboard = () => {
  const [courier, setCourier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [deliveries, setDeliveries] = useState({});
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const isCourier = localStorage.getItem("isCourier") === "true";

      if (!token || !isCourier) {
        navigate("/login");
        return;
      }

      const userData = JSON.parse(localStorage.getItem("user"));
      if (userData && userData.courier_id) {
        setCourier(userData);
        loadAssignments(token);
        loadCourierDeliveries(token);
      } else {
        setError("User data incomplete. Please log in again.");
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/courier/assignments");
      setAssignments(response.data);
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load assignments");
      setLoading(false);
    }
  };

  const loadCourierDeliveries = async () => {
    try {
      const response = await api.get("/api/courier/deliveries");
      const deliveryMap = response.data.reduce((acc, delivery) => {
        acc[delivery.cassign_id] = delivery;
        return acc;
      }, {});
      setDeliveries(deliveryMap);
    } catch (error) {
      console.error("Error loading courier deliveries:", error);
      setError("Failed to load deliveries");
    }
  };

  const initiateDelivery = async (cassign_id) => {
    try {
      const response = await api.post("/api/delivery", { cassign_id });
      setDeliveries((prev) => ({
        ...prev,
        [cassign_id]: {
          del_id: response.data.del_id,
          cassign_id,
          del_status: "Pending",
          del_date: new Date().toISOString(),
        },
      }));
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to initiate delivery");
    }
  };

  const updateDeliveryStatus = async (del_id, cassign_id, newStatus) => {
    try {
      await api.patch(`/api/delivery/${del_id}`, { del_status: newStatus });
      setDeliveries((prev) => ({
        ...prev,
        [cassign_id]: {
          ...prev[cassign_id],
          del_status: newStatus,
          del_date: new Date().toISOString(),
        },
      }));
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update delivery status");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isCourier");
    localStorage.removeItem("cust_id");
    navigate("/");
  };

  const handleRefresh = () => {
    loadAssignments();
    loadCourierDeliveries();
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="courier-dashboard">
      <header className="dashboard-header">
        <h1>Courier Dashboard</h1>
        <div className="user-info">
          {courier && (
            <span>
              Welcome, {courier.f_name} (ID: {courier.courier_id})
            </span>
          )}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="assignments-section">
          <div className="section-header">
            <h2>Your Delivery Assignments</h2>
            <button className="refresh-btn" onClick={handleRefresh}>Refresh</button>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="no-assignments">
              <p>No current delivery assignments</p>
            </div>
          ) : (
            <div className="assignments-list">
              {assignments.map((assignment) => {
                const totalAmount =
                  assignment.cart_tot_amt != null && !isNaN(Number(assignment.cart_tot_amt))
                    ? Number(assignment.cart_tot_amt).toFixed(2)
                    : "0.00";
                const delivery = deliveries[assignment.cassign_id];

                return (
                  <div key={assignment.cassign_id} className="assignment-card">
                    <h3>Order #{assignment.cart_master_id}</h3>
                    <div className="assignment-details">
                      <p>
                        <strong>Customer:</strong> {assignment.customer_first_name}{" "}
                        {assignment.customer_last_name}
                      </p>
                      <p><strong>Delivery Address:</strong> {assignment.delivery_address}</p>
                      <p><strong>Total Amount:</strong> ₹{totalAmount}</p>
                      <p><strong>Assigned On:</strong> {new Date(assignment.cassign_date).toLocaleString()}</p>
                      {delivery && (
                        <p><strong>Delivery Status:</strong> {delivery.del_status}</p>
                      )}
                    </div>
                    <div className="assignment-actions">
                      {!delivery ? (
                        <button
                          className="action-btn"
                          onClick={() => initiateDelivery(assignment.cassign_id)}
                        >
                          Start Delivery
                        </button>
                      ) : delivery.del_status === "Pending" ? (
                        <button
                          className="action-btn"
                          onClick={() => updateDeliveryStatus(delivery.del_id, assignment.cassign_id, "Delivered")}
                        >
                          Mark as Delivered
                        </button>
                      ) : (
                        <p>Delivery Completed</p>
                      )}
                      <button className="action-btn">View Details</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CourierDashboard;