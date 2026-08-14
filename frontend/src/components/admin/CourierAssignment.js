import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CourierAssignment.css";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const CourierAssignment = () => {
  const [formData, setFormData] = useState({ courier_id: "" });
  const [payments, setPayments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchPayments();
    fetchAssignments();
    fetchCouriers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.courier_id) tempErrors.courier_id = "Courier selection is required";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
  };

  const fetchPayments = async () => {
    try {
      const response = await axios.get("/api/payments/pending", getAuthHeaders());
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      setErrorMsg(error.response?.data?.message || "Error fetching pending payments");
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get("/api/courier-assignments", getAuthHeaders());
      setAssignments(response.data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setErrorMsg(error.response?.data?.message || "Error fetching assignments");
    }
  };

  const fetchCouriers = async () => {
    try {
      const response = await axios.get("/api/couriers", getAuthHeaders());
      setCouriers(response.data);
    } catch (error) {
      console.error("Error fetching couriers:", error);
      setErrorMsg(error.response?.data?.message || "Error fetching couriers");
    }
  };

  const handleAssign = async (paymentId, cartMasterId) => {
    if (validateForm()) {
      try {
        const response = await axios.post(
          "/api/courier-assignments",
          { cart_master_id: cartMasterId, courier_id: formData.courier_id },
          getAuthHeaders()
        );
        setPayments(payments.filter(p => p.payment_id !== paymentId));
        setAssignments([...assignments, {
          cassign_id: response.data.cassign_id,
          cart_master_id: cartMasterId,
          courier_name: couriers.find(c => c.courier_id === parseInt(formData.courier_id)).courier_name,
          cassign_date: new Date()
        }]);
        setSuccessMsg("Courier assigned successfully!");
        setErrorMsg("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        console.error("Error assigning courier:", error);
        setErrorMsg(error.response?.data?.message || "Error assigning courier");
        setSuccessMsg("");
      }
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await axios.delete(`/api/courier-assignments/${assignmentId}`, getAuthHeaders());
        setAssignments(assignments.filter(a => a.cassign_id !== assignmentId));
        setSuccessMsg("Assignment deleted successfully!");
        setErrorMsg("");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchPayments(); // Refresh pending payments
      } catch (error) {
        console.error("Error deleting assignment:", error);
        setErrorMsg(error.response?.data?.message || "Error deleting assignment");
        setSuccessMsg("");
      }
    }
  };

  return (
    <div className="cassign-management-container">
      <h1>Courier Assignment</h1>
      {successMsg && <div className="cassign-success-message">{successMsg}</div>}
      {errorMsg && <div className="cassign-error-message">{errorMsg}</div>}

      <div className="cassign-form">
        <h2>Select Courier</h2>
        <div className="cassign-input-group">
          <label htmlFor="courier_id">Select Courier</label>
          <select
            id="courier_id"
            name="courier_id"
            value={formData.courier_id}
            onChange={handleInputChange}
          >
            <option value="">Select a courier</option>
            {couriers.map(courier => (
              <option key={courier.courier_id} value={courier.courier_id}>
                {courier.courier_name} ({courier.courier_id})
              </option>
            ))}
          </select>
          {errors.courier_id && <span className="cassign-error">{errors.courier_id}</span>}
        </div>
      </div>

      <div className="cassign-table-container">
        <h2>Completed Payments Awaiting Assignment</h2>
        {payments.length > 0 ? (
          <div className="cassign-table-responsive">
            <table className="cassign-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Cart Master ID</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{payment.payment_id}</td>
                    <td>{payment.cart_master_id}</td>
                    <td>₹{Number(payment.amount).toFixed(2)}</td>
                    <td>{new Date(payment.payment_date).toLocaleString()}</td>
                    <td>
                      <span className={`cassign-status-badge ${payment.status.toLowerCase()}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleAssign(payment.payment_id, payment.cart_master_id)}
                        className="cassign-action-btn"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cassign-no-data">No payments awaiting assignment</div>
        )}
      </div>

      <div className="cassign-table-container">
        <h2>Current Assignments</h2>
        {assignments.length > 0 ? (
          <div className="cassign-table-responsive">
            <table className="cassign-table">
              <thead>
                <tr>
                  <th>Assignment ID</th>
                  <th>Cart Master ID</th>
                  <th>Courier Name</th>
                  <th>Assignment Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.cassign_id}>
                    <td>{assignment.cassign_id}</td>
                    <td>{assignment.cart_master_id}</td>
                    <td>{assignment.courier_name}</td>
                    <td>{new Date(assignment.cassign_date).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.cassign_id)}
                        className="cassign-delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cassign-no-data">No current assignments</div>
        )}
      </div>
    </div>
  );
};

export default CourierAssignment;