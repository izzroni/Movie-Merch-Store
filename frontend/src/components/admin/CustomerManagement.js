import React, { useState, useEffect } from "react";
import "./adminDashboard.css";
import api from "./api";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    let filtered = customers;

    // Status filter
    if (filterStatus !== "All") {
      filtered = filtered.filter(customer => customer.cust_status === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        `${customer.f_name} ${customer.l_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.cust_id.toString().includes(searchTerm)
      );
    }

    // Date filter (assuming a date field like `created_at` exists in tbl_customers)
    if (startDate) {
      filtered = filtered.filter(customer => 
        new Date(customer.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(customer => 
        new Date(customer.created_at) <= new Date(endDate)
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, filterStatus, searchTerm, startDate, endDate]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/api/customers");
      setCustomers(response.data);
      setFilteredCustomers(response.data);
      setErrorMsg("");
    } catch (error) {
      console.error("Error fetching customers:", error);
      setErrorMsg(error.response?.data?.error || "Error fetching customers");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (custId, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await api.put(`/api/customers/${custId}/status`, { status: newStatus });
      setCustomers(
        customers.map((customer) =>
          customer.cust_id === custId ? { ...customer, cust_status: newStatus } : customer
        )
      );
      setSuccessMsg("Status updated successfully!");
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error updating status:", error);
      setErrorMsg(error.response?.data?.error || "Error updating status");
    }
  };

  if (loading) return <div>Loading customers...</div>;
  if (errorMsg && !customers.length) return <div className="error-message">{errorMsg}</div>;

  return (
    <div className="customer-management-container">
      <h1>Customer Management</h1>
      {successMsg && <div className="success-message">{successMsg}</div>}
      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <div className="filter-container">
        <div className="filter-group">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
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

      <div className="couriers-table-container">
        <h2>Customer List</h2>
        {filteredCustomers.length === 0 ? (
          <div className="no-data">No customers found</div>
        ) : (
          <div className="table-responsive">
            <table className="couriers-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.cust_id}>
                    <td>{customer.cust_id}</td>
                    <td>{`${customer.f_name} ${customer.l_name || ""}`.trim()}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone_number || "N/A"}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          customer.cust_status === "Active" ? "active" : "inactive"
                        }`}
                      >
                        {customer.cust_status}
                      </span>
                    </td>
                    <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`status-btn ${
                            customer.cust_status === "Active" ? "deactivate" : "activate"
                          }`}
                          onClick={() =>
                            handleStatusChange(customer.cust_id, customer.cust_status)
                          }
                        >
                          {customer.cust_status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;