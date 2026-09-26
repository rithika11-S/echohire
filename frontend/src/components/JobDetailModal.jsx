import { useState, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import { X, Volume2, Bookmark, CheckCircle, Send, Mic } from "lucide-react";

export default function JobDetailModal({
  job,
  onClose,
  onApplySubmit,
  isSaved,
  onToggleSave,
  isApplied,
  openAuthModal,
}) {
  const [coverNote, setCoverNote] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);

  const { speak, announce, startVoiceInput, isListening } = useAccessibility();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (job) {
      announce(`Job details opened for ${job.title} at ${job.company}`);
      setTimeout(() => {
        const titleEl = document.getElementById("job-detail-title");
        if (titleEl) titleEl.focus();
      }, 100);
    }
  }, [job, announce]);

  if (!job) return null;

  const handleReadJobAloud = () => {
    const fullText = `
      Job Title: ${job.title}.
      Company: ${job.company}.
      Location: ${job.location}.
      Salary Range: ${job.salary}.
      Job Description: ${job.description}.
      Requirements: ${job.requirements ? job.requirements.join(", ") : "Standard requirements apply."}.
      Accessibility Accommodations: ${job.accommodations ? job.accommodations.join(", ") : "Accessibility supported."}.
    `;
    speak(fullText, true);
    announce("Reading full job description aloud.");
  };

  const handleSubmitApplication = (e) => {
    e.preventDefault();
    onApplySubmit(job, coverNote);
    setShowApplyForm(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="job-detail-title">
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="job-detail-title" style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: "var(--text-primary)" }}>
              {job.title}
            </h2>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "600" }}>
              {job.company} · {job.location}
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close job details modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "28px" }}>
            {/* Left Column: Job Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px", color: "var(--text-primary)" }}>About the Role</h3>
                <p style={{ lineHeight: "1.6", color: "var(--text-primary)" }}>{job.description}</p>
              </div>

              {job.requirements && (
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px", color: "var(--text-primary)" }}>Requirements & Skills</h3>
                  <ul style={{ paddingLeft: "20px", color: "var(--text-primary)" }}>
                    {job.requirements.map((req, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.accommodations && (
                <div style={{ background: "var(--bg-highlight)", padding: "18px", borderRadius: "var(--radius-md)", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", marginBottom: "8px", color: "var(--accent-blue)" }}>
                    Accessibility Accommodations Provided
                  </h3>
                  <div className="badge-row">
                    {job.accommodations.map((acc, idx) => (
                      <span key={idx} className="badge-access">
                        {acc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Application Form */}
              {showApplyForm && (
                <form onSubmit={handleSubmitApplication} style={{ marginTop: "16px", padding: "20px", background: "var(--bg-primary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "12px", color: "var(--text-primary)" }}>
                    Submit Your Application
                  </h3>
                  <div className="form-group">
                    <label htmlFor="cover-note" className="filter-label">
                      Cover Note / Additional Accommodation Request (Voice Dictation Available)
                    </label>
                    <div className="input-with-mic">
                      <textarea
                        id="cover-note"
                        rows={3}
                        className="text-input"
                        placeholder="Mention any specific screen reader or workplace accommodation preferences..."
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
                  <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                    <button type="submit" className="primary-btn">
                      <Send size={15} />
                      <span>Submit Application Now</span>
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => setShowApplyForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: Sidebar Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-primary)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", height: "fit-content" }}>
              <div>
                <span className="badge-type">{job.type}</span>
                <div style={{ marginTop: "14px", fontSize: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div><strong>Salary:</strong> {job.salary}</div>
                  <div><strong>Posted:</strong> {job.postedDate || "Recently"}</div>
                  <div><strong>Location:</strong> {job.location}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                {isApplied ? (
                  <button className="primary-btn applied" disabled>
                    <CheckCircle size={16} />
                    <span>Applied to Position</span>
                  </button>
                ) : (
                  <button
                    className="primary-btn-large"
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal();
                      } else {
                        setShowApplyForm(true);
                      }
                    }}
                  >
                    Apply Now
                  </button>
                )}

                <button
                  type="button"
                  className={`btn-save ${isSaved ? "saved" : ""}`}
                  onClick={() => onToggleSave(job)}
                  aria-label={isSaved ? `Remove ${job?.title || "job"} from saved jobs` : `Save ${job?.title || "job"}`}
                >
                  <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>

                <button className="btn-audio-listen" onClick={handleReadJobAloud}>
                  <Volume2 size={15} />
                  <span>Read Job Aloud</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
