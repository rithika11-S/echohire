import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { formContext } from "../assistant/FormContextService";
import { voiceEditingManager } from "../assistant/VoiceEditingService";
import { echoTTS } from "../assistant/textToSpeech";
import { handleFormArrowKeys } from "../utils/keyboard";
import { AudioLines, Eye, EyeOff, Sparkles, User, Building2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function Login({ navigate, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { announce } = useAccessibility();

  // Register form fields for voice reading & editing
  useEffect(() => {
    formContext.registerField({
      id: "email",
      label: "Email Address",
      elementId: "login-email",
      getValue: () => email,
      setValue: (val) => setEmail(val),
      aliases: ["my email", "email address", "email field", "login email"],
    });

    formContext.registerField({
      id: "password",
      label: "Password",
      elementId: "login-password",
      isSecret: true,
      getValue: () => (password ? "••••••••" : ""),
      setValue: (val) => setPassword(val),
      aliases: ["password", "my password", "password field"],
    });

    formContext.registerField({
      id: "submit",
      label: "Sign In Button",
      elementId: "login-submit-btn",
      getValue: () => "Sign In",
      setValue: () => {},
      aliases: ["sign in", "login button", "submit", "sign in button"],
    });

    return () => {
      formContext.clearAll();
    };
  }, [email, password]);

  // Automatically focus on Email field and prompt user when Sign In page opens
  useEffect(() => {
    const timer = setTimeout(() => {
      formContext.focusElement("login-email");
      const editRes = voiceEditingManager.startGuidedEdit("email");
      if (editRes && editRes.prompt) {
        echoTTS.speak(editRes.prompt);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    announce("Signing in...");

    try {
      const res = await login(email, password);
      setIsLoading(false);

      if (res.success && res.user) {
        announce(`Logged in successfully as ${res.user.name}`);
        const userRole = res.user.role;
        if (onSuccess) onSuccess(userRole);
      } else {
        setErrorMsg(res.message || "We couldn't sign you in. Please check your email and password.");
        announce("We couldn't sign you in. Please check your email and password.");
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorMsg("Authentication service error. Please try again.");
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg("");
  };

  return (
    <div style={{ minHeight: "calc(100vh - 180px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: "1040px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-lg)", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "560px" }}>
        
        {/* Left Column: EchoHire Branding & Accessibility Vision */}
        <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "#FFFFFF", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", cursor: "pointer" }} onClick={() => navigate("/")}>
              <div className="brand-icon-box" style={{ width: "42px", height: "42px", background: "#2563EB" }}>
                <AudioLines size={24} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "-0.5px", color: "#FFFFFF" }}>EchoHire</span>
            </div>

            <span className="brand-badge" style={{ background: "rgba(37, 99, 235, 0.2)", border: "1px solid rgba(37, 99, 235, 0.4)", color: "#60A5FA", marginBottom: "20px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={13} />
              <span>Unified Accessible Sign-In</span>
            </span>

            <h1 style={{ fontSize: "36px", fontWeight: "900", lineHeight: "1.2", letterSpacing: "-0.5px", color: "#FFFFFF", marginBottom: "16px" }}>
              Accessible opportunities. <br />Equal possibilities.
            </h1>

            <p style={{ fontSize: "16px", color: "#94A3B8", lineHeight: "1.6" }}>
              A job platform designed to help every candidate discover, understand, and pursue meaningful opportunities with screen reader compatibility and voice dictation.
            </p>
          </div>

          <div>
            <button className="secondary-btn" onClick={() => navigate("/")} style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", background: "transparent" }}>
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>

        {/* Right Column: Single Sign-In Form */}
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--bg-card)" }}>
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>
              Welcome back
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
              Sign in to continue to EchoHire
            </p>
          </div>

          {errorMsg && (
            <div className="error-banner" style={{ marginBottom: "18px" }} role="alert">
              {errorMsg}
            </div>
          )}

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
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <input type="text" name="prevent_autofill" style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex={-1} readOnly autoComplete="off" />
            <input type="password" name="prevent_autofill_pwd" style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex={-1} readOnly autoComplete="off" />

            <div className="form-group">
              <label htmlFor="login-email" className="filter-label">Email Address</label>
              <input
                id="login-email"
                name="echohire_login_email"
                type="email"
                className="text-input"
                placeholder="e.g. candidate@echohire.org or recruiter@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="one-time-code"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="login-password" className="filter-label">Password</label>
                <button
                  type="button"
                  onClick={() => announce("Password reset link will be sent to your email address.")}
                  style={{ background: "none", border: "none", color: "var(--accent-blue)", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="text-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)" }}
              />
              <label htmlFor="remember-me" style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer" }}>
                Remember me on this device
              </label>
            </div>

            <button id="login-submit-btn" type="submit" className="primary-btn-large" disabled={isLoading} style={{ marginTop: "8px" }}>
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Registration Redirect */}
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", textAlign: "center", fontSize: "14px", color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              style={{ background: "none", border: "none", color: "var(--accent-blue)", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: "18px", background: "var(--accent-light)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "8px", color: "var(--accent-blue)" }}>
              <Sparkles size={13} />
              <span>Demo Quick Sign In:</span>
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-demo"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onClick={() => fillDemoAccount("seeker@echohire.com", "password123")}
              >
                <User size={12} />
                <span>Job Seeker</span>
              </button>
              <button
                type="button"
                className="btn-demo"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onClick={() => fillDemoAccount("recruiterA@technova.com", "password")}
              >
                <Building2 size={12} />
                <span>Recruiter A (TechNova)</span>
              </button>
              <button
                type="button"
                className="btn-demo"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onClick={() => fillDemoAccount("recruiterB@brightpath.com", "password")}
              >
                <Building2 size={12} />
                <span>Recruiter B (BrightPath)</span>
              </button>
              <button
                type="button"
                className="btn-demo"
                style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onClick={() => fillDemoAccount("admin@echohire.com", "password")}
              >
                <ShieldCheck size={12} />
                <span>Admin</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
