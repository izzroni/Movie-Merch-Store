import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import HeroCarousel from "./HeroCarousel";
import HeroSection from "./HeroSection";
import Footer from "./Footer";
import "../styles/homePage.css";


const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // If no token is found, redirect to login page
      navigate("/");
    }
  }, [navigate]);

  return (
    <div>
      <Navbar />
      <HeroCarousel />
      <HeroSection />
      <Footer />
    </div>
  );
};

export default HomePage;
