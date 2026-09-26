import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { handleFormArrowKeys } from "../utils/keyboard";
import { X, LogIn, UserPlus, Sparkles, User, Building2, Briefcase } from "lucide-react";

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("seeker"); // 'seeker' or 'employer'
  const [errorMsg, setErrorMsg] = useState("");

  const { login, register } = useAuth();
  const { announce } = useAccessibility();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      if (isLoginTab) {
        const res = await login(email, password);
        if (res.success) {
          announce(`Logged in successfully as ${res.user.name}`);
          if (onSuccess) onSuccess(res.user.role);
          onClose();
        } else {
          setErrorMsg(res.message || "Invalid email or password.");
        }
      } else {
        if (!name.trim()) {
          setErrorMsg("Please enter your name.");
          return;
        }
        if (role === "employer" && !companyName.trim()) {
          setErrorMsg("Please enter your company or organization name.");
          return;
        }

        const registerData = {
          name: name.trim(),
          company: role === "employer" ? companyName.trim() : "",
          email: email.trim(),
          password,
          role,
        };

        const res = await register(registerData);
        if (res.success) {
          announce(`Account created successfully as ${role === "employer" ? "Recruiter" : "Job Seeker"}.`);
          if (onSuccess) onSuccess(role);
          onClose();
        } else {
          setErrorMsg(res.message || "Registration failed.");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Authentication service error. Please try again.");
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="modal-card" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="auth-modal-title" style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
            {isLoginTab ? "Sign In to EchoHire" : "Create Account — Select Your Role"}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close authentication modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
          <button
            type="button"
            className="tab-btn"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: "12px",
              borderBottom: isLoginTab ? "3px solid var(--accent-blue)" : "3px solid transparent",
              color: isLoginTab ? "var(--accent-blue)" : "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
            onClick={() => { setIsLoginTab(true); setErrorMsg(""); }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className="tab-btn"
            style={{
              flex: 1,
              borderRadius: 0,
              padding: "12px",
              borderBottom: !isLoginTab ? "3px solid var(--accent-blue)" : "3px solid transparent",
              color: !isLoginTab ? "var(--accent-blue)" : "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
            onClick={() => { setIsLoginTab(false); setErrorMsg(""); }}
          >
            <UserPlus size={15} />
            <span>Create Account</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit(e);
            } else {
              handleFormArrowKeys(e);
            }
          }}
          autoComplete="off"
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: "18px" }}
        >
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {/* Account Role Selector Cards during Registration */}
          {!isLoginTab && (
            <div className="form-group">
              <label className="filter-label" style={{ marginBottom: "6px" }}>Select Your Account Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Role Card 1: Job Seeker */}
                <div
                  onClick={() => setRole("seeker")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setRole("seeker");
                    }
                  }}
                  style={{
                    border: role === "seeker" ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                    background: role === "seeker" ? "var(--accent-light)" : "var(--bg-card)",
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={role === "seeker"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-blue)", fontWeight: "700" }}>
                    <User size={18} />
                    <span>Job Seeker</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Find accessible job opportunities matched to your skills.
                  </span>
                </div>

                {/* Role Card 2: Employer / Recruiter */}
                <div
                  onClick={() => setRole("employer")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setRole("employer");
                    }
                  }}
                  style={{
                    border: role === "employer" ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                    background: role === "employer" ? "var(--accent-light)" : "var(--bg-card)",
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={role === "employer"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-blue)", fontWeight: "700" }}>
                    <Building2 size={18} />
                    <span>Employer / Recruiter</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Post jobs, manage listings, & hire inclusive talent.
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isLoginTab && (
            <>
              <div className="form-group">
                <label htmlFor="auth-name" className="filter-label">
                  {role === "employer" ? "Recruiter / Contact Name" : "Full Name"}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className="text-input"
                  placeholder={role === "employer" ? "e.g. Priya Sundaram" : "e.g. Rithika Sharma"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {role === "employer" && (
                <div className="form-group">
                  <label htmlFor="auth-company" className="filter-label">Company / Organization Name</label>
                  <input
                    id="auth-company"
                    type="text"
                    className="text-input"
                    placeholder="e.g. InnoTech Global Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="auth-email" className="filter-label">
              {role === "employer" && !isLoginTab ? "Work Email Address" : "Email Address"}
            </label>
            <input
              id="auth-email"
              type="email"
              className="text-input"
              placeholder={role === "employer" ? "recruiter@company.com" : "seeker@echohire.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password" className="filter-label">Password</label>
            <input
              id="auth-password"
              type="password"
              className="text-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Quick Demo Accounts Helper */}
          <div style={{ background: "var(--accent-light)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(37, 99, 235, 0.2)", marginTop: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "var(--accent-blue)" }}>
              <Sparkles size={14} />
              <span>Quick Test Demo Sign In:</span>
            </span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-demo"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => fillDemoAccount("seeker@echohire.com", "password123")}
              >
                <User size={13} />
                <span>Job Seeker Demo</span>
              </button>
              <button
                type="button"
                className="btn-demo"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => fillDemoAccount("employer@techcorp.com", "password123")}
              >
                <Building2 size={13} />
                <span>Recruiter Demo</span>
              </button>
            </div>
          </div>

          <button type="submit" className="primary-btn-large" style={{ marginTop: "6px" }}>
            {isLoginTab ? "Sign In Now" : `Create ${role === "employer" ? "Recruiter" : "Job Seeker"} Account`}
          </button>
        </form>
      </div>
    </div>
  );
}
