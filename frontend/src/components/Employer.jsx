import { useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import { handleFormArrowKeys } from "../utils/keyboard";
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  PlusCircle,
  Trash2,
  ExternalLink,
  Building2,
  FileText,
  Mic,
} from "lucide-react";

export default function Employer({
  jobs,
  onCreateJob,
  onDeleteJob,
  applications,
  onUpdateAppStatus,
}) {
  const { currentUser } = useAuth();
  const { startVoiceInput, isListening, announce } = useAccessibility();

  const [activeTab, setActiveTab] = useState("overview");

  // Form states for creating job
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(currentUser?.company || "TechCorp Solutions");
  const [location, setLocation] = useState("Bangalore, India");
  const [type, setType] = useState("Full-Time");
  const [salary, setSalary] = useState("₹8–14 LPA");
  const [description, setDescription] = useState("");
  const [accommodationsText, setAccommodationsText] = useState(
    "Screen Reader Hardware Provided, Flexible Remote Work, Voice Assistant Tools"
  );
  const [formSuccess, setFormSuccess] = useState(false);

  // Selected Candidate Modal state
  const [selectedAppModal, setSelectedAppModal] = useState(null);

  // Register fields with Echo Assistant Form Context when Post Job tab is active
  useEffect(() => {
    if (activeTab === "post") {
      formContext.registerField({
        id: "title",
        label: "Job Title",
        elementId: "post-title",
        getValue: () => title,
        setValue: (val) => setTitle(val),
        aliases: ["job title", "title", "position"],
      });

      formContext.registerField({
        id: "company",
        label: "Company Name",
        elementId: "post-company",
        getValue: () => company,
        setValue: (val) => setCompany(val),
        aliases: ["company name", "company", "organization"],
      });

      formContext.registerField({
        id: "location",
        label: "Location",
        elementId: "post-location",
        getValue: () => location,
        setValue: (val) => setLocation(val),
        aliases: ["job location", "location", "city"],
      });

      formContext.registerField({
        id: "salary",
        label: "Salary",
        elementId: "post-salary",
        getValue: () => salary,
        setValue: (val) => setSalary(val),
        aliases: ["salary", "pay", "compensation"],
      });

      formContext.registerField({
        id: "description",
        label: "Job Description",
        elementId: "post-description",
        getValue: () => description,
        setValue: (val) => setDescription(val),
        aliases: ["job description", "description", "details"],
      });
    }

    return () => {
      formContext.clearAll();
    };
  }, [activeTab, title, company, location, salary, description]);

  const [activeVoiceFieldId, setActiveVoiceFieldId] = useState(null);

  useEffect(() => {
    return () => {
      formContext.clearAllFocusStyles();
    };
  }, []);

  // Voice dictation helper for form inputs
  const dictateField = (setter, label, elementId) => {
    if (elementId) {
      formContext.focusElement(elementId);
      setActiveVoiceFieldId(elementId);
    }
    announce(`Listening for ${label}...`);
    startVoiceInput(
      (spokenText) => {
        setter((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
        announce(`${label} updated via voice input.`);
        setActiveVoiceFieldId(null);
      },
      () => setActiveVoiceFieldId(null)
    );
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!title || !description) return;

    const accommodationsArr = accommodationsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await onCreateJob({
      title,
      company: currentUser?.company || company,
      companyId: currentUser?.companyId || currentUser?.company || "company-1",
      recruiterId: currentUser?.id || "recruiter-1",
      location,
      type,
      salary,
      description,
      accommodations: accommodationsArr,
      postedDate: "Just now",
      skills: ["accessibility", "testing"],
    });

    setFormSuccess(true);
    announce(`Published job listing for ${title}`);
    setTitle("");
    setDescription("");
    setTimeout(() => setFormSuccess(false), 4000);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Shortlisted": return "status-shortlisted";
      case "Interview": return "status-interview";
      case "Selected": return "status-selected";
      case "Rejected": return "status-rejected";
      default: return "status-applied";
    }
  };

  return (
    <div className="employer-page" role="region" aria-labelledby="employer-heading">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span className="badge-type" style={{ background: "#0F172A", color: "#FFFFFF", padding: "4px 12px", fontSize: "13px" }}>
            {currentUser?.company ? `${currentUser.company} — Recruiter Portal` : "Recruiter & Employer Portal"}
          </span>
        </div>
        <h1 id="employer-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Employer & Recruiter Portal
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Publish accessible job postings for {currentUser?.company || "your organization"}, evaluate candidate applications, and build an inclusive workforce.
        </p>
      </div>

      {/* SaaS Statistics Grid */}
      <div className="stats-cards-grid">
        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="stat-value">{jobs.length}</div>
            <div className="stat-label">My Active Jobs</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{applications.length}</div>
            <div className="stat-label">Applicants to My Jobs</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">
              {applications.filter((a) => a.status === "Shortlisted" || a.status === "Selected").length}
            </div>
            <div className="stat-label">My Shortlisted Candidates</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-value">
              {applications.filter((a) => a.status === "Under Review" || a.status === "Interview").length}
            </div>
            <div className="stat-label">My Pending Interviews</div>
          </div>
        </div>
      </div>

      {/* Management Tabs */}
      <div className="employer-tabs" role="tablist" onKeyDown={handleFormArrowKeys}>
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Manage My Job Listings ({jobs.length})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "post"}
          className={`tab-btn ${activeTab === "post" ? "active" : ""}`}
          onClick={() => setActiveTab("post")}
        >
          Post a New Job
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "applicants"}
          className={`tab-btn ${activeTab === "applicants" ? "active" : ""}`}
          onClick={() => setActiveTab("applicants")}
        >
          Review Applicants to My Jobs ({applications.length})
        </button>
      </div>

      {/* Tab 1: Manage Job Listings */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {jobs.map((job) => (
            <div key={job.id} className="form-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{job.title}</h3>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
                    {job.company} · {job.location} · {job.salary}
                  </div>
                  {job.accommodations && (
                    <div className="badge-row" style={{ marginTop: "8px" }}>
                      {job.accommodations.map((acc, idx) => (
                        <span key={idx} className="badge-access">
                          {acc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-danger-sm"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove ${job.title}?`)) {
                        onDeleteJob(job.id);
                        announce(`Removed job posting ${job.title}`);
                      }
                    }}
                    aria-label={`Delete job posting ${job.title}`}
                  >
                    <Trash2 size={14} />
                    <span>Delete Listing</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Post a New Job (Voice Input Supported) */}
      {activeTab === "post" && (
        <form onSubmit={handlePostJob} onKeyDown={handleFormArrowKeys} className="form-card">
          <h2>Create Accessible Job Listing</h2>

          {formSuccess && (
            <div className="alert-banner-success" role="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} color="#15803D" />
              <span>Job listing published live to EchoHire marketplace!</span>
            </div>
          )}

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="post-title" className="filter-label">Job Title (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="post-title"
                  type="text"
                  className="text-input"
                  placeholder="e.g. Senior Accessibility QA Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  required
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "post-title" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setTitle, "Job Title", "post-title")}
                  aria-label="Dictate job title"
                  title="Dictate Job Title"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="post-company" className="filter-label">Company Name (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="post-company"
                  type="text"
                  className="text-input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                  required
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "post-company" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setCompany, "Company Name", "post-company")}
                  aria-label="Dictate company name"
                  title="Dictate Company Name"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="form-row-3" style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label htmlFor="post-location" className="filter-label">Location (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="post-location"
                  type="text"
                  className="text-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "post-location" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setLocation, "Location", "post-location")}
                  aria-label="Dictate location"
                  title="Dictate Location"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="post-type" className="filter-label">Employment Type</label>
              <select
                id="post-type"
                className="select-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="post-salary" className="filter-label">Salary Compensation (Voice Input Supported)</label>
              <div className="input-with-mic">
                <input
                  id="post-salary"
                  type="text"
                  className="text-input"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  onFocus={() => formContext.clearAllFocusStyles()}
                />
                <button
                  type="button"
                  className={`mic-btn ${activeVoiceFieldId === "post-salary" && isListening ? "listening" : ""}`}
                  onClick={() => dictateField(setSalary, "Salary", "post-salary")}
                  aria-label="Dictate salary"
                  title="Dictate Salary"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label htmlFor="post-desc" className="filter-label">Job Description (Voice Input Supported)</label>
            <div className="input-with-mic">
              <textarea
                id="post-desc"
                rows={4}
                className="text-input"
                placeholder="Provide role expectations, team structure, and skills required..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => formContext.clearAllFocusStyles()}
                required
              />
              <button
                type="button"
                className={`mic-btn ${activeVoiceFieldId === "post-desc" && isListening ? "listening" : ""}`}
                onClick={() => dictateField(setDescription, "Job Description", "post-desc")}
                aria-label="Dictate job description"
                title="Dictate Job Description"
              >
                <Mic size={15} />
                <span>Dictate</span>
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label htmlFor="post-acc" className="filter-label">
              Accessibility Accommodations Provided (Voice Input Supported)
            </label>
            <div className="input-with-mic">
              <input
                id="post-acc"
                type="text"
                className="text-input"
                value={accommodationsText}
                onChange={(e) => setAccommodationsText(e.target.value)}
                onFocus={() => formContext.clearAllFocusStyles()}
              />
              <button
                type="button"
                className={`mic-btn ${activeVoiceFieldId === "post-acc" && isListening ? "listening" : ""}`}
                onClick={() => dictateField(setAccommodationsText, "Accommodations", "post-acc")}
                aria-label="Dictate accommodations"
                title="Dictate Accommodations"
              >
                <Mic size={15} />
              </button>
            </div>
          </div>

          <button type="submit" className="primary-btn-large" style={{ marginTop: "20px" }}>
            <PlusCircle size={18} />
            <span>Publish Job Listing Live</span>
          </button>
        </form>
      )}

      {/* Tab 3: Review Applicants */}
      {activeTab === "applicants" && (
        <div className="table-responsive">
          <table className="accessible-table" aria-label="Job Applications Evaluation Table">
            <caption>Candidates and Application Evaluation Log</caption>
            <thead>
              <tr>
                <th scope="col">Candidate Name</th>
                <th scope="col">Job Position</th>
                <th scope="col">Applied Date</th>
                <th scope="col">Status Evaluation</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <strong>{app.seekerName}</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{app.seekerEmail}</div>
                  </td>
                  <td>{app.jobTitle}</td>
                  <td>{app.appliedDate}</td>
                  <td>
                    <select
                      className={`select-input ${getStatusBadgeClass(app.status)}`}
                      value={app.status}
                      onChange={(e) => onUpdateAppStatus(app.id, e.target.value)}
                      aria-label={`Update application status for ${app.seekerName}`}
                      style={{ padding: "4px 8px", fontSize: "13px" }}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="secondary-btn"
                      onClick={() => setSelectedAppModal(app)}
                      aria-label={`View candidate profile for ${app.seekerName}`}
                      style={{ padding: "4px 10px", fontSize: "13px" }}
                    >
                      View Candidate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Candidate Profile Evaluation Modal */}
      {selectedAppModal && (
        <div className="modal-overlay" onClick={() => setSelectedAppModal(null)} role="dialog" aria-modal="true">
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0, color: "var(--text-primary)" }}>
                  {selectedAppModal.seekerName}
                </h2>
                <span style={{ fontSize: "14px", color: "var(--accent-blue)", fontWeight: "700" }}>
                  Applicant for {selectedAppModal.jobTitle} at {selectedAppModal.company}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setSelectedAppModal(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div><strong>Email:</strong> {selectedAppModal.seekerEmail}</div>
                <div><strong>Applied Date:</strong> {selectedAppModal.appliedDate}</div>
              </div>

              {selectedAppModal.coverNote && (
                <div style={{ background: "var(--bg-primary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "6px" }}>Candidate Cover Note & Accommodation Request</h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>{selectedAppModal.coverNote}</p>
                </div>
              )}

              <div style={{ border: "1px dashed var(--border-color)", padding: "16px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={20} color="#2563EB" />
                  <div>
                    <strong>Candidate Resume:</strong> {selectedAppModal.resumeName || "Rahul_Sharma_Resume.pdf"}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setSelectedAppModal(null)}>
                Close Evaluation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
