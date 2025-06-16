// Landing.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, Shield, ArrowRight } from 'react-feather';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Welcome to AidConnect</h1>
        <p className="hero-subtitle">
          Connecting those in need with those who can help. Join our community
          to make a difference in people's lives.
        </p>
        <div className="hero-buttons">
          <Link to="/signup" className="btn primary">
            Get Started <ArrowRight className="icon" />
          </Link>
          <Link to="/login" className="btn secondary">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-circle"><Heart /></div>
            <h3 className="feature-title">Request Help</h3>
            <p>Create a request for the assistance you need. Our community is ready to help.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle"><Users /></div>
            <h3 className="feature-title">Connect</h3>
            <p>Get matched with volunteers who can provide the help you need.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle"><Shield /></div>
            <h3 className="feature-title">Safe & Secure</h3>
            <p>Our platform ensures safe and verified interactions between requesters and volunteers.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Make a Difference?</h2>
        <p>Join our community today and start helping others.</p>
        <Link to="/signup" className="btn outline">
          Sign Up Now <ArrowRight className="icon" />
        </Link>
      </section>
    </div>
  );
};

export default Landing;
