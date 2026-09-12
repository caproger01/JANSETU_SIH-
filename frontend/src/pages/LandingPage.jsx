import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileEdit,
  Handshake,
  Cog,
  CheckCircle2,
  Users,
  GraduationCap,
  Briefcase,
  Landmark
} from 'lucide-react';
import '../styles/style.css';

export default function LandingPage() {
  const toggleMenu = () => {
    const nav = document.getElementById('navLinks');
    if (nav) {
      nav.classList.toggle('active');
    }
  };

  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="top-links">
          <a href="#main">Skip to Main Content</a>
          <span>|</span>
          <a href="#">Screen Reader Access</a>
          <span>|</span>
          <button>A-</button>
          <button>A</button>
          <button>A+</button>
          <span>|</span>
          <button>◐</button>
          <span>|</span>
          <a href="#">English</a>
          <span>|</span>
          <a href="#">Hindi</a>
        </div>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="container header-content">
          <div className="logo-area">
            <div className="logo">🇮🇳</div>
            <div className="logo-text">
              <h1>JanSetu</h1>
              <p>Government Civic Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="nav">
        <div className="container nav-content">
          <button className="menu-button" onClick={toggleMenu}>☰</button>
          <div className="nav-links" id="navLinks">
            <a href="#home" className="active">Home</a>
            <Link to="/login">Citizens</Link>
            <Link to="/login">Universities</Link>
            <Link to="/login">Industry</Link>
            <Link to="/login">Government</Link>
            <a href="#challenges">Challenges</a>
            <a href="#process">Projects</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <Link to="/login" style={{ color: '#ffffff', background: '#00563F', padding: '6px 14px', borderRadius: '4px', border: '1px solid #ffffff' }}>
              Portal Login
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main id="main">

        {/* HERO */}
        <section className="hero" id="home">
          <div className="hero-overlay"></div>
          <div className="container">
            <div className="hero-content">
              <h2>Turn Community Problems Into Real-World Solutions.</h2>
              <p>Identify, collaborate, and implement civic solutions for a better future.</p>
              <div className="hero-buttons">
                <Link to="/login" className="button button-white">Report a Problem</Link>
                <a href="#process" className="button button-outline">Explore Solutions</a>
              </div>
            </div>
          </div>
        </section>

        {/* CHALLENGES */}
        <section className="challenge-section" id="challenges">
          <div className="container">
            <div className="challenge-box">
              <h2 className="section-title">Active Community Challenges</h2>
              <div className="table-container">
                <table className="challenge-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>District</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'CHL-001', title: 'Urban Drainage Overflow Mitigation', district: 'Ranchi', category: 'Infrastructure', deadline: '15 Nov 2024' },
                      { id: 'CHL-002', title: 'Urban Drainage Overflow Mitigation', district: 'Panamranga', category: 'Infrastructure', deadline: '15 Nov 2024' },
                      { id: 'CHL-003', title: 'Urban Drainage Perling', district: 'Agra', category: 'Infrastructure', deadline: '15 Nov 2024' },
                      { id: 'CHL-004', title: 'Urban Drainage Overflow Mitigation', district: 'Ranchi', category: 'Infrastructure', deadline: '15 Nov 2024' },
                    ].map(row => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{row.district}</td>
                        <td>{row.category}</td>
                        <td><span className="status">Pending</span></td>
                        <td>{row.deadline}</td>
                        <td><Link to="/login" className="view">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* PROCESS / HOW IT WORKS */}
        <section className="process" id="process">
          <div className="container">
            <h2 className="section-title">How JanSetu Works</h2>
            <div className="steps">
              <div className="step">
                <div className="step-icon">
                  <FileEdit size={24} color="#ffffff" strokeWidth={2} />
                </div>
                <h3>Report</h3>
                <p>Citizens report local civic issues and challenges.</p>
              </div>
              <div className="step">
                <div className="step-icon">
                  <Handshake size={24} color="#ffffff" strokeWidth={2} />
                </div>
                <h3>Collaborate</h3>
                <p>Universities and industries propose innovative solutions.</p>
              </div>
              <div className="step">
                <div className="step-icon">
                  <Cog size={24} color="#ffffff" strokeWidth={2} />
                </div>
                <h3>Implement</h3>
                <p>Government departments coordinate and execute solutions.</p>
              </div>
              <div className="step">
                <div className="step-icon">
                  <CheckCircle2 size={24} color="#ffffff" strokeWidth={2} />
                </div>
                <h3>Resolve</h3>
                <p>Communities benefit from improved civic infrastructure.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="about-section">
          <div className="container">
            <h2 className="section-title">About JanSetu</h2>
            <p>JanSetu is a Government Civic Innovation Portal that bridges the gap between citizens, universities, industries, and the government. Our mission is to create a collaborative ecosystem where civic problems are solved through innovation, technology, and community participation.</p>
            <div className="about-grid">
              <div className="about-card">
                <div className="about-icon">
                  <Users size={24} strokeWidth={1.8} />
                </div>
                <h3>Citizen Participation</h3>
                <p>Empowering citizens to report and track civic issues in their community.</p>
              </div>
              <div className="about-card">
                <div className="about-icon">
                  <GraduationCap size={24} strokeWidth={1.8} />
                </div>
                <h3>Academic Collaboration</h3>
                <p>Connecting universities with real-world problems for research-driven solutions.</p>
              </div>
              <div className="about-card">
                <div className="about-icon">
                  <Briefcase size={24} strokeWidth={1.8} />
                </div>
                <h3>Industry Partnerships</h3>
                <p>Engaging industries to provide expertise, resources, and implementation support.</p>
              </div>
              <div className="about-card">
                <div className="about-icon">
                  <Landmark size={24} strokeWidth={1.8} />
                </div>
                <h3>Government Integration</h3>
                <p>Enabling government bodies to efficiently manage and resolve civic challenges.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="contact-section">
          <div className="container">
            <h2 className="section-title">Contact Us</h2>
            <p>For queries, please contact us at: <strong>support@jansetu.gov.in</strong></p>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="container">
            <h2>Ready to Make a Difference?</h2>
            <p>Join JanSetu and be part of India's civic innovation movement.</p>
            <div className="cta-buttons">
              <Link to="/signup" className="button button-white">Create Account</Link>
              <Link to="/login" className="button button-outline">Sign In</Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <span>🇮🇳</span>
              <span>JanSetu — Government Civic Portal</span>
            </div>
            <p>© 2024 JanSetu. All Rights Reserved. | Government of India Initiative</p>
          </div>
        </div>
      </footer>
    </>
  );
}
