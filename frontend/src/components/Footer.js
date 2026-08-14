import React, { useState } from "react";
import { Instagram, Twitter, Facebook, Mail } from "lucide-react";
import "../styles/footer.css";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    // Placeholder for API call; replace with actual subscription logic
    setSubscribed(true);
    setEmail("");
    alert("Thank you for subscribing! Stay tuned for updates.");
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Logo and Description */}
        <div className="footer-section footer-left">
          <div className="footer-logo">
            <img
              src="/images/logo1.png"
              alt="Movie Merch Logo"
              className="footer-logo-img"
            />
          </div>
          <p className="footer-description">
            Unleash your inner hero and horror fan with our exclusive superhero
            and horror-themed merchandise.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-section footer-center">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
          <li><a href="/homepage">Home</a></li>

            <li><a href="/shop">Shop</a></li>
            <li><a href="/collections">Categories</a></li>
            <li><a href="/sales">Sale</a></li>
          </ul>
        </div>

        {/* Connect and Newsletter */}
        <div className="footer-section footer-right">
          <h4 className="footer-heading">Connect</h4>
          <div className="footer-social">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <Instagram className="footer-social-icon" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <Twitter className="footer-social-icon" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <Facebook className="footer-social-icon" />
            </a>
            <a href="mailto:support@moviemerch.com">
              <Mail className="footer-social-icon" />
            </a>
          </div>
          <div className="footer-newsletter">
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <input
                type="email"
                placeholder={subscribed ? "Subscribed!" : "Enter your email"}
                className="footer-newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={subscribed}
              />
              <button
                type="submit"
                className="footer-newsletter-button"
                disabled={subscribed}
              >
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-copyright">
        <p>© {new Date().getFullYear()} Capes and Creeps. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;