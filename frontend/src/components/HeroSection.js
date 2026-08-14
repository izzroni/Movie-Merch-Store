import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/hero.css";

const HeroSection = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const background = document.querySelector('.phero-background');
      const image1 = document.querySelector('.phero-image img');
      const image2 = document.querySelector('.phero-image-1 img');

      // Parallax effect for background
      background.style.transform = `translateY(${scrollPosition * 0.3}px)`;
      
      // Subtle movement for images
      image1.style.transform = `translateY(${scrollPosition * 0.03}px)`;
      image2.style.transform = `translateY(${scrollPosition * 0.05}px)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="phero-section-wrapper">
      <div className="phero-background"></div>
      <div className="phero-section">
        <div className="phero-text">
          <h1>
            Unleash the <span className="hero">HERO</span>,
            <br/>Embrace the <span className="fear">FEAR</span>
          </h1>
        
        </div>
        <div className="phero-image">
          <img src="/images/sp.jpg" alt="Spooky Promo" />
        </div>
        <div className="phero-image-1">
          <img src="/images/sp2.png" alt="Spooky Promo" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;