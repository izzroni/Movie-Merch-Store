"use client"

import { useState, useEffect } from "react"
import { EyeOff, Eye, Zap } from "lucide-react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../styles/loginPage.css"

const LoginSignupPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState("customer") // Added: "customer" or "courier"

  const [formData, setFormData] = useState({
    f_name: "",
    l_name: "",
    email: "",
    phone_number: "",
    password: "",
    house_add: "",
    area_add: "",
    state: "",
    city: "",
    pincode: "",
  })
  
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("token") ? true : false)
  const navigate = useNavigate()
  
  useEffect(() => {
    if (window.location.pathname === "/login" || window.location.pathname === "/") {
      const isAdmin = localStorage.getItem("isAdmin") === "true"
      const isCourier = localStorage.getItem("isCourier") === "true"
      
      if (isLoggedIn) {
        if (isAdmin) {
          navigate("/admin-dashboard")
        } else if (isCourier) {
          navigate("/courier-dashboard")
        } else {
          navigate("/homepage")
        }
      }
    }
  }, [isLoggedIn, navigate])

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    let newErrors = {};
    const nameRegex = /^[a-zA-Z]{1,15}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRegex = /^[0-9]{10}$/;
    const passwordRegex = /^.{8,100}$/;
    const addressRegex = /^.{1,50}$/;
    const areaRegex = /^.{1,40}$/;
    const stateRegex = /^.{1,12}$/;
    const cityRegex = /^.{1,15}$/;
    const pincodeRegex = /^[0-9]{6}$/;

    if (!isLogin) {
      if (!nameRegex.test(formData.f_name)) newErrors.f_name = "First name must be 1-15 letters only.";
      if (!nameRegex.test(formData.l_name)) newErrors.l_name = "Last name must be 1-15 letters only.";
      if (!emailRegex.test(formData.email) || formData.email.length > 25) 
        newErrors.email = "Email must be valid and max 25 characters.";
      if (!phoneRegex.test(formData.phone_number)) 
        newErrors.phone_number = "Phone must be exactly 10 digits.";
      if (!addressRegex.test(formData.house_add)) 
        newErrors.house_add = "House address must be 1-50 characters.";
      if (!areaRegex.test(formData.area_add)) 
        newErrors.area_add = "Area address must be 1-40 characters.";
      if (!stateRegex.test(formData.state)) 
        newErrors.state = "State must be 1-12 characters.";
      if (!cityRegex.test(formData.city)) 
        newErrors.city = "City must be 1-15 characters.";
      if (!pincodeRegex.test(formData.pincode)) 
        newErrors.pincode = "Pincode must be exactly 6 digits.";
    } else {
      if (!emailRegex.test(formData.email) || formData.email.length > 25) 
        newErrors.email = "Email must be valid and max 25 characters.";
    }
    
    if (!passwordRegex.test(formData.password)) 
      newErrors.password = "Password must be at least 8 characters.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
  
    try {
      const url = isLogin ? "http://localhost:5000/api/login" : "http://localhost:5000/api/signup";
  
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            f_name: formData.f_name,
            l_name: formData.l_name,
            email: formData.email,
            phone_number: formData.phone_number,
            password: formData.password,
            house_add: formData.house_add,
            area_add: formData.area_add,
            state: formData.state,
            city: formData.city,
            pincode: formData.pincode,
          };
  
      const response = await axios.post(url, payload);
      console.log("API Response:", response.data);
  
      if (isLogin) {
        const { token, isAdmin, isCourier, user } = response.data;
        
        // Debug logging
        console.log("User data received:", user);
        console.log("Customer ID:", user.cust_id);
  
        // Store data in localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("cust_id", user.cust_id);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
        localStorage.setItem("isCourier", isCourier ? "true" : "false");
  
        // Verify storage
        console.log("Stored cust_id:", localStorage.getItem("cust_id"));
  
        setIsLoggedIn(true);
        setLoading(false);
        
        if (isAdmin) {
          alert("Admin login successful!");
          navigate("/admin-dashboard");
        } else if (isCourier) {
          alert("Courier login successful!");
          navigate("/courier-dashboard");
        } else {
          alert("Login successful!");
          navigate("/homepage");
        }
      } else {
        alert("Account created successfully!");
        setIsLogin(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error.response?.data?.error || error.message);
      alert(error.response?.data?.error || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-overlay"></div>
      <div className="login-card">
        <div className="login-header">
          <Zap className="login-icon" size={40} />
          <h2 className="login-title">{isLogin ? "ENTER THE REALM" : "JOIN THE DARKNESS"}</h2>
        </div>

      

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="login-input"
              value={formData.email}
              onChange={handleInputChange}
              required 
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label className="login-label">First Name</label>
                <input
                  type="text"
                  name="f_name"
                  placeholder="Enter your first name"
                  className="login-input"
                  value={formData.f_name}
                  onChange={handleInputChange}
                  required
                />
                {errors.f_name && <span className="error">{errors.f_name}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">Last Name</label>
                <input
                  type="text"
                  name="l_name"
                  placeholder="Enter your last name"
                  className="login-input"
                  value={formData.l_name}
                  onChange={handleInputChange}
                  required
                />
                {errors.l_name && <span className="error">{errors.l_name}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="Enter your phone number"
                  className="login-input"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                />
                {errors.phone_number && <span className="error">{errors.phone_number}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">House Address</label>
                <input
                  type="text"
                  name="house_add"
                  placeholder="Enter your house address"
                  className="login-input"
                  value={formData.house_add}
                  onChange={handleInputChange}
                  required
                />
                {errors.house_add && <span className="error">{errors.house_add}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">Area Address</label>
                <input
                  type="text"
                  name="area_add"
                  placeholder="Enter your area address"
                  className="login-input"
                  value={formData.area_add}
                  onChange={handleInputChange}
                  required
                />
                {errors.area_add && <span className="error">{errors.area_add}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="Enter your state"
                  className="login-input"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
                {errors.state && <span className="error">{errors.state}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Enter your city"
                  className="login-input"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
                {errors.city && <span className="error">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label className="login-label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  placeholder="Enter your pincode"
                  className="login-input"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  required
                />
                {errors.pincode && <span className="error">{errors.pincode}</span>}
              </div>
            </>
          )}

          <div className="form-group relative">
            <label className="login-label">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              className="login-input"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <button type="submit" className="login-button">
            {isLogin ? "UNLEASH" : "EMERGE"}
          </button>
        </form>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}

        <div className="login-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "New to the dark side? Create Account" : "Already have a portal? Login"}
        </div>
      </div>
    </div>
  )
}

export default LoginSignupPage