import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Mic,
  Volume2,
  Briefcase,
  Building2,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  Megaphone,
  Award,
  ExternalLink,
} from "lucide-react";

export default function Home({ setPage, openAuthModal, openAccessibilityModal }) {
  const { speak, announce } = useAccessibility();
  const { currentUser } = useAuth();

  const welcomeMessage = `
    EchoHire connects job seekers with inclusive employers through accessible, voice-enabled job discovery and application tools.
  `;

  const handleListenWelcome = () => {
    speak(welcomeMessage, true);
    announce("Reading introduction aloud.");
  };

  return (
    <div className="home-container">
      {/* Two-Column Hero Section */}
      <section className="hero-banner" aria-labelledby="hero-title">
        <div className="hero-two-column">
          {/* Left Column */}
          <div className="hero-left">
            <span className="brand-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              <Sparkles size={14} color="#2563EB" />
              <span>Accessible Employment Platform</span>
            </span>

            <h1 id="hero-title" className="hero-title" tabIndex={0}>
              Find the Right Opportunity. <br />Build Your Future.
            </h1>

            <p className="hero-description">
              EchoHire connects job seekers with inclusive employers through accessible, voice-enabled job discovery and application tools.
            </p>

            <div className="hero-actions-row">
              <button
                className="primary-btn"
                onClick={() => {
                  setPage("Jobs");
                  announce("Navigating to Find Jobs page");
                }}
                aria-label="Find accessible job opportunities"
              >
                <Search size={16} />
                <span>Find Jobs</span>
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  if (!currentUser) openAuthModal();
                  setPage("SeekerProfile");
                  announce("Navigating to profile setup");
                }}
                aria-label="Create your profile"
              >
                <span>Create Your Profile</span>
              </button>

              <button
                className="btn-audio-listen"
                onClick={handleListenWelcome}
                aria-label="Listen to audio overview using text to speech"
              >
                <Volume2 size={16} />
                <span>Read Aloud</span>
              </button>
            </div>
          </div>

          {/* Right Column Visual Panel */}
          <div className="hero-visual-panel">
            <div className="visual-panel-item">
              <div className="visual-item-icon">
                <Search size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>Accessible Job Search</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                  Search by title, skill, or accessibility accommodation preference.
                </p>
              </div>
            </div>

            <div className="visual-panel-item">
              <div className="visual-item-icon">
                <Mic size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>Voice-Enabled Input</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                  Dictate profile details and perform natural voice search commands.
                </p>
              </div>
            </div>

            <div className="visual-panel-item">
              <div className="visual-item-icon">
                <Volume2 size={20} />
              </div>
              <div>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>Screen Reader Ready</strong>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                  WCAG 2.1 AA landmark elements & live aria announcement updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Partner Advertisement Banner */}
      <section className="ad-banner-section" aria-label="Sponsored Hiring Partner Announcement" style={{ marginBottom: "36px" }}>
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--accent-light)", color: "var(--accent-blue)", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", marginBottom: "10px" }}>
              <Megaphone size={13} />
              <span>SPONSORED HIRING PARTNER</span>
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>
              AccessTech Global — Hiring 50+ Screen-Reader Friendly Roles This Month!
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
              AccessTech Global is actively recruiting Software Engineers, Accessibility Analysts, and Customer Specialists with full screen-reader hardware support and 100% remote flexibility.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="primary-btn"
              onClick={() => setPage("Jobs")}
              aria-label="View AccessTech Global sponsored job listings"
            >
              <ExternalLink size={15} />
              <span>View Partner Jobs</span>
            </button>
          </div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="home-portal-grid" aria-labelledby="portal-features-heading">
        <div className="section-header" style={{ marginBottom: "20px" }}>
          <h2 id="portal-features-heading" tabIndex={0} style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
            Choose Your Path
          </h2>
        </div>

        <div className="grid-cards-3">
          {/* Card 1: Job Seekers */}
          <div className="portal-card" tabIndex={0}>
            <div>
              <div className="portal-card-icon">
                <Briefcase size={24} />
              </div>
              <h3>For Job Seekers</h3>
              <p>
                Find accessible job opportunities matched to your skills, experience, and accessibility needs.
              </p>
            </div>
            <button
              className="primary-btn"
              onClick={() => {
                if (!currentUser) openAuthModal();
                setPage("Jobs");
              }}
              aria-label="Explore jobs as job seeker"
            >
              Explore Jobs
            </button>
          </div>

          {/* Card 2: Employers & Recruiters */}
          <div className="portal-card" tabIndex={0}>
            <div>
              <div className="portal-card-icon">
                <Building2 size={24} />
              </div>
              <h3>For Employers & Recruiters</h3>
              <p>
                Post accessible job listings, review applicant qualifications, and hire skilled inclusive professionals.
              </p>
            </div>
            <button
              className="primary-btn"
              onClick={() => {
                if (!currentUser) openAuthModal();
                setPage("EmployerDashboard");
              }}
              aria-label="Recruiter Portal"
            >
              Recruiter Dashboard
            </button>
          </div>

          {/* Card 3: Accessibility */}
          <div className="portal-card" tabIndex={0}>
            <div>
              <div className="portal-card-icon">
                <SlidersHorizontal size={24} />
              </div>
              <h3>Accessibility</h3>
              <p>
                Customize text, contrast, voice input and reading preferences.
              </p>
            </div>
            <button
              className="secondary-btn"
              onClick={openAccessibilityModal}
              aria-label="Open accessibility settings"
            >
              Accessibility Settings
            </button>
          </div>
        </div>
      </section>

      {/* Sponsored Career & Certification Programs Grid */}
      <section className="sponsored-programs-section" aria-labelledby="sponsored-programs-title" style={{ marginTop: "44px" }}>
        <div className="section-header" style={{ marginBottom: "20px" }}>
          <h2 id="sponsored-programs-title" tabIndex={0} style={{ fontSize: "26px", fontWeight: "800", color: "var(--text-primary)" }}>
            Featured Programs & Industry Partners
          </h2>
        </div>

        <div className="grid-cards-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Ad Card 1 */}
          <div className="portal-card" style={{ background: "var(--bg-card)" }} tabIndex={0}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F1F5F9", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", marginBottom: "14px" }}>
                <span>SPONSORED PROGRAM</span>
              </div>
              <h3>EchoHire Voice Prep</h3>
              <p>
                Practice AI-guided mock voice interviews and receive instant acoustic feedback tailored for screen-reader candidates.
              </p>
            </div>
            <button
              className="secondary-btn"
              onClick={() => speak("EchoHire Voice Prep provides mock voice interview practice for visually impaired job seekers.")}
            >
              <Sparkles size={15} />
              <span>Learn About Voice Prep</span>
            </button>
          </div>

          {/* Ad Card 2 */}
          <div className="portal-card" style={{ background: "var(--bg-card)" }} tabIndex={0}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F1F5F9", color: "var(--text-secondary)", padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", marginBottom: "14px" }}>
                <span>RECRUITER CERTIFICATION</span>
              </div>
              <h3>Inclusive Workplace Certification</h3>
              <p>
                Demonstrate WCAG 2.1 AA compliance, display verified accessibility badges, and attract premier candidate talent.
              </p>
            </div>
            <button
              className="secondary-btn"
              onClick={() => {
                if (!currentUser) openAuthModal();
                else setPage("EmployerDashboard");
              }}
            >
              <Award size={15} />
              <span>Get Certified</span>
            </button>
          </div>
        </div>
      </section>

      {/* Designed for Accessible Employment */}
      <section className="wcag-info-section" tabIndex={0}>
        <div className="wcag-box">
          <h2 className="wcag-box-title" tabIndex={0}>
            Designed for Accessible Employment
          </h2>
          <div className="wcag-grid-2x2">
            <div className="wcag-feature-card" tabIndex={0}>
              <div className="wcag-feature-header">
                <Mic size={20} className="wcag-icon" />
                <strong className="wcag-feature-label">Voice Search</strong>
              </div>
              <p className="wcag-feature-text">
                Search for opportunities using natural voice dictation and speech recognition.
              </p>
            </div>

            <div className="wcag-feature-card" tabIndex={0}>
              <div className="wcag-feature-header">
                <CheckCircle2 size={20} className="wcag-icon" />
                <strong className="wcag-feature-label">Screen Reader Support</strong>
              </div>
              <p className="wcag-feature-text">
                Navigate jobs, applications, and profiles with full NVDA, JAWS, and VoiceOver support.
              </p>
            </div>

            <div className="wcag-feature-card" tabIndex={0}>
              <div className="wcag-feature-header">
                <Volume2 size={20} className="wcag-icon" />
                <strong className="wcag-feature-label">Text-to-Speech</strong>
              </div>
              <p className="wcag-feature-text">
                Listen to job descriptions, application alerts, and platform navigation feedback.
              </p>
            </div>

            <div className="wcag-feature-card" tabIndex={0}>
              <div className="wcag-feature-header">
                <SlidersHorizontal size={20} className="wcag-icon" />
                <strong className="wcag-feature-label">Personalized Accessibility</strong>
              </div>
              <p className="wcag-feature-text">
                Adjust text size, contrast presets, speech speed, and navigation preferences.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
