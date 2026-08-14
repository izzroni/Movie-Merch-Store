import React, { useState, useEffect } from "react";
import axios from "axios";
import "./SubcategoryManagement.css";

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const SubcategoryManagement = () => {
  const [formData, setFormData] = useState({ category_id: "", subcategory_name: "" });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.category_id) tempErrors.category_id = "Category is required";
    if (!formData.subcategory_name.trim()) tempErrors.subcategory_name = "Subcategory name is required";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const response = await axios.post("/api/subcategories", formData, getAuthHeaders());
        console.log("POST Response:", response.data);
        setSubcategories([
          ...subcategories,
          {
            subcategory_id: response.data.subcategoryId,
            category_id: formData.category_id,
            subcategory_name: formData.subcategory_name,
            subcat_date: new Date().toISOString(),
          },
        ]);
        setSuccessMsg("Subcategory added successfully!");
        setErrorMsg("");
        setFormData({ category_id: "", subcategory_name: "" });
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        console.error("Error adding subcategory:", error);
        setErrorMsg(error.response?.data?.error || "Error adding subcategory");
        setSuccessMsg("");
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/categories", getAuthHeaders());
      console.log("Categories fetched:", response.data);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const response = await axios.get("/api/subcategories", getAuthHeaders());
      console.log("Subcategories fetched:", response.data);
      setSubcategories(response.data);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setErrorMsg(error.response?.data?.error || "Error fetching subcategories");
    }
  };

  // Helper function to get category name from category_id
  const getCategoryName = (categoryId) => {
    if (!categories.length) return "No Categories Loaded";
    const category = categories.find((cat) => cat.category_id === categoryId);
    return category ? category.category_name : `Unknown (ID: ${categoryId})`;
  };

  // Helper function to format date or handle invalid dates
  const formatDate = (dateString) => {
    if (!dateString) return "Not Provided";
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) ? date.toLocaleDateString() : "Invalid Date";
  };

  // Edit Subcategory
  const handleEditSubcategory = async (subcategoryId, currentData) => {
    const newName = prompt("Enter new subcategory name:", currentData.subcategory_name);
    const newCategoryId = prompt("Enter new category ID:", currentData.category_id);
    if (newName && newCategoryId) {
      try {
        const response = await axios.put(
          `/api/subcategories/${subcategoryId}`,
          { category_id: newCategoryId, subcategory_name: newName },
          getAuthHeaders()
        );
        setSubcategories(
          subcategories.map((subcat) =>
            subcat.subcategory_id === subcategoryId
              ? { ...subcat, category_id: newCategoryId, subcategory_name: newName }
              : subcat
          )
        );
        setSuccessMsg(response.data.message);
        setErrorMsg("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        setErrorMsg(error.response?.data?.error || "Error updating subcategory");
        setSuccessMsg("");
      }
    }
  };

  // Delete Subcategory
  const handleDeleteSubcategory = async (subcategoryId) => {
    if (window.confirm("Are you sure you want to delete this subcategory?")) {
      try {
        const response = await axios.delete(`/api/subcategories/${subcategoryId}`, getAuthHeaders());
        setSubcategories(subcategories.filter((subcat) => subcat.subcategory_id !== subcategoryId));
        setSuccessMsg(response.data.message);
        setErrorMsg("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        setErrorMsg(error.response?.data?.error || "Error deleting subcategory");
        setSuccessMsg("");
      }
    }
  };

  return (
    <div className="subcat-management-container">
      <h1>Subcategory Management</h1>
      {successMsg && <div className="subcat-success-message">{successMsg}</div>}
      {errorMsg && <div className="subcat-error-message">{errorMsg}</div>}

      <div className="subcat-form">
        <h2>Add New Subcategory</h2>
        <form onSubmit={handleSubmit}>
          <div className="subcat-form-row">
            <div className="subcat-input-group">
              <label htmlFor="category_id">Category</label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
              {errors.category_id && <span className="subcat-error">{errors.category_id}</span>}
            </div>
            <div className="subcat-input-group">
              <label htmlFor="subcategory_name">Subcategory Name</label>
              <input
                type="text"
                id="subcategory_name"
                name="subcategory_name"
                value={formData.subcategory_name}
                onChange={handleInputChange}
                placeholder="Enter subcategory name"
              />
              {errors.subcategory_name && <span className="subcat-error">{errors.subcategory_name}</span>}
            </div>
          </div>
          <div className="subcat-form-actions">
            <button type="submit" className="subcat-add-btn">Add Subcategory</button>
          </div>
        </form>
      </div>

      <div className="subcat-table-container">
        <h2>Registered Subcategories</h2>
        {subcategories.length > 0 ? (
          <div className="subcat-table-responsive">
            <table className="subcat-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subcategory Name</th>
                  <th>Category Name</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map((subcat) => (
                  <tr key={subcat.subcategory_id}>
                    <td>{subcat.subcategory_id}</td>
                    <td>{subcat.subcategory_name}</td>
                    <td>{getCategoryName(subcat.category_id)}</td>
                    <td>{formatDate(subcat.subcat_date)}</td>
                    <td>
                      <button
                        onClick={() => handleEditSubcategory(subcat.subcategory_id, subcat)}
                        className="subcat-edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubcategory(subcat.subcategory_id)}
                        className="subcat-delete-btn"
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
          <div className="subcat-no-data">No subcategories found</div>
        )}
      </div>
    </div>
  );
};

export default SubcategoryManagement;