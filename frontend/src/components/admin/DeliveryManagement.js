import React, { useState, useEffect } from "react";
import axios from "axios";
import "./DeliveryManagement.css";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    let filtered = deliveries;

    // Status filter
    if (filterStatus !== "All") {
      filtered = filtered.filter(delivery => delivery.del_status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(delivery => 
        delivery.courier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.del_id.toString().includes(searchTerm) ||
        delivery.cassign_id.toString().includes(searchTerm)
      );
    }

    // Date filter
    if (startDate) {
      filtered = filtered.filter(delivery => 
        new Date(delivery.del_date) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(delivery => 
        new Date(delivery.del_date) <= new Date(endDate)
      );
    }

    setFilteredDeliveries(filtered);
  }, [deliveries, filterStatus, searchTerm, startDate, endDate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
  };

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get("/api/deliveries", getAuthHeaders());
      setDeliveries(response.data);
      setFilteredDeliveries(response.data);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      setErrorMsg(error.response?.data?.message || "Error fetching deliveries");
    }
  };

  return (
    <div className="del-management-container">
      <h1>Delivery Management</h1>
      {successMsg && <div className="del-success-message">{successMsg}</div>}
      {errorMsg && <div className="del-error-message">{errorMsg}</div>}

      <div className="filter-container">
        <div className="filter-group">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by courier, delivery ID, or assignment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group date-filter">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
        </div>
      </div>

      <div className="del-table-container">
        <h2>Current Deliveries</h2>
        {filteredDeliveries.length > 0 ? (
          <div className="del-table-responsive">
            <table className="del-table">
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Assignment ID</th>
                  <th>Cart Master ID</th>
                  <th>Courier Name</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.del_id}>
                    <td>{delivery.del_id}</td>
                    <td>{delivery.cassign_id}</td>
                    <td>{delivery.cart_master_id}</td>
                    <td>{delivery.courier_name}</td>
                    <td>
                      <span className={`del-status-badge ${delivery.del_status.toLowerCase()}`}>
                        {delivery.del_status}
                      </span>
                    </td>
                    <td>{new Date(delivery.del_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="del-no-data">No deliveries found</div>
        )}
      </div>
    </div>
  );
};

export default DeliveryManagement;