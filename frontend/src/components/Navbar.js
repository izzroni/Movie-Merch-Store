import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import { ShoppingCart, Heart, Bell } from "lucide-react";
import Notifications from "./Notifications";
import axios from "axios";

const Navbar = ({ isShopPage }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profilePic, setProfilePic] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));

  const custId = localStorage.getItem("cust_id");

  useEffect(() => {
    const updateToken = () => setToken(localStorage.getItem("token"));

    const fetchProfilePic = async () => {
      if (custId && token) {
        try {
          const response = await axios.get(`http://localhost:5000/api/customers/${custId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setProfilePic(response.data.profile_pic ? `http://localhost:5000/uploads/${response.data.profile_pic}` : "");
        } catch (err) {
          console.error("Failed to fetch profile pic:", err);
        }
      }
    };

    window.addEventListener("storage", updateToken);
    fetchProfilePic();
    updateToken();

    return () => {
      window.removeEventListener("storage", updateToken);
    };
  }, [custId, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cust_id");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  };

  const isLoggedIn = !!token;
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return (
    <nav className={`navbar ${isShopPage ? "shop-page-navbar" : ""}`}>
      <div className="navbar-logo">
        <img src="/images/logo1.png" alt="Capes and Creeps Logo" />
      </div>
      <ul className="navbar-links">
        <li><Link to="/homepage">Home</Link></li>
        <li><Link to="/shop">Shop</Link></li>
        <li><Link to="/categories">Categories</Link></li>
        <li><Link to="/sales">Sale</Link></li>
        <li><Link to="/about-us">About Us</Link></li>
      </ul>
      <div className="navbar-actions">
        {isLoggedIn && !isAdmin && (
          <>
            <Link to="/wishlist" className="wishlist-link">
              <Heart size={20} />
              <span></span>
            </Link>
            <Link to="/cart" className="cart-link">
              <ShoppingCart size={20} />
              <span></span>
            </Link>
            <div className="notifications-dropdown">
              <button
                className="notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
              </button>
              {showNotifications && <Notifications />}
            </div>
          </>
        )}
        {isLoggedIn ? (
          <a href="#" onClick={handleLogout} className="logout-link">
            Log Out
          </a>
        ) : (
          <Link to="/login" className="login-link">Log In</Link>
        )}
        {isLoggedIn && !isAdmin && (
          <div className="profile-dropdown">
            <button
              className="profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="navbar-profile-pic" />
              ) : (
                <div className="navbar-profile-placeholder">P</div>
              )}
            </button>
            {showProfileDropdown && (
              <div className="profile-container">
                <Link to="/profile" className="profile-dropdown-item">
                  My Profile
                </Link>
                <Link to="/order-history" className="profile-dropdown-item">
                  Order History
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;