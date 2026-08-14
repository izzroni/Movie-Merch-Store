import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import "../styles/AboutUs.css";

const AboutUs = () => {
  return (
    <div className="about-us-container">
      <Navbar />
      <div className="about-us-content">
        {/* Hero Section */}
        <section className="about-hero-section">
          <div className="about-hero-background"></div>
          <div className="about-hero-text">
            <h1>
              About <span className="hero">Heroic</span> <span className="fear">Fears</span>
            </h1>
            <p>
              Unleash your inner hero with a touch of thrilling fear. We bring you epic products that blend courage and excitement, crafted for those who dare to stand out.
            </p>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="about-story-section">
          <h2 className="about-section-title">Our Story</h2>
          <p className="about-story-text">
            Founded in the shadows of 2023, Heroic Fears emerged from a passion for the extraordinary. Inspired by the duality of superheroes and the thrill of the unknown, we set out to create an e-commerce experience unlike any other. From our humble beginnings, we've grown into a sanctuary for the bold, offering curated collections that empower and excite.
          </p>
        </section>

        {/* Mission Section */}
        <section className="about-mission-section">
          <h2 className="about-section-title">Our Mission</h2>
          <p className="about-section-text">
            At Heroic Fears, we’re on a mission to deliver more than just products—we deliver experiences. Our goal is to ignite your adventurous spirit with high-quality items that reflect your unique style. Whether it’s a golden cape or a crimson mask, every piece is designed to make you feel unstoppable.
          </p>
        </section>

        {/* Team Section */}
        <section className="about-team-section">
          <h2 className="about-section-title">Meet the Team</h2>
          <div className="about-team-grid">
            <div className="about-team-member">
              <div className="about-team-image"></div>
              <h3>Ronit Stark</h3>
              <p>Founder & Visionary</p>
            </div>
            <div className="about-team-member">
              <div className="about-team-image"></div>
              <h3>Luna Crimson</h3>
              <p>Creative Director</p>
            </div>
            <div className="about-team-member">
              <div className="about-team-image"></div>
              <h3>Ethan Shade</h3>
              <p>Tech Mastermind</p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;