import { Link } from "react-router-dom";
import "../styles/home.css";

import archeioLogo from '../assets/archeiologo.png';

export default function Home({ logo }) {
  const currentLogo = logo || archeioLogo
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <img src={currentLogo} alt="ArcheIO Logo" style={{ width: '100%', height: '50px' }} />
          {/* <div className="brand-icon">DMS</div>
          <div>
            <h1>ArcheIO</h1>
            <span>Document Management System</span>
          </div> */}
        </div>

        <Link to="/login" className="login-btn">
          Login
        </Link>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">Secure • Organized • OCR Ready</div>

          <h2>
            Efficient Document Management with Archiving and OCR
          </h2>

          <p>
            A streamlined platform designed to manage document filing, routing,
            approvals, archiving, and OCR-based search in a secure and organized environment.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="primary-btn">
              Get Started
            </Link>

            <a href="#features" className="secondary-btn">
              View Features
            </a>
          </div>
        </div>

        <div className="hero-banner">
          <div className="banner-card main-card">
            <div className="card-top">
              <span>Document Overview</span>
              <strong>Active</strong>
            </div>

            <div className="document-row">
              <div></div>
              <span>Administrative Case</span>
              <small>For Approval</small>
            </div>

            <div className="document-row">
              <div></div>
              <span>Inspection Report</span>
              <small>Archived</small>
            </div>

            <div className="document-row">
              <div></div>
              <span>Agency Order</span>
              <small>OCR Indexed</small>
            </div>
          </div>

          <div className="floating-card top">
            <strong>1,248</strong>
            <span>Total Documents</span>
          </div>

          <div className="floating-card bottom">
            <strong>OCR</strong>
            <span>Searchable Files</span>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div>
          <h3>99%</h3>
          <p>Faster retrieval</p>
        </div>

        <div>
          <h3>24/7</h3>
          <p>Document access</p>
        </div>

        <div>
          <h3>OCR</h3>
          <p>Smart searching</p>
        </div>

        <div>
          <h3>Secure</h3>
          <p>Role-based access</p>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span>Core Features</span>
          <h2>Built for reliable document operations</h2>
          <p>
            Everything your office needs to organize, process, and preserve
            important records.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3>Document Tracking</h3>
            <p>
              Monitor document movement, status, ownership, and routing history
              from one centralized dashboard.
            </p>
          </div>

          <div className="feature-card">
            <h3>OCR Search</h3>
            <p>
              Convert scanned files into searchable text for faster document
              discovery and retrieval.
            </p>
          </div>

          <div className="feature-card">
            <h3>Archiving</h3>
            <p>
              Store old and completed documents securely with retention period
              support.
            </p>
          </div>

          <div className="feature-card">
            <h3>Master Data</h3>
            <p>
              Manage categories, classifications, document types, departments,
              actions, and instructions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}