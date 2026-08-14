import React, { useState, useEffect } from "react";
import axios from "axios";
import { saveAs } from "file-saver"; // Import file-saver for CSV export
import "./FeedbackManagement.css";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filters, setFilters] = useState({ rating: "", startDate: "", endDate: "" });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const fetchFeedbacks = async () => {
    try {
      const params = {};
      if (filters.rating) params.rating = filters.rating;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await axios.get("/api/feedback", { ...getAuthHeaders(), params });
      setFeedbacks(response.data);
      setErrorMsg("");
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      setErrorMsg(error.response?.data?.error || "Error fetching feedbacks");
      setSuccessMsg("");
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        const response = await axios.delete(`/api/feedback/${feedbackId}`, getAuthHeaders());
        setFeedbacks(feedbacks.filter(fb => fb.feedback_id !== feedbackId));
        setSuccessMsg(response.data.message);
        setErrorMsg("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        console.error("Error deleting feedback:", error);
        setErrorMsg(error.response?.data?.error || "Error deleting feedback");
        setSuccessMsg("");
      }
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  const exportToCSV = () => {
    if (feedbacks.length === 0) {
      setErrorMsg("No feedback data to export.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    // Define CSV headers
    const headers = ["ID", "Customer", "Item", "Feedback", "Rating", "Date"];
    const csvRows = feedbacks.map(feedback => [
      feedback.feedback_id,
      `"${feedback.customer_name} (${feedback.cust_id})"`, // Wrap in quotes to handle commas
      `"${feedback.item_name} (${feedback.item_id})"`,
      `"${feedback.feedback_text}"`,
      feedback.rating,
      new Date(feedback.fb_date).toLocaleDateString(),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `feedback_export_${new Date().toISOString().slice(0, 10)}.csv`;
    saveAs(blob, filename);

    setSuccessMsg("Feedback exported to CSV successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="fb-management-container">
      <h1>Feedback Management</h1>
      {successMsg && <div className="fb-success-message">{successMsg}</div>}
      {errorMsg && <div className="fb-error-message">{errorMsg}</div>}

      <div className="fb-filter-form">
        <h2>Filter Feedback</h2>
        <form onSubmit={applyFilters}>
          <div className="fb-form-row">
            <div className="fb-input-group">
              <label htmlFor="rating">Rating</label>
              <select
                id="rating"
                name="rating"
                value={filters.rating}
                onChange={handleFilterChange}
              >
                <option value="">All Ratings</option>
                {[1, 2, 3, 4, 5].map(r => (
                  <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div className="fb-input-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="fb-input-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div className="fb-form-actions">
            <button type="submit" className="fb-filter-btn">Apply Filters</button>
          </div>
        </form>
      </div>

      <div className="fb-table-container">
        <div className="fb-table-header">
          <h2>Feedback List</h2>
          <button className="fb-export-btn" onClick={exportToCSV}>Export to CSV</button>
        </div>
        {feedbacks.length > 0 ? (
          <div className="fb-table-responsive">
            <table className="fb-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Feedback</th>
                  <th>Rating</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((feedback) => (
                  <tr key={feedback.feedback_id}>
                    <td>{feedback.feedback_id}</td>
                    <td>{feedback.customer_name} ({feedback.cust_id})</td>
                    <td>{feedback.item_name} ({feedback.item_id})</td>
                    <td>{feedback.feedback_text}</td>
                    <td>{feedback.rating} ★</td>
                    <td>{new Date(feedback.fb_date).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => handleDeleteFeedback(feedback.feedback_id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="fb-no-data">No feedback found</div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManagement;