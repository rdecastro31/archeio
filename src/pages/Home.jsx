import { Link } from "react-router-dom";
import "../styles/home.css";
import archeioLogo from "../assets/archeiologo.png";

export default function Home({ logo }) {
  const currentLogo = logo || archeioLogo;

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <img src={currentLogo} alt="ArcheIO Logo" />
        </div>

        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <Link to="/login" className="login-btn">
            Login
          </Link>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-glow"></div>

        <div className="hero-content">
          <div className="hero-badge">
            AI-Powered • OCR Search • Secure Routing
          </div>

          <h1>
            Smart Document Management with{" "}
            <span>OCR & AI Review</span>
          </h1>

          <p>
            ArcheIO helps organizations file, route, approve, archive, and
            review documents faster through OCR-powered search, intelligent
            document review, and secure role-based workflows.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="primary-btn">
              Get Started
            </Link>

           
          </div>

          <div className="hero-highlights">
            <div>
              <strong>99%</strong>
              <span>Faster retrieval</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Secure access</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>Document review</span>
            </div>
          </div>
        </div>

        <div className="hero-dashboard">
          <div className="home-dashboard-card">
            <div className="dashboard-header">
              <div>
                <span>Document Intelligence</span>
                <h3>Live Overview</h3>
              </div>
              <small>Active</small>
            </div>

            <div className="search-preview">
              <span>Search scanned documents...</span>
              <strong>OCR</strong>
            </div>

            <div className="document-list">
              <div className="document-item">
                <div className="doc-icon blue"></div>
                <div>
                  <strong>Administrative Case</strong>
                  <span>Pending AI Review</span>
                </div>
                <small>For Approval</small>
              </div>

              <div className="document-item">
                <div className="doc-icon green"></div>
                <div>
                  <strong>Inspection Report</strong>
                  <span>OCR Indexed</span>
                </div>
                <small>Archived</small>
              </div>

              <div className="document-item">
                <div className="doc-icon violet"></div>
                <div>
                  <strong>Agency Order</strong>
                  <span>Routed to Department</span>
                </div>
                <small>In Progress</small>
              </div>
            </div>
          </div>

          <div className="floating-card top">
            <strong>1,248</strong>
            <span>Total Documents</span>
          </div>

          <div className="floating-card bottom">
            <strong>AI</strong>
            <span>Review Ready</span>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span>Core Features</span>
          <h2>Modern tools for reliable document operations</h2>
          <p>
            Manage records, approvals, routing, OCR search, and AI-assisted
            document review in one secure platform.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <span>01</span>
            <h3>Document Tracking</h3>
            <p>
              Track document status, routing history, ownership, and pending
              actions from a centralized dashboard.
            </p>
          </div>

          <div className="feature-card">
            <span>02</span>
            <h3>OCR Search</h3>
            <p>
              Convert scanned files into searchable text so teams can retrieve
              records quickly and accurately.
            </p>
          </div>

          <div className="feature-card">
            <span>03</span>
            <h3>AI Document Review</h3>
            <p>
              Assist users in reviewing content, identifying important details,
              and improving document processing speed.
            </p>
          </div>

          <div className="feature-card">
            <span>04</span>
            <h3>Secure Archiving</h3>
            <p>
              Preserve completed documents with retention support, access
              control, and organized storage.
            </p>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div>
          <span>Workflow</span>
          <h2>From filing to archiving, everything stays traceable.</h2>
        </div>

        <div className="workflow-steps">
          <div>Upload</div>
          <div>OCR Index</div>
          <div>AI Review</div>
          <div>Route</div>
          <div>Approve</div>
          <div>Archive</div>
        </div>
      </section>
    </div>
  );
}