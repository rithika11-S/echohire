import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { formContext } from "../assistant/FormContextService";
import { voiceEditingManager } from "../assistant/VoiceEditingService";
import { echoTTS } from "../assistant/textToSpeech";
import { handleFormArrowKeys } from "../utils/keyboard";
import { Mic, Upload, Plus, X, FileText, CheckCircle2, Save } from "lucide-react";

export default function Seeker() {
  const { currentUser, updateProfile } = useAuth();
  const { startVoiceInput, isListening, announce, speak } = useAccessibility();

  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [location, setLocation] = useState(currentUser?.location || "Chennai, India");
  const [summary, setSummary] = useState(currentUser?.summary || "");
  const [skills, setSkills] = useState(currentUser?.skills || ["React", "JavaScript", "HTML5", "ARIA Semantics"]);
  const [newSkill, setNewSkill] = useState("");
  const [resumeName, setResumeName] = useState(currentUser?.resumeName || "Standard_Resume.pdf");
  const [accommodationPrefs, setAccommodationPrefs] = useState(
    currentUser?.accessNeed || "Requires NVDA Screen Reader and high contrast text."
  );

  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.location) setLocation(currentUser.location);
      if (currentUser.summary) setSummary(currentUser.summary);
      if (currentUser.skills && Array.isArray(currentUser.skills)) setSkills(currentUser.skills);
      if (currentUser.resumeName) setResumeName(currentUser.resumeName);
      if (currentUser.accessNeed) setAccommodationPrefs(currentUser.accessNeed);
    }
  }, [currentUser]);

  // Register fields with Echo Assistant Form Context
  useEffect(() => {
    formContext.registerField({
      id: "name",
      label: "Name",
      elementId: "prof-name",
      getValue: () => fullName,
      setValue: (val) => setFullName(val),
      aliases: ["my name", "full name", "name field", "user name"],
    });

    formContext.registerField({
      id: "email",
      label: "Email",
      elementId: "prof-email",
      getValue: () => email,
      setValue: () => {},
      disabled: true,
      aliases: ["my email", "email address", "email field"],
    });

    formContext.registerField({
      id: "phone",
      label: "Phone Number",
      elementId: "prof-phone",
      getValue: () => phone,
      setValue: (val) => setPhone(val),
      aliases: ["my phone", "phone number", "phone field", "mobile number"],
    });

    formContext.registerField({
      id: "location",
      label: "Location",
      elementId: "prof-location",
      getValue: () => location,
      setValue: (val) => setLocation(val),
      aliases: ["my location", "location field", "city", "address"],
    });

    formContext.registerField({
      id: "summary",
      label: "Professional Summary",
      elementId: "prof-summary",
      getValue: () => summary,
      setValue: (val) => setSummary(val),
      aliases: ["my summary", "summary field", "bio", "career overview"],
    });

    formContext.registerField({
      id: "skill",
      label: "Skills & Expertise",
      elementId: "add-skill-input",
      getValue: () => (skills && skills.length > 0 ? skills.join(", ") : ""),
      setValue: (val) => {
        if (val && val.trim()) {
          const cleaned = val.replace(/^(add skill|skill is|my skill is|add)\s+/gi, "").trim();
          if (cleaned && !skills.includes(cleaned)) {
            setSkills((prev) => [...prev, cleaned]);
          }
        }
      },
      aliases: ["skills", "skill", "competency", "add skill", "add key competency"],
    });

    formContext.registerField({
      id: "resume",
      label: "Resume File",
      elementId: "resume-upload",
      getValue: () => resumeName || "",
      setValue: (val) => {
        if (val && val.trim()) {
          const cleaned = val.replace(/^(my resume is|resume is|upload resume|resume file is)\s+/gi, "").trim();
          if (cleaned) {
            setResumeName(cleaned.includes(".") ? cleaned : `${cleaned}.pdf`);
          }
        }
      },
      aliases: ["resume", "cv", "upload resume", "attached resume", "resume file"],
    });

    formContext.registerField({
      id: "accommodation",
      label: "Accommodation Preferences",
      elementId: "prof-acc",
      getValue: () => accommodationPrefs,
      setValue: (val) => setAccommodationPrefs(val),
      aliases: ["accommodations", "accommodation preferences", "accessibility needs"],
    });

    return () => {
      formContext.clearAll();
    };
  }, [fullName, email, phone, location, summary, skills, resumeName, accommodationPrefs]);

  // Focus cleanup on unmount
  useEffect(() => {
    return () => {
      formContext.clearAllFocusStyles();
    };
  }, []);

  // Voice dictation handlers for individual fields
  const handleVoiceNameDictation = () => {
    formContext.focusElement("prof-name");
    setActiveVoiceField("name");
    announce("Listening for full name...");
    startVoiceInput(
      (spokenText) => {
        setFullName(spokenText);
        announce(`Full name set to ${spokenText}`);
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleVoicePhoneDictation = () => {
    formContext.focusElement("prof-phone");
    setActiveVoiceField("phone");
    announce("Listening for phone number...");
    startVoiceInput(
      (spokenText) => {
        setPhone(spokenText);
        announce(`Phone number set to ${spokenText}`);
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleVoiceLocationDictation = () => {
    formContext.focusElement("prof-location");
    setActiveVoiceField("location");
    announce("Listening for location...");
    startVoiceInput(
      (spokenText) => {
        setLocation(spokenText);
        announce(`Location set to ${spokenText}`);
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleVoiceSummaryDictation = () => {
    formContext.focusElement("prof-summary");
    setActiveVoiceField("summary");
    announce("Listening for professional summary dictation...");
    startVoiceInput(
      (spokenText) => {
        setSummary((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
        announce("Professional summary updated via voice input.");
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleVoiceAccDictation = () => {
    formContext.focusElement("prof-acc");
    setActiveVoiceField("accommodation");
    announce("Listening for accommodation preferences dictation...");
    startVoiceInput(
      (spokenText) => {
        setAccommodationPrefs((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
        announce("Accommodation preferences updated via voice input.");
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleVoiceSkillDictation = () => {
    formContext.focusElement("add-skill-input");
    setActiveVoiceField("skill");
    announce("Listening for skill name...");
    startVoiceInput(
      (spokenText) => {
        setNewSkill(spokenText);
        announce(`Skill input set to ${spokenText}`);
        setActiveVoiceField(null);
      },
      () => setActiveVoiceField(null)
    );
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updated = [...skills, newSkill.trim()];
      setSkills(updated);
      setNewSkill("");
      announce(`Added skill ${newSkill}`);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    announce(`Removed skill ${skillToRemove}`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeName(file.name);
      announce(`Uploaded resume file ${file.name}`);
      speak(`Uploaded resume file ${file.name}`);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateProfile({
      name: fullName,
      phone,
      location,
      summary,
      skills,
      resumeName,
      accessNeed: accommodationPrefs,
    });
    setIsSavedAlert(true);
    announce("Job Seeker profile saved successfully.");
    speak("Job Seeker profile saved successfully.");
    setTimeout(() => setIsSavedAlert(false), 4000);
  };

  const completionPercentage = [
    fullName,
    email,
    phone,
    location,
    summary,
    skills.length > 0,
    resumeName,
    accommodationPrefs,
  ].filter(Boolean).length * 12.5;

  return (
    <div className="seeker-profile-page" role="region" aria-labelledby="profile-heading">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span className="badge-type" style={{ padding: "4px 12px", fontSize: "13px" }}>
            Job Seeker View
          </span>
        </div>
        <h1 id="profile-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Job Seeker Profile
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Manage your career summary, accessible preferences, resume, and skills for equal opportunity employers.
        </p>
      </div>

      {isSavedAlert && (
        <div className="error-banner" style={{ background: "#EFF6FF", border: "1px solid #2563EB", color: "#1D4ED8", marginBottom: "20px" }} role="alert">
          <CheckCircle2 size={16} />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Completion Card */}
      <div className="completion-card">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", marginBottom: "4px" }}>
          <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>Profile Completion Status</strong>
          <span className="completion-badge">{Math.min(100, Math.round(completionPercentage))}% Complete</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, completionPercentage)}%` }} />
        </div>
      </div>

      <form onSubmit={handleSaveProfile} onKeyDown={handleFormArrowKeys} className="profile-form-grid">
        {/* Section 1: Personal & Contact Information */}
        <div className="form-card" tabIndex={0}>
          <h2>Personal & Contact Information</h2>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="prof-name" className="filter-label">Full Name (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="prof-name"
                  name="name"
                  type="text"
                  className="text-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  required
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceField === "name" && isListening ? "listening" : ""}`}
                  onClick={handleVoiceNameDictation}
                  aria-label="Dictate full name using voice recognition"
                  title="Dictate Full Name"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="prof-email" className="filter-label">Email Address</label>
              <input
                id="prof-email"
                name="email"
                type="email"
                className="text-input"
                value={email}
                disabled
              />
              <span className="field-help">Email cannot be changed after registration.</span>
            </div>
          </div>

          <div className="form-row-2" style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label htmlFor="prof-phone" className="filter-label">Phone Number (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="prof-phone"
                  name="phone"
                  type="text"
                  className="text-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceField === "phone" && isListening ? "listening" : ""}`}
                  onClick={handleVoicePhoneDictation}
                  aria-label="Dictate phone number using voice recognition"
                  title="Dictate Phone Number"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="prof-location" className="filter-label">Location (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="prof-location"
                  name="location"
                  type="text"
                  className="text-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  placeholder="e.g. Chennai, India"
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceField === "location" && isListening ? "listening" : ""}`}
                  onClick={handleVoiceLocationDictation}
                  aria-label="Dictate location using voice recognition"
                  title="Dictate Location"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Professional Summary (Voice Dictation Supported) */}
        <div className="form-card" tabIndex={0}>
          <h2>Professional Summary</h2>
          <div className="form-group">
            <label htmlFor="prof-summary" className="filter-label">
              Career Bio & Overview (Voice Dictation Supported)
            </label>
            <div className="input-with-mic">
              <textarea
                id="prof-summary"
                name="summary"
                rows={4}
                className="text-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onFocus={() => formContext.clearAllFocusStyles()}
                placeholder="Describe your career goals, key achievements, and accessibility strengths..."
              />
              <button
                type="button"
                className={`mic-btn ${activeVoiceField === "summary" && isListening ? "listening" : ""}`}
                onClick={handleVoiceSummaryDictation}
                aria-label="Dictate professional summary using voice speech recognition"
                title="Dictate Summary"
              >
                <Mic size={15} />
                <span>Dictate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Skills & Expertise */}
        <div className="form-card" tabIndex={0}>
          <h2>Skills & Expertise</h2>
          <div className="form-group">
            <label htmlFor="add-skill-input" className="filter-label">Add Key Competency (Voice Input Supported)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="input-with-mic" style={{ flex: 1 }}>
                <input
                  id="add-skill-input"
                  type="text"
                  className="text-input"
                  placeholder="e.g. React, Python, ARIA Semantics"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceField === "skill" && isListening ? "listening" : ""}`}
                  onClick={handleVoiceSkillDictation}
                  aria-label="Dictate skill using voice recognition"
                  title="Dictate Skill"
                >
                  <Mic size={15} />
                </button>
              </div>
              <button type="button" className="secondary-btn" onClick={handleAddSkill}>
                <Plus size={15} />
                <span>Add Skill</span>
              </button>
            </div>
          </div>

          <div className="badge-row" style={{ marginTop: "16px" }}>
            {skills.map((skill) => (
              <span key={skill} className="badge-type" style={{ padding: "6px 12px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  aria-label={`Remove skill ${skill}`}
                  style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", display: "inline-flex", padding: 0 }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Section 4: Resume & Document Upload */}
        <div className="form-card" tabIndex={0}>
          <h2>Resume & Accessibility Accommodations</h2>
          <div className="form-group">
            <label htmlFor="resume-upload" className="filter-label">Attached Resume File</label>
            <div style={{ border: "2px dashed var(--border-color)", padding: "24px", borderRadius: "var(--radius-md)", textAlign: "center", background: "var(--bg-primary)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <FileText size={20} color="#2563EB" />
                <strong style={{ color: "var(--text-primary)" }}>Current Resume:</strong> {resumeName || "No file uploaded yet"}
              </div>
              <div style={{ marginTop: "14px" }}>
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <label htmlFor="resume-upload" className="secondary-btn" style={{ display: "inline-flex", cursor: "pointer" }}>
                  <Upload size={15} />
                  <span>Upload New Resume File</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "20px" }}>
            <label htmlFor="prof-acc" className="filter-label">Workplace Accommodation Preferences (Voice Input Supported)</label>
            <div className="input-with-mic">
              <textarea
                id="prof-acc"
                name="accommodation"
                rows={3}
                className="text-input"
                value={accommodationPrefs}
                onChange={(e) => setAccommodationPrefs(e.target.value)}
                onFocus={() => formContext.clearAllFocusStyles()}
                placeholder="e.g. Screen reader software required, flexible remote schedule..."
              />
              <button
                type="button"
                className={`mic-btn ${activeVoiceField === "accommodation" && isListening ? "listening" : ""}`}
                onClick={handleVoiceAccDictation}
                aria-label="Dictate accommodation preferences using voice recognition"
                title="Dictate Accommodations"
              >
                <Mic size={15} />
                <span>Dictate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Action */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="primary-btn-large" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Save size={18} />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
