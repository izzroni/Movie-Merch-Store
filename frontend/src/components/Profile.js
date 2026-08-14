import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/profile.css";

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [profilePic, setProfilePic] = useState(null); // For file input
  const [previewPic, setPreviewPic] = useState(""); // For previewing uploaded image
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const custId = localStorage.getItem("cust_id");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!custId || !token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/customers/${custId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(response.data);
        setPreviewPic(response.data.profile_pic ? `http://localhost:5000/uploads/${response.data.profile_pic}` : "");
      } catch (err) {
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [custId, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewPic(URL.createObjectURL(file)); // Preview the image locally
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(profile).forEach((key) => {
        if (key !== "profile_pic") formData.append(key, profile[key]); // Exclude old profile_pic
      });
      if (profilePic) formData.append("profile_pic", profilePic); // Append new profile picture if uploaded

      const response = await axios.put(`http://localhost:5000/api/customers/${custId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile(response.data); // Update with server response
      setPreviewPic(response.data.profile_pic ? `http://localhost:5000/uploads/${response.data.profile_pic}` : "");
      alert("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    }
  };

  if (loading) return <div className="pf-loading">Loading...</div>;
  if (error) return (
    <div className="pf-error">
      {error}
      <button className="pf-back-btn" onClick={() => navigate("/shop")}>Back to Shop</button>
    </div>
  );

  return (
    <div className="pf-container">
      <h2 className="pf-title">Manage Profile</h2>
      <form onSubmit={handleSubmit} className="pf-form">
        <div className="pf-profile-pic-section">
          <div className="pf-profile-pic-preview">
            {previewPic ? (
              <img src={previewPic} alt="Profile Preview" className="pf-profile-pic" />
            ) : (
              <div className="pf-profile-pic-placeholder">No Image</div>
            )}
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Profile Picture (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="pf-file-input"
            />
          </div>
        </div>
        <div className="pf-form-grid">
          <div className="pf-form-group">
            <label className="pf-label">First Name</label>
            <input
              type="text"
              name="f_name"
              value={profile.f_name || ""}
              onChange={handleChange}
              className="pf-input"
              required
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Last Name</label>
            <input
              type="text"
              name="l_name"
              value={profile.l_name || ""}
              onChange={handleChange}
              className="pf-input"
              required
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email || ""}
              onChange={handleChange}
              className="pf-input"
              required
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Phone Number</label>
            <input
              type="text"
              name="phone_number"
              value={profile.phone_number || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
          <div className="pf-form-group pf-full-width">
            <label className="pf-label">House Address</label>
            <input
              type="text"
              name="house_add"
              value={profile.house_add || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
          <div className="pf-form-group pf-full-width">
            <label className="pf-label">Area Address</label>
            <input
              type="text"
              name="area_add"
              value={profile.area_add || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">State</label>
            <input
              type="text"
              name="state"
              value={profile.state || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">City</label>
            <input
              type="text"
              name="city"
              value={profile.city || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={profile.pincode || ""}
              onChange={handleChange}
              className="pf-input"
            />
          </div>
        </div>
        <button type="submit" className="pf-submit-btn">Update Profile</button>
      </form>
    </div>
  );
};

export default Profile;