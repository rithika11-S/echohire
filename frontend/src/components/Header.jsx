import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAssistant } from "../context/AssistantContext";
import { isBrowserSpeechSupported } from "../assistant/voiceInput";
import { AudioLines, Eye, LogIn, UserPlus, LogOut, User, Building2, ShieldCheck, Bell, Mic, Sparkles } from "lucide-react";

export default function Header({
  page,
  setPage,
  navigate,
  openAuthModal,
  openAccessibilityModal,
  unreadNotifCount,
  openNotificationsModal,
}) {
  const { currentUser, logout } = useAuth();
  const { announce } = useAccessibility();
  const { voiceActivationEnabled, enableVoiceActivation, isGlobalListening, voiceStatus, micPermission } = useAssistant();

  const handleNavClick = (path, label) => {
    if (navigate) {
      navigate(path);
    } else {
      setPage(path);
    }
    announce(`Navigated to ${label}`);
  };

  const activeUser = currentUser || (localStorage.getItem("echohire_current_user") ? JSON.parse(localStorage.getItem("echohire_current_user")) : null);
  const isRecruiter = activeUser?.role === "employer" || activeUser?.role === "recruiter";
  const isSeeker = activeUser?.role === "seeker" || activeUser?.role === "job_seeker" || activeUser?.role === "user";
  const isAdmin = activeUser?.role === "admin";

  return (
    <header className="header-nav" role="banner">
      <div className="header-inner">
        {/* Brand & Logo */}
        <div
          className="brand-logo"
          onClick={() => handleNavClick("/", "Home")}
          role="button"
          tabIndex={0}
          aria-label="EchoHire Accessible Job Portal Home"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleNavClick("/", "Home");
            }
          }}
        >
          <div className="brand-icon-box">
            <AudioLines size={20} color="#FFFFFF" />
          </div>
          <span className="brand-name">EchoHire</span>
          <span className="brand-badge" aria-label="Accessible Employment Platform">Accessible</span>
        </div>

        {/* Primary Navigation Links — Differentiated by Role */}
        <nav className="nav-links" aria-label="Main Navigation Menu">
          <button
            className={`nav-btn ${page === "Home" || page === "/" ? "active" : ""}`}
            onClick={() => handleNavClick("/", "Home")}
          >
            Home
          </button>

          <button
            className={`nav-btn ${page === "Jobs" || page === "/jobs" ? "active" : ""}`}
            onClick={() => handleNavClick("/jobs", "Find Jobs")}
          >
            Find Jobs
          </button>

          {/* Saved Jobs Link for Job Seekers & Guests */}
          {(isSeeker || !currentUser) && (
            <button
              className={`nav-btn ${page === "SavedJobs" || page === "/saved-jobs" ? "active" : ""}`}
              onClick={() => handleNavClick("/saved-jobs", "Saved Jobs")}
            >
              Saved Jobs
            </button>
          )}

          {/* Additional Job Seeker Links */}
          {isSeeker && (
            <>
              <button
                className={`nav-btn ${page === "Recommendations" ? "active" : ""}`}
                onClick={() => handleNavClick("/recommendations", "Recommendations")}
              >
                Recommendations
              </button>

              <button
                className={`nav-btn ${page === "Applications" || page === "/applications" ? "active" : ""}`}
                onClick={() => handleNavClick("/applications", "My Applications")}
              >
                Applications
              </button>

              <button
                className={`nav-btn ${page === "SeekerProfile" || page === "/profile" ? "active" : ""}`}
                onClick={() => handleNavClick("/profile", "My Profile")}
              >
                Profile
              </button>
            </>
          )}

          {/* Recruiter / Employer Links */}
          {isRecruiter && (
            <>
              <button
                className={`nav-btn ${page === "EmployerDashboard" || page === "/employer/dashboard" ? "active" : ""}`}
                onClick={() => handleNavClick("/employer/dashboard", "Employer Dashboard")}
              >
                Employer Dashboard
              </button>

              <button
                className={`nav-btn ${page === "Candidates" || page === "/employer/candidates" ? "active" : ""}`}
                onClick={() => handleNavClick("/employer/candidates", "Candidate Search")}
              >
                Candidates
              </button>
            </>
          )}

          {/* Admin Links */}
          {isAdmin && (
            <button
              className={`nav-btn ${page === "AdminDashboard" || page === "/admin/dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick("/admin/dashboard", "Admin Dashboard")}
            >
              Admin Dashboard
            </button>
          )}

          {!currentUser && (
            <button
              className={`nav-btn ${page === "EmployerDashboard" || page === "/register/employer" ? "active" : ""}`}
              onClick={() => handleNavClick("/register/employer", "For Employers")}
            >
              For Employers
            </button>
          )}
        </nav>

        {/* Accessibility & Auth Actions */}
        <div className="header-actions">
          {/* Notifications Bell for Job Seekers */}
          {currentUser && isSeeker && (
            <button
              className="btn-header-access"
              onClick={openNotificationsModal}
              aria-label={`Open notifications, ${unreadNotifCount} unread`}
              title="Notifications"
              style={{ position: "relative" }}
            >
              <Bell size={16} />
              {unreadNotifCount > 0 && (
                <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#2563EB", color: "#FFFFFF", borderRadius: "999px", width: "18px", height: "18px", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadNotifCount}
                </span>
              )}
            </button>
          )}

          {/* Voice Activation Status Indicator & Optional Fallback Button */}
          {!isBrowserSpeechSupported ? (
            <div
              className="badge-type"
              aria-live="polite"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "700",
                background: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
                borderRadius: "var(--radius-sm)",
              }}
              title="Voice Recognition Not Supported"
            >
              <span>🚫 Voice Recognition Not Supported</span>
            </div>
          ) : micPermission === "Denied" ? (
            <button
              className="btn-header-access"
              onClick={enableVoiceActivation}
              aria-label="Microphone permission required. Click to retry microphone access."
              title="Microphone access required for voice activation"
              style={{ border: "1.5px solid #DC2626", color: "#DC2626", fontWeight: "700" }}
            >
              <Mic size={15} color="#DC2626" />
              <span>Microphone Permission Required</span>
            </button>
          ) : voiceActivationEnabled ? (
            <div
              className="badge-type"
              aria-live="polite"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "700",
                background: voiceStatus === "Voice Paused" ? "#FEF3C7" : isGlobalListening ? "#DCFCE7" : "var(--bg-primary)",
                color: voiceStatus === "Voice Paused" ? "#92400E" : isGlobalListening ? "#166534" : "var(--text-secondary)",
                border: voiceStatus === "Voice Paused" ? "1px solid #FCD34D" : isGlobalListening ? "1px solid #86EFAC" : "1px dashed var(--border-color)",
                borderRadius: "var(--radius-sm)",
              }}
              title="Voice Activation Status"
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: voiceStatus === "Voice Paused" ? "#F59E0B" : isGlobalListening ? "#22C55E" : "#94A3B8",
                  display: "inline-block",
                }}
              />
              <span>{voiceStatus === "Voice Paused" ? "⏸ Voice Paused" : isGlobalListening ? "🎙 Voice Active" : voiceStatus}</span>
            </div>
          ) : (
            <button
              className="btn-header-access"
              onClick={enableVoiceActivation}
              aria-label="Enable voice activation for background wake-word commands"
              title="Click to enable automatic voice activation"
              style={{ border: "1.5px solid #2563EB", color: "#2563EB", fontWeight: "700" }}
            >
              <Sparkles size={15} color="#2563EB" />
              <span>Enable Voice Activation</span>
            </button>
          )}

          {/* Accessibility Panel Trigger */}
          <button
            className="btn-header-access"
            onClick={openAccessibilityModal}
            aria-label="Open accessibility settings panel"
            title="Accessibility Settings"
          >
            <Eye size={16} />
            <span>Accessibility</span>
          </button>

          {/* User Status Badge & Role Identification */}
          {activeUser ? (
            <div className="user-profile-badge" style={{ gap: "8px" }}>
              {isAdmin ? (
                <span className="badge-type" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#0F172A", color: "#FFFFFF" }}>
                  <ShieldCheck size={13} />
                  <span>Admin</span>
                </span>
              ) : isRecruiter ? (
                <span className="badge-type" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#0F172A", color: "#FFFFFF" }}>
                  <Building2 size={13} />
                  <span>Recruiter</span>
                </span>
              ) : (
                <span className="badge-type" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <User size={13} />
                  <span>Job Seeker</span>
                </span>
              )}
              <span className="user-name" style={{ fontWeight: "700" }}>
                {activeUser.name}
              </span>
              <button
                className="btn-danger-sm"
                onClick={() => {
                  logout();
                  announce("Logged out successfully");
                  handleNavClick("/login", "Sign In");
                }}
                aria-label="Logout of EchoHire"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-signin-outline"
                onClick={() => handleNavClick("/login", "Sign In")}
                aria-label="Sign in to your EchoHire account"
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>

              <button
                className="btn-create-account"
                onClick={() => handleNavClick("/register", "Create Account")}
                aria-label="Create a new EchoHire account"
              >
                <UserPlus size={15} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
