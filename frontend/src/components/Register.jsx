import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { formContext } from "../assistant/FormContextService";
import { voiceEditingManager } from "../assistant/VoiceEditingService";
import { echoTTS } from "../assistant/textToSpeech";
import { handleFormArrowKeys } from "../utils/keyboard";
import { AudioLines, User, Building2, ArrowLeft, Sparkles, ArrowRight, Mic } from "lucide-react";

export default function Register({ subRoute, navigate, onSuccess }) {
  // Common Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Employer Specific Form States
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { startVoiceInput, isListening, announce } = useAccessibility();

  // Register form fields for Echo Assistant voice control
  useEffect(() => {
    if (subRoute === "job-seeker") {
      formContext.registerField({
        id: "name",
        label: "Full Name",
        elementId: "reg-name",
        getValue: () => fullName,
        setValue: (val) => setFullName(val),
        aliases: ["my name", "full name", "name field", "user name"],
      });

      formContext.registerField({
        id: "email",
        label: "Email Address",
        elementId: "reg-email",
        getValue: () => email,
        setValue: (val) => setEmail(val),
        aliases: ["my email", "email address", "email field"],
      });

      formContext.registerField({
        id: "password",
        label: "Password",
        elementId: "reg-password",
        isSecret: true,
        getValue: () => (password ? "••••••••" : ""),
        setValue: (val) => setPassword(val),
        aliases: ["password", "my password"],
      });

      formContext.registerField({
        id: "confirmPassword",
        label: "Confirm Password",
        elementId: "reg-confirm",
        isSecret: true,
        getValue: () => (confirmPassword ? "••••••••" : ""),
        setValue: (val) => setConfirmPassword(val),
        aliases: ["confirm password", "repeat password"],
      });

      formContext.registerField({
        id: "phone",
        label: "Phone Number",
        elementId: "reg-phone",
        getValue: () => phone,
        setValue: (val) => setPhone(val),
        aliases: ["my phone", "phone number", "mobile"],
      });

      formContext.registerField({
        id: "location",
        label: "Location",
        elementId: "reg-location",
        getValue: () => location,
        setValue: (val) => setLocation(val),
        aliases: ["my location", "location field", "city"],
      });

      formContext.registerField({
        id: "terms",
        label: "Terms and Privacy Policy Checkbox",
        elementId: "terms-check",
        getValue: () => (agreeTerms ? "Checked and agreed" : "Not checked"),
        setValue: (val) => setAgreeTerms(Boolean(val)),
        aliases: ["terms", "terms and privacy", "privacy policy", "agree terms", "checkbox"],
      });

      formContext.registerField({
        id: "submit",
        label: "Create Account Button",
        elementId: "reg-submit-btn",
        getValue: () => "Create Account",
        setValue: () => {},
        aliases: ["create account", "submit", "register button", "create button"],
      });
    } else if (subRoute === "employer") {
      formContext.registerField({
        id: "name",
        label: "Full Name",
        elementId: "emp-name",
        getValue: () => fullName,
        setValue: (val) => setFullName(val),
        aliases: ["my name", "full name", "name field"],
      });

      formContext.registerField({
        id: "company",
        label: "Company Name",
        elementId: "emp-company",
        getValue: () => companyName,
        setValue: (val) => setCompanyName(val),
        aliases: ["company name", "company", "organization"],
      });

      formContext.registerField({
        id: "email",
        label: "Work Email",
        elementId: "emp-email",
        getValue: () => email,
        setValue: (val) => setEmail(val),
        aliases: ["my email", "work email", "email address"],
      });

      formContext.registerField({
        id: "password",
        label: "Password",
        elementId: "emp-password",
        isSecret: true,
        getValue: () => (password ? "••••••••" : ""),
        setValue: (val) => setPassword(val),
        aliases: ["password", "my password"],
      });

      formContext.registerField({
        id: "location",
        label: "Company Location",
        elementId: "emp-location",
        getValue: () => companyLocation || location,
        setValue: (val) => setCompanyLocation(val),
        aliases: ["company location", "location", "city"],
      });

      formContext.registerField({
        id: "submit",
        label: "Create Employer Account Button",
        elementId: "emp-submit-btn",
        getValue: () => "Create Employer Account",
        setValue: () => {},
        aliases: ["create employer account", "submit", "register button", "create button"],
      });
    }

    return () => {
      formContext.clearAll();
    };
  }, [subRoute, fullName, email, phone, location, password, confirmPassword, agreeTerms, companyName, companyLocation]);

  // Automatically focus on Name field and prompt user when Register page opens
  useEffect(() => {
    if (!subRoute) {
      voiceEditingManager.reset();
      const timer = setTimeout(() => {
        if (!echoTTS.isSpeaking && !(typeof window !== "undefined" && window.speechSynthesis?.speaking)) {
          echoTTS.speak("Opening the Create Account page. There are two different account types on EchoHire: 1. Job Seeker account for candidates looking for jobs. 2. Employer account for companies posting jobs and hiring talent. You can say 'Job Seeker' or 'Employer' to choose your account type.");
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const firstFieldId = subRoute === "employer" ? "emp-name" : "reg-name";
      formContext.focusElement(firstFieldId);
      const editRes = voiceEditingManager.startGuidedEdit("name");
      if (editRes && editRes.prompt) {
        echoTTS.speak(editRes.prompt);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [subRoute]);

  const [activeVoiceFieldId, setActiveVoiceFieldId] = useState(null);

  useEffect(() => {
    return () => {
      formContext.clearAllFocusStyles();
    };
  }, []);

  // Voice Dictation Helpers
  const dictateField = (setter, label, elementId) => {
    if (elementId) {
      formContext.focusElement(elementId);
      setActiveVoiceFieldId(elementId);
    }
    announce(`Listening for ${label}...`);
    startVoiceInput(
      (spokenText) => {
        setter(spokenText);
        announce(`${label} set to ${spokenText}`);
        setActiveVoiceFieldId(null);
      },
      () => setActiveVoiceFieldId(null)
    );
  };

  // Registration submit handlers
  const handleSeekerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("You must agree to the Terms and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    announce("Creating your job seeker account...");

    try {
      const res = await register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        phone,
        location,
        role: "seeker",
      });

      setIsLoading(false);
      if (res.success && res.user) {
        announce(`Account created successfully! Welcome, ${res.user.name}`);
        if (onSuccess) onSuccess("seeker");
      } else {
        setErrorMsg(res.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorMsg("Server error during registration.");
    }
  };

  const handleEmployerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    announce("Creating your employer account...");

    try {
      const res = await register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        role: "employer",
        company: companyName.trim(),
        industry,
        website: companyWebsite.trim(),
        location: companyLocation.trim() || location.trim(),
        description: companyDescription.trim(),
      });

      setIsLoading(false);
      if (res.success && res.user) {
        announce(`Employer account created successfully! Welcome, ${res.user.name}`);
        if (onSuccess) onSuccess("employer");
      } else {
        setErrorMsg(res.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setErrorMsg("Server error during employer registration.");
    }
  };

  // View 1: /register — Account Choice Selection
  if (!subRoute || subRoute === "choice") {
    return (
      <div style={{ minHeight: "calc(100vh - 180px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ width: "100%", maxWidth: "1040px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-lg)", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "540px" }}>
          
          {/* Left Column: EchoHire Branding */}
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
                <span>Join EchoHire Marketplace</span>
              </span>

              <h1 style={{ fontSize: "36px", fontWeight: "900", lineHeight: "1.2", letterSpacing: "-0.5px", color: "#FFFFFF", marginBottom: "16px" }}>
                Connect with opportunity. <br />Empower inclusion.
              </h1>

              <p style={{ fontSize: "16px", color: "#94A3B8", lineHeight: "1.6" }}>
                Join thousands of candidates and inclusive organizations building the future of accessible employment.
              </p>
            </div>

            <div>
              <button className="secondary-btn" onClick={() => navigate("/login")} style={{ color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)", background: "transparent" }}>
                <ArrowLeft size={16} />
                <span>Already have an account? Sign In</span>
              </button>
            </div>
          </div>

          {/* Right Column: Account Choice Cards */}
          <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--bg-card)" }}>
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>
                Create your EchoHire account
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
                Choose how you want to use EchoHire
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} onKeyDown={handleFormArrowKeys}>
              {/* Card 1: Job Seeker */}
              <div
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "24px", transition: "border-color 0.15s, box-shadow 0.15s" }}
                className="portal-card"
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate("/register/job-seeker");
                  } else {
                    handleFormArrowKeys(e);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-blue)", marginBottom: "8px" }}>
                  <User size={22} />
                  <h3 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>Job Seeker</h3>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "18px", lineHeight: "1.5" }}>
                  Discover accessible job opportunities, build your profile and apply with confidence.
                </p>
                <button className="primary-btn-large" onClick={() => navigate("/register/job-seeker")}>
                  <span>Create Job Seeker Account</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Card 2: Employer */}
              <div
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "24px", transition: "border-color 0.15s, box-shadow 0.15s" }}
                className="portal-card"
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate("/register/employer");
                  } else {
                    handleFormArrowKeys(e);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-blue)", marginBottom: "8px" }}>
                  <Building2 size={22} />
                  <h3 style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>Employer</h3>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "18px", lineHeight: "1.5" }}>
                  Find talented professionals and build an inclusive workplace.
                </p>
                <button className="primary-btn-large" onClick={() => navigate("/register/employer")}>
                  <span>Create Employer Account</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // View 2: /register/job-seeker
  if (subRoute === "job-seeker") {
    return (
      <div style={{ maxWidth: "680px", margin: "40px auto", padding: "0 16px" }}>
        <div className="form-card">
          <button className="secondary-btn" onClick={() => navigate("/register")} style={{ marginBottom: "20px", border: "none", padding: "4px 8px" }}>
            <ArrowLeft size={16} />
            <span>Back to account choices</span>
          </button>

          <h1 style={{ fontSize: "28px", fontWeight: "900", color: "var(--text-primary)", marginBottom: "6px" }}>
            Create your job seeker account
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginBottom: "24px" }}>
            Fill in your personal details or use voice dictation to start discovering accessible career opportunities.
          </p>

          {errorMsg && <div className="error-banner" style={{ marginBottom: "18px" }}>{errorMsg}</div>}

          <form onSubmit={handleSeekerSubmit} onKeyDown={handleFormArrowKeys} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input type="text" name="prevent_autofill" style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex={-1} readOnly autoComplete="off" />
            <input type="password" name="prevent_autofill_pwd" style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex={-1} readOnly autoComplete="off" />

            <div className="form-group">
              <label htmlFor="reg-name" className="filter-label">Full Name (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="reg-name"
                  name="echohire_full_name"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  autoComplete="one-time-code"
                  required
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "reg-name" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setFullName, "Full Name", "reg-name")}
                  aria-label="Dictate full name using voice recognition"
                  title="Dictate Full Name"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email" className="filter-label">Email Address (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="reg-email"
                  name="echohire_email_addr"
                  type="email"
                  className="text-input"
                  placeholder="e.g. seeker@echohire.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  autoComplete="one-time-code"
                  required
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "reg-email" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setEmail, "Email Address", "reg-email")}
                  aria-label="Dictate email address using voice recognition"
                  title="Dictate Email"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="reg-password" className="filter-label">Password</label>
                <input
                  id="reg-password"
                  name="echohire_pwd_secret"
                  type="password"
                  className="text-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm" className="filter-label">Confirm Password</label>
                <input
                  id="reg-confirm"
                  name="echohire_confirm_secret"
                  type="password"
                  className="text-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="reg-phone" className="filter-label">Phone Number (Voice Input Supported)</label>
                <div className="input-with-mic">
                  <input
                    id="reg-phone"
                    name="echohire_phone"
                    type="tel"
                    className="text-input"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => formContext.clearAllFocusStyles()}
                    autoComplete="one-time-code"
                  />
                  <button
                    type="button"
                    className={`mic-btn ${activeVoiceFieldId === "reg-phone" && isListening ? "listening" : ""}`}
                    onClick={() => dictateField(setPhone, "Phone Number", "reg-phone")}
                    aria-label="Dictate phone number"
                    title="Dictate Phone Number"
                  >
                    <Mic size={15} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-location" className="filter-label">Location (Voice Input Supported)</label>
                <div className="input-with-mic">
                  <input
                    id="reg-location"
                    name="echohire_location"
                    type="text"
                    className="text-input"
                    placeholder="Chennai, Tamil Nadu"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => formContext.clearAllFocusStyles()}
                    autoComplete="one-time-code"
                  />
                  <button
                    type="button"
                    className={`mic-btn ${activeVoiceFieldId === "reg-location" && isListening ? "listening" : ""}`}
                    onClick={() => dictateField(setLocation, "Location", "reg-location")}
                    aria-label="Dictate location"
                    title="Dictate Location"
                  >
                    <Mic size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <input
                type="checkbox"
                id="terms-check"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--accent-blue)" }}
              />
              <label htmlFor="terms-check" style={{ fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer" }}>
                I agree to the Terms and Privacy Policy
              </label>
            </div>

            <button id="reg-submit-btn" type="submit" className="primary-btn-large" disabled={isLoading} style={{ marginTop: "12px" }}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // View 3: /register/employer
  if (subRoute === "employer") {
    return (
      <div style={{ maxWidth: "780px", margin: "40px auto", padding: "0 16px" }}>
        <div className="form-card">
          <button className="secondary-btn" onClick={() => navigate("/register")} style={{ marginBottom: "20px", border: "none", padding: "4px 8px" }}>
            <ArrowLeft size={16} />
            <span>Back to account choices</span>
          </button>

          <h1 style={{ fontSize: "28px", fontWeight: "900", color: "var(--text-primary)", marginBottom: "6px" }}>
            Create your employer account
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginBottom: "24px" }}>
            Register your organization to post accessible job opportunities and hire talented professionals.
          </p>

          {errorMsg && <div className="error-banner" style={{ marginBottom: "18px" }}>{errorMsg}</div>}

          <form onSubmit={handleEmployerSubmit} onKeyDown={handleFormArrowKeys} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Personal Information */}
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "14px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                Personal Information
              </h3>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="emp-name" className="filter-label">Full Name (Voice Input Supported)</label>
                  <div className="input-with-mic">
                    <input
                      id="emp-name"
                      type="text"
                      className="text-input"
                      placeholder="e.g. Priya Sundaram"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onFocus={() => formContext.clearAllFocusStyles()}
                      required
                    />
                    <button
                      type="button"
                      className={`mic-btn ${activeVoiceFieldId === "emp-name" && isListening ? "listening" : ""}`}
                      onClick={() => dictateField(setFullName, "Full Name", "emp-name")}
                      aria-label="Dictate full name"
                      title="Dictate Full Name"
                    >
                      <Mic size={15} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="emp-email" className="filter-label">Work Email Address (Voice Input Supported)</label>
                  <div className="input-with-mic">
                    <input
                      id="emp-email"
                      type="email"
                      className="text-input"
                      placeholder="e.g. recruiter@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => formContext.clearAllFocusStyles()}
                      required
                    />
                    <button
                      type="button"
                      className={`mic-btn ${activeVoiceFieldId === "emp-email" && isListening ? "listening" : ""}`}
                      onClick={() => dictateField(setEmail, "Work Email", "emp-email")}
                      aria-label="Dictate work email"
                      title="Dictate Work Email"
                    >
                      <Mic size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row-2" style={{ marginTop: "14px" }}>
                <div className="form-group">
                  <label htmlFor="emp-password" className="filter-label">Password</label>
                  <input
                    id="emp-password"
                    type="password"
                    className="text-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emp-confirm" className="filter-label">Confirm Password</label>
                  <input
                    id="emp-confirm"
                    type="password"
                    className="text-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "14px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                Company Information
              </h3>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="emp-company" className="filter-label">Company Name (Voice Input Supported)</label>
                  <div className="input-with-mic">
                    <input
                      id="emp-company"
                      type="text"
                      className="text-input"
                      placeholder="e.g. Acme Accessibility Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onFocus={() => formContext.clearAllFocusStyles()}
                      required
                    />
                    <button
                      type="button"
                      className={`mic-btn ${activeVoiceFieldId === "emp-company" && isListening ? "listening" : ""}`}
                      onClick={() => dictateField(setCompanyName, "Company Name", "emp-company")}
                      aria-label="Dictate company name"
                      title="Dictate Company Name"
                    >
                      <Mic size={15} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="emp-industry" className="filter-label">Industry</label>
                  <select
                    id="emp-industry"
                    className="select-input"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    onFocus={() => formContext.clearAllFocusStyles()}
                  >
                    <option value="Technology">Technology & Software</option>
                    <option value="Healthcare">Healthcare & Biotech</option>
                    <option value="Finance">Finance & Banking</option>
                    <option value="Education">Education & E-Learning</option>
                    <option value="Nonprofit">Nonprofit & Advocacy</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2" style={{ marginTop: "14px" }}>
                <div className="form-group">
                  <label htmlFor="emp-website" className="filter-label">Company Website</label>
                  <input
                    id="emp-website"
                    type="url"
                    className="text-input"
                    placeholder="https://company.com"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    onFocus={() => formContext.clearAllFocusStyles()}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emp-location" className="filter-label">Company Location (Voice Input Supported)</label>
                  <div className="input-with-mic">
                    <input
                      id="emp-location"
                      type="text"
                      className="text-input"
                      placeholder="Chennai, Tamil Nadu"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
                      onFocus={() => formContext.clearAllFocusStyles()}
                    />
                    <button
                      type="button"
                      className={`mic-btn ${activeVoiceFieldId === "emp-location" && isListening ? "listening" : ""}`}
                      onClick={() => dictateField(setCompanyLocation, "Company Location", "emp-location")}
                      aria-label="Dictate company location"
                      title="Dictate Company Location"
                    >
                      <Mic size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "14px" }}>
                <label htmlFor="emp-desc" className="filter-label">Company Overview & Inclusion Commitment (Voice Input Supported)</label>
                <div className="input-with-mic">
                  <textarea
                    id="emp-desc"
                    rows={3}
                    className="text-input"
                    placeholder="Describe your company's mission and workspace accessibility accommodations..."
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`mic-btn ${isListening ? "listening" : ""}`}
                    onClick={() => {
                      announce("Listening for company description...");
                      startVoiceInput((spokenText) => {
                        setCompanyDescription((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
                      });
                    }}
                    aria-label="Dictate company overview"
                    title="Dictate Company Overview"
                  >
                    <Mic size={15} />
                    <span>Dictate</span>
                  </button>
                </div>
              </div>
            </div>

            <button id="emp-submit-btn" type="submit" className="primary-btn-large" disabled={isLoading} style={{ marginTop: "8px" }}>
              {isLoading ? "Creating Account..." : "Create Employer Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
