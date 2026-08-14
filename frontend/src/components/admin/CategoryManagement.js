import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CategoryManagement.css"; // Unique CSS file

axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const CategoryManagement = () => {
  const [formData, setFormData] = useState({ category_name: "" });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.category_name.trim()) tempErrors.category_name = "Category name is required";
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
        const response = await axios.post("/api/categories", formData, getAuthHeaders());
        setCategories([...categories, { category_id: response.data.categoryId, category_name: formData.category_name, cat_date: new Date() }]);
        setSuccessMsg("Category added successfully!");
        setErrorMsg("");
        setFormData({ category_name: "" });
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        console.error("Error adding category:", error);
        setErrorMsg(error.response?.data?.error || "Error adding category");
        setSuccessMsg("");
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/categories", getAuthHeaders());
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setErrorMsg(error.response?.data?.error || "Error fetching categories");
    }
  };

  const handleEditCategory = async (categoryId, newName) => {
    try {
      const response = await axios.put(`/api/categories/${categoryId}`, { category_name: newName }, getAuthHeaders());
      setCategories(categories.map(cat => cat.category_id === categoryId ? { ...cat, category_name: newName } : cat));
      setSuccessMsg(response.data.message);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Error updating category");
    }
  };
  
  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await axios.delete(`/api/categories/${categoryId}`, getAuthHeaders());
        setCategories(categories.filter(cat => cat.category_id !== categoryId));
        setSuccessMsg(response.data.message);
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (error) {
        setErrorMsg(error.response?.data?.error || "Error deleting category");
      }
    }
  };

  return (
    <div className="cat-management-container">
      <h1>Category Management</h1>
      {successMsg && <div className="cat-success-message">{successMsg}</div>}
      {errorMsg && <div className="cat-error-message">{errorMsg}</div>}

      <div className="cat-form">
        <h2>Add New Category</h2>
        <form onSubmit={handleSubmit}>
          <div className="cat-form-row">
            <div className="cat-input-group">
              <label htmlFor="category_name">Category Name</label>
              <input
                type="text"
                id="category_name"
                name="category_name"
                value={formData.category_name}
                onChange={handleInputChange}
                placeholder="Enter category name"
              />
              {errors.category_name && <span className="cat-error">{errors.category_name}</span>}
            </div>
          </div>
          <div className="cat-form-actions">
            <button type="submit" className="cat-add-btn">Add Category</button>
          </div>
        </form>
      </div>

      <div className="cat-table-container">
        <h2>Registered Categories</h2>
        {categories.length > 0 ? (
          <div className="cat-table-responsive">
           <table className="cat-table">
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Date Added</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {categories.map((category) => (
      <tr key={category.category_id}>
        <td>{category.category_id}</td>
        <td>{category.category_name}</td>
        <td>{new Date(category.cat_date).toLocaleDateString()}</td>
        <td>
          <button onClick={() => {
            const newName = prompt("Enter new category name:", category.category_name);
            if (newName) handleEditCategory(category.category_id, newName);
          }}>Edit</button>
          <button onClick={() => handleDeleteCategory(category.category_id)}>Delete</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        ) : (
          <div className="cat-no-data">No categories found</div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;