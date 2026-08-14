import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const custId = localStorage.getItem("cust_id");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!custId || !token) return;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/notifications/${custId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [custId, token]);

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <ul className="notifications-list">
          {notifications.map((notification) => (
            <li key={notification.id} className="notification-item">
              {notification.message} - {new Date(notification.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;