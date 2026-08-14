import React, { useState, useEffect } from "react";
import "./adminDashboard.css";
import api from "./api"; // Adjust the import path based on your project structure

const CourierManagement = () => {
  const [formData, setFormData] = useState({
    courier_name: "",
    courier_email: "",
    phone_number: "",
    courier_state: "",
  });
  const [passwordMap, setPasswordMap] = useState({});
  const [couriers, setCouriers] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(null);

  useEffect(() => {
    const savedPasswords = localStorage.getItem('courierPasswords');
    if (savedPasswords) {
      const parsedPasswords = JSON.parse(savedPasswords);
      setPasswordMap(parsedPasswords);
    }
    fetchCouriers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.courier_name.trim()) tempErrors.courier_name = "Name is required";
    if (!formData.courier_email.trim()) {
      tempErrors.courier_email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.courier_email)) {
      tempErrors.courier_email = "Email is invalid";
    }
    if (!formData.phone_number.trim()) {
      tempErrors.phone_number = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      tempErrors.phone_number = "Phone number must be 10 digits";
    }
    if (!formData.courier_state.trim()) tempErrors.courier_state = "State is required";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const togglePasswordVisibility = (courierId) => {
    setVisiblePassword(visiblePassword === courierId ? null : courierId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const generatedPassword = generatePassword();
        const courierData = { ...formData, courier_password: generatedPassword, status: "Active" };
        const response = await api.post("/api/couriers", courierData);

        const newCourierId = response.data.courier_id;
        const newPasswordMap = { ...passwordMap, [newCourierId]: generatedPassword };
        setPasswordMap(newPasswordMap);
        localStorage.setItem('courierPasswords', JSON.stringify(newPasswordMap));

        setCouriers([...couriers, { ...response.data, plain_password: generatedPassword }]);
        setSuccessMsg("Courier added successfully!");
        setErrorMsg("");
        setFormData({ courier_name: "", courier_email: "", phone_number: "", courier_state: "" });
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        console.error("Error adding courier:", error);
        setErrorMsg(error.response?.data?.message || "Error adding courier");
        setSuccessMsg("");
      }
    }
  };

  const handleStatusChange = async (courierId, newStatus) => {
    try {
      await api.patch(`/api/couriers/${courierId}`, { status: newStatus });
      setCouriers(couriers.map(courier => 
        courier.courier_id === courierId ? { ...courier, status: newStatus } : courier
      ));
      setSuccessMsg("Status updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error updating status:", error);
      setErrorMsg(error.response?.data?.message || "Error updating status");
    }
  };

  const fetchCouriers = async () => {
    try {
      const response = await api.get("/api/couriers");
      const fetchedCouriers = response.data;
      const savedPasswords = JSON.parse(localStorage.getItem('courierPasswords')) || {};
      const couriersWithPasswords = fetchedCouriers.map(courier => ({
        ...courier,
        plain_password: savedPasswords[courier.courier_id] || "Not Set"
      }));
      setCouriers(couriersWithPasswords);
    } catch (error) {
      console.error("Error fetching couriers:", error);
      setErrorMsg(error.response?.data?.message || "Error fetching couriers");
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  return (
    <div className="courier-management-container">
      <h1>Courier Management</h1>
      {successMsg && <div className="success-message">{successMsg}</div>}
      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <div className="courier-form">
        <h2>Add New Courier</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="courier_name">Courier Name</label>
              <input type="text" id="courier_name" name="courier_name" value={formData.courier_name} onChange={handleInputChange} placeholder="Enter courier name" />
              {errors.courier_name && <span className="error">{errors.courier_name}</span>}
            </div>
            <div className="input-group">
              <label htmlFor="courier_email">Email Address</label>
              <input type="email" id="courier_email" name="courier_email" value={formData.courier_email} onChange={handleInputChange} placeholder="Enter email address" />
              {errors.courier_email && <span className="error">{errors.courier_email}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input type="text" id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleInputChange} placeholder="Enter 10-digit phone number" />
              {errors.phone_number && <span className="error">{errors.phone_number}</span>}
            </div>
            <div className="input-group">
              <label htmlFor="courier_state">State</label>
              <input type="text" id="courier_state" name="courier_state" value={formData.courier_state} onChange={handleInputChange} placeholder="Enter state" />
              {errors.courier_state && <span className="error">{errors.courier_state}</span>}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="add-btn">Add Courier</button>
          </div>
        </form>
      </div>

      <div className="couriers-table-container">
        <h2>Registered Couriers</h2>
        {couriers.length > 0 ? (
          <div className="table-responsive">
            <table className="couriers-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th>Password</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((courier) => (
                  <tr key={courier.courier_id}>
                    <td>{courier.courier_id}</td>
                    <td>{courier.courier_name}</td>
                    <td>{courier.courier_email}</td>
                    <td>{courier.phone_number}</td>
                    <td>{courier.courier_state || "N/A"}</td>
                    <td>
                      <div className="password-display clickable" onClick={() => togglePasswordVisibility(courier.courier_id)}>
                        {visiblePassword === courier.courier_id ? (
                          <>
                            <span>{courier.plain_password}</span>
                            <small>(Click to hide)</small>
                          </>
                        ) : (
                          <>
                            <span>••••••••••</span>
                            <small>(Click to show)</small>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${courier.status.toLowerCase()}`}>
                        {courier.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {courier.status === "Active" ? (
                          <button className="status-btn deactivate" onClick={() => handleStatusChange(courier.courier_id, "Inactive")}>
                            Deactivate
                          </button>
                        ) : (
                          <button className="status-btn activate" onClick={() => handleStatusChange(courier.courier_id, "Active")}>
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No couriers found</div>
        )}
      </div>
    </div>
  );
};

export default CourierManagement;