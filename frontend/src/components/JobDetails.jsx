import { useState, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import {
  MapPin,
  Briefcase,
  IndianRupee,
  Calendar,
  Volume2,
  Bookmark,
  CheckCircle,
  ArrowLeft,
  Send,
  Mic,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";
import { fetchJobByIdApi } from "../services/api";
import { formContext } from "../assistant/FormContextService";
import { getJobId, isJobSaved } from "../utils/jobUtils";
import { conversationMemory } from "../assistant/ConversationContext";

export default function JobDetails({
  jobId,
  jobs = [],
  applications = [],
  savedJobIds = [],
  currentUser = null,
  onApplyJob,
  onToggleSaveJob,
  navigate,
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const { speak, announce, startVoiceInput, isListening } = useAccessibility();

  const isFromRecommendations = conversationMemory.sequenceType === "recommendations";
  const isFromSavedJobs = conversationMemory.sequenceType === "savedJobs";
  const backRoute = isFromSavedJobs ? "/saved-jobs" : isFromRecommendations ? "/recommendations" : "/jobs";
  const backLabel = isFromSavedJobs ? "Back to Saved Jobs" : isFromRecommendations ? "Back to Recommendations" : "Back to Find Jobs";
  const backAria = isFromSavedJobs ? "Go back to Saved Jobs page" : isFromRecommendations ? "Go back to Recommendations page" : "Go back to Find Jobs page";

  // Load target job on mount or jobId change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadJobDetails() {
      const targetId = String(jobId || "");
      // 1. Try to find job from state/props
      const foundInProps = jobs.find((j) => getJobId(j) === targetId);
      if (foundInProps) {
        if (isMounted) {
          setJob(foundInProps);
          setLoading(false);
        }
        return;
      }

      // 2. Fallback to API fetch GET /api/jobs/:jobId
      try {
        const apiJob = await fetchJobByIdApi(jobId);
        if (apiJob && isMounted) {
          setJob(apiJob);
          setLoading(false);
        } else if (isMounted) {
          setError("Job not found. This job may have been removed or is no longer available.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        if (isMounted) {
          setError("Unable to load this job.");
          setLoading(false);
        }
      }
    }

    if (jobId) {
      loadJobDetails();
    } else {
      setLoading(false);
      setError("No job specified.");
    }

    return () => {
      isMounted = false;
    };
  }, [jobId, jobs]);

  // Screen reader introduction when job loads
  useEffect(() => {
    if (job) {
      announce(`Loaded job details for ${job.title} at ${job.company}`);
      const headingEl = document.getElementById("job-details-heading");
      if (headingEl) {
        headingEl.focus();
      }
    }
  }, [job, announce]);

  // Register coverNote with Form Context when application form is shown
  useEffect(() => {
    if (showApplyForm) {
      formContext.registerField({
        id: "coverNote",
        label: "Cover Note",
        elementId: "cover-note-input",
        getValue: () => coverNote,
        setValue: (val) => setCoverNote(val),
        aliases: ["cover note", "note", "accommodation request"],
      });
    }
    return () => {
      formContext.unregisterField("coverNote");
    };
  }, [showApplyForm, coverNote]);

  const currentJobId = job ? getJobId(job) : "";
  const isSaved = job ? isJobSaved(job, savedJobIds) : false;

  const isApplied = job
    ? justApplied ||
      applications.some(
        (a) =>
          (String(a.jobId) === currentJobId || String(a.jobId) === String(job.id)) &&
          (!currentUser || a.seekerEmail === currentUser?.email)
      )
    : false;

  // Format skills into array
  const formattedSkills = job
    ? Array.isArray(job.skills)
      ? job.skills
      : typeof job.skills === "string"
      ? job.skills.split(",").map((s) => s.trim())
      : Array.isArray(job.requiredSkills)
      ? job.requiredSkills
      : ["JavaScript", "React", "HTML", "CSS"]
    : [];

  // Format accommodations into array
  const formattedAccommodations = job
    ? Array.isArray(job.accommodations)
      ? job.accommodations
      : typeof job.accommodations === "string"
      ? job.accommodations.split(",").map((s) => s.trim())
      : Array.isArray(job.accessibilityInformation)
      ? job.accessibilityInformation
      : Array.isArray(job.accessibilityAccommodations)
      ? job.accessibilityAccommodations
      : [
          "Screen Reader Compatible",
          "Flexible Working Hours",
          "Remote Work Options",
          "Assistive Technology Support",
        ]
    : [];

  // Read page aloud handler
  const handleReadPageAloud = () => {
    if (!job) return;
    const fullText = `
      You are viewing ${job.title} at ${job.company}.
      Location: ${job.location}.
      Employment type: ${job.jobType || job.workMode || job.employmentType || "Full-Time"}.
      Salary: ${job.salary || "Competitive Compensation"}.
      Job description: ${job.description || "Detailed software engineering responsibilities."}.
      Required skills: ${formattedSkills.join(", ")}.
      Accessibility accommodations: ${formattedAccommodations.join(", ")}.
    `;
    speak(fullText, true);
    announce("Reading complete job details aloud.");
  };

  // Handle Apply Now Submit
  const handleApplyClick = () => {
    if (!currentUser) {
      if (navigate) navigate("/login");
      return;
    }
    if (currentUser.role === "employer" || currentUser.role === "admin") {
      announce("Only Job Seekers can apply for job listings.");
      return;
    }
    if (isApplied) {
      announce("You have already applied for this job.");
      return;
    }
    setShowApplyForm(true);
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!job) return;

    if (onApplyJob) {
      await onApplyJob(job, coverNote);
    }
    setJustApplied(true);
    setShowApplyForm(false);
    announce(`Application submitted successfully for ${job.title} at ${job.company}.`);
    speak(`Application submitted successfully for ${job.title}!`);
  };

  // Loading State UI
  if (loading) {
    return (
      <div
        className="empty-state-card"
        style={{ maxWidth: "800px", margin: "48px auto", padding: "64px 32px", textAlign: "center" }}
        role="region"
        aria-live="polite"
        aria-label="Loading job details"
      >
        <div
          className="spinner"
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--border-color)",
            borderTopColor: "var(--accent-blue)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px auto",
          }}
        />
        <h2 tabIndex={0} style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
          Loading job details...
        </h2>
      </div>
    );
  }

  // Error / Not Found State UI
  if (error || !job) {
    return (
      <div
        className="empty-state-card"
        style={{ maxWidth: "700px", margin: "48px auto", padding: "48px 32px", textAlign: "center" }}
        role="region"
        aria-label="Job not found error"
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            background: "#FEE2E2",
            color: "#DC2626",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
          }}
        >
          <AlertCircle size={32} />
        </div>
        <h2 tabIndex={0} style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
          {error || "Unable to load this job."}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "28px" }}>
          The requested job could not be found or may have been removed.
        </p>
        <button
          className="primary-btn"
          onClick={() => (navigate ? navigate(backRoute) : null)}
          aria-label={backAria}
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="job-details-page"
      role="region"
      aria-labelledby="job-details-heading"
      style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "40px" }}
    >
      {/* Top Navigation Back Link */}
      <button
        className="secondary-btn"
        onClick={() => (navigate ? navigate(backRoute) : null)}
        aria-label={backAria}
        style={{ marginBottom: "24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        <ArrowLeft size={16} />
        <span>{backLabel}</span>
      </button>

      {/* Main Job Details Card */}
      <div
        className="job-details-card"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "36px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1
              id="job-details-heading"
              tabIndex={0}
              style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}
            >
              {job.title}
            </h1>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent-blue)", marginBottom: "16px" }}>
              {job.company || job.companyName}
            </div>
          </div>

          {job.matchScore && (
            <span className="badge-match" style={{ padding: "8px 16px", fontSize: "15px" }}>
              <Sparkles size={16} />
              <span>{job.matchScore}% Match</span>
            </span>
          )}
        </div>

        {/* Overview Meta Pills Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            background: "var(--bg-primary)",
            padding: "20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            margin: "20px 0 28px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
            <MapPin size={20} color="var(--accent-blue)" />
            <span>
              <strong>Location:</strong> {job.location}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
            <Briefcase size={20} color="var(--accent-blue)" />
            <span>
              <strong>Employment Type:</strong> {job.jobType || job.workMode || job.employmentType || "Full-Time"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
            <IndianRupee size={20} color="var(--accent-blue)" />
            <span>
              <strong>Salary:</strong> {job.salary || "Competitive Compensation"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px" }}>
            <Calendar size={20} color="var(--accent-blue)" />
            <span>
              <strong>Experience:</strong> {job.experience || job.experienceLevel || "2+ years"}
            </span>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: "28px 0" }} />

        {/* SECTION 1: JOB DESCRIPTION */}
        <section style={{ marginBottom: "32px" }} aria-labelledby="section-job-desc">
          <h2 id="section-job-desc" style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px", letterSpacing: "-0.3px" }}>
            Job Description
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-primary)", whiteSpace: "pre-line" }}>
            {job.description || `Join ${job.company || job.companyName} as a ${job.title}. In this role, you will be responsible for creating accessible web applications, writing clean production software code, collaborating with cross-functional teams, and implementing WCAG 2.1 AA compliant UI features.`}
          </p>
        </section>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: "28px 0" }} />

        {/* SECTION 2: REQUIRED SKILLS */}
        <section style={{ marginBottom: "32px" }} aria-labelledby="section-req-skills">
          <h2 id="section-req-skills" style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "14px", letterSpacing: "-0.3px" }}>
            Required Skills
          </h2>
          <ul style={{ listStyleType: "disc", paddingLeft: "24px", margin: 0, fontSize: "16px", color: "var(--text-primary)", lineHeight: "1.8" }}>
            {formattedSkills.map((skill, idx) => (
              <li key={idx} style={{ marginBottom: "6px" }}>
                <strong>{skill}</strong>
              </li>
            ))}
          </ul>
        </section>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: "28px 0" }} />

        {/* SECTION 3: ACCESSIBILITY & ACCOMMODATIONS */}
        <section style={{ marginBottom: "36px" }} aria-labelledby="section-access-acc">
          <h2 id="section-access-acc" style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent-blue)", marginBottom: "14px", letterSpacing: "-0.3px" }}>
            Accessibility & Accommodations
          </h2>
          <div
            style={{
              background: "var(--bg-highlight)",
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
            }}
          >
            <ul style={{ listStyleType: "disc", paddingLeft: "24px", margin: 0, fontSize: "16px", color: "var(--text-primary)", lineHeight: "1.8" }}>
              {formattedAccommodations.map((acc, idx) => (
                <li key={idx} style={{ marginBottom: "6px" }}>
                  <span>{acc}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-color)", margin: "28px 0" }} />

        {/* SECTION 4: APPLICATION INFORMATION */}
        <section style={{ marginBottom: "36px" }} aria-labelledby="section-app-info">
          <h2 id="section-app-info" style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "14px", letterSpacing: "-0.3px" }}>
            Application Information
          </h2>
          <div
            style={{
              background: "var(--bg-primary)",
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Application Deadline</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>{job.applicationDeadline || "Open until filled"}</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Employment Type</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>{job.jobType || job.workMode || job.employmentType || "Full-Time"}</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Location</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>{job.location}</div>
            </div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "700" }}>Posted Date</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>{job.postedDate || "Recently"}</div>
            </div>
          </div>
        </section>

        {/* Inline Application Form */}
        {showApplyForm && !isApplied && (
          <form
            onSubmit={handleConfirmSubmit}
            style={{
              marginBottom: "32px",
              padding: "24px",
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--accent-blue)",
            }}
          >
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              Complete Your Application
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Applying as <strong>{currentUser?.name || "Job Seeker"}</strong> ({currentUser?.email || "seeker@echohire.com"})
            </p>

            <div className="form-group">
              <label htmlFor="cover-note-input" className="filter-label">
                Cover Note / Workplace Accommodations Request (Optional)
              </label>
              <div className="input-with-mic">
                <textarea
                  id="cover-note-input"
                  rows={3}
                  className="text-input"
                  placeholder="Mention any specific screen reader preferences, assistive device needs, or cover note details..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                />
                <button
                  type="button"
                  className={`mic-btn ${isListening ? "listening" : ""}`}
                  onClick={() => {
                    startVoiceInput((spokenText) => {
                      setCoverNote((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
                    });
                  }}
                  aria-label="Dictate cover note using voice recognition"
                  title="Dictate Cover Note"
                >
                  <Mic size={15} />
                  <span>Dictate</span>
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button type="submit" className="primary-btn">
                <Send size={16} />
                <span>Submit Application Now</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowApplyForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* PRIMARY ACTION BUTTONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          {/* APPLY NOW / APPLIED BUTTON */}
          {isApplied ? (
            <button
              className="primary-btn applied"
              disabled
              style={{
                padding: "14px 28px",
                fontSize: "16px",
                fontWeight: "800",
                background: "#166534",
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "default",
              }}
              aria-label={`You have applied for ${job.title}`}
            >
              <CheckCircle size={20} />
              <span>Applied ✓</span>
            </button>
          ) : (
            <button
              className="primary-btn-large"
              onClick={handleApplyClick}
              style={{
                padding: "14px 32px",
                fontSize: "17px",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
              aria-label={`Apply Now for ${job.title} at ${job.company}`}
            >
              <Send size={18} />
              <span>Apply Now</span>
            </button>
          )}

          {/* READ PAGE ALOUD BUTTON */}
          <button
            className="btn-audio-listen"
            onClick={handleReadPageAloud}
            style={{ padding: "12px 24px", fontSize: "15px", fontWeight: "700" }}
            aria-label="Read page details aloud using text to speech"
          >
            <Volume2 size={18} />
            <span>Read Page Aloud</span>
          </button>

          {/* SAVE JOB BUTTON */}
          <button
            type="button"
            className={`btn-save ${isSaved ? "saved" : ""}`}
            onClick={() => onToggleSaveJob && onToggleSaveJob(job)}
            style={{ padding: "12px 20px", fontSize: "15px" }}
            aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          >
            <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
