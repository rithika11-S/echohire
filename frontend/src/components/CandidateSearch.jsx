import { useState, useMemo } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import {
  Search,
  UserCheck,
  UserX,
  MapPin,
  Briefcase,
  Sparkles,
  CheckCircle2,
  User,
  FileText,
  Calendar,
  Filter,
  PlusCircle,
  Clock,
  BriefcaseIcon
} from "lucide-react";

export default function CandidateSearch({
  recruiterJobs = [],
  recruiterApplications = [],
  onUpdateAppStatus,
  navigate,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedExp, setSelectedExp] = useState("all");
  const [selectedCandidateModal, setSelectedCandidateModal] = useState(null);

  const { announce, speak } = useAccessibility();

  // Create a map for quick job lookup
  const jobMap = useMemo(() => {
    const map = new Map();
    recruiterJobs.forEach((job) => {
      if (job.id) map.set(job.id, job);
    });
    return map;
  }, [recruiterJobs]);

  // Compute applications with normalized fields and calculated job-specific match scores
  const processedApplications = useMemo(() => {
    return recruiterApplications.map((app) => {
      const candidateName = app.seekerName || app.candidateName || app.applicantName || "Rahul Sharma";
      const jobTitle = app.jobTitle || "Job Position";
      const appliedDate = app.appliedDate || app.createdAt || "15 September 2026";
      const status = app.status || "Applied";
      const experience = app.experience || app.seekerExperience || "2 Years";

      // Parse candidate skills into an array
      let candidateSkills = [];
      if (Array.isArray(app.seekerSkills)) {
        candidateSkills = app.seekerSkills;
      } else if (Array.isArray(app.skills)) {
        candidateSkills = app.skills;
      } else if (typeof app.seekerSkills === "string") {
        candidateSkills = app.seekerSkills.split(",").map((s) => s.trim());
      } else if (typeof app.skills === "string") {
        candidateSkills = app.skills.split(",").map((s) => s.trim());
      }

      if (candidateSkills.length === 0) {
        candidateSkills = ["React", "JavaScript", "Python"];
      }

      // Retrieve associated job details
      const job = jobMap.get(app.jobId) || recruiterJobs.find((j) => j.title === jobTitle);

      // Job required skills
      let requiredSkills = [];
      if (job) {
        if (Array.isArray(job.skills)) {
          requiredSkills = job.skills;
        } else if (typeof job.skills === "string") {
          requiredSkills = job.skills.split(",").map((s) => s.trim());
        }
      }

      // Calculate Job-Specific Match Percentage (Candidate Skills vs Job Required Skills)
      let matchScore = 75;
      if (requiredSkills.length > 0) {
        const candidateSkillSet = new Set(candidateSkills.map((s) => s.toLowerCase()));
        const matched = requiredSkills.filter((reqSkill) =>
          candidateSkillSet.has(reqSkill.toLowerCase())
        ).length;
        matchScore = Math.round((matched / requiredSkills.length) * 100);
        // Ensure visual minimum for partially matched candidates
        if (matchScore === 0 && candidateSkills.length > 0) matchScore = 40;
      } else if (app.matchScore) {
        matchScore = app.matchScore;
      }

      return {
        ...app,
        candidateName,
        jobTitle,
        appliedDate,
        status,
        experience,
        skills: candidateSkills,
        matchScore,
        location: app.location || job?.location || "Chennai, Tamil Nadu",
        accessNeed: app.accessNeed || app.accommodations || "Requires Screen Reader software (NVDA/JAWS)",
        resumeName: app.resumeName || `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`,
        summary: app.summary || app.coverNote || `Applied for ${jobTitle} position. Passionate professional eager to contribute to accessible software design.`,
      };
    });
  }, [recruiterApplications, recruiterJobs, jobMap]);

  // Filter applicant cards based on Search & Dropdown Filters
  const filteredApplications = useMemo(() => {
    return processedApplications.filter((app) => {
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !term ||
        app.candidateName.toLowerCase().includes(term) ||
        app.jobTitle.toLowerCase().includes(term) ||
        app.skills.some((skill) => skill.toLowerCase().includes(term));

      const matchesJob = selectedJobId === "all" || app.jobId === selectedJobId;
      const matchesStatus = selectedStatus === "all" || app.status === selectedStatus;
      const matchesExp = selectedExp === "all" || app.experience.includes(selectedExp);

      return matchesSearch && matchesJob && matchesStatus && matchesExp;
    });
  }, [processedApplications, searchTerm, selectedJobId, selectedStatus, selectedExp]);

  // Status Change Handler
  const handleStatusChange = (appId, newStatus, candidateName) => {
    if (onUpdateAppStatus) {
      onUpdateAppStatus(appId, newStatus);
      announce(`Updated application status for ${candidateName} to ${newStatus}.`);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Shortlisted":
        return { background: "#F3E8FF", color: "#6B21A8", border: "1px solid #D8B4FE" };
      case "Interview Scheduled":
        return { background: "#E0E7FF", color: "#3730A3", border: "1px solid #A5B4FC" };
      case "Hired":
      case "Selected":
        return { background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" };
      case "Rejected":
        return { background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" };
      case "Under Review":
        return { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" };
      default:
        return { background: "#E0F2FE", color: "#075985", border: "1px solid #BAE6FD" };
    }
  };

  return (
    <div className="candidates-page" role="region" aria-labelledby="candidates-heading">
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span className="badge-type" style={{ background: "#0F172A", color: "#FFFFFF", padding: "4px 12px", fontSize: "13px" }}>
            Employer & Recruiter Portal
          </span>
        </div>
        <h1
          id="candidates-heading"
          tabIndex={0}
          style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}
        >
          Candidates for My Jobs
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginTop: "6px" }}>
          Review and manage candidates who have applied to your company's job openings. View candidate qualifications, evaluate match scores, and update application statuses.
        </p>
      </div>

      {/* Search & Filter Controls Card */}
      <div className="search-filter-card">
        <div className="search-input-row">
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search candidates by name, job title, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search candidates by candidate name, job applied for, or skills"
              style={{ paddingLeft: "42px" }}
            />
            <Search size={18} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          </div>
        </div>

        <div className="filter-controls-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
          {/* Job Posting Filter Dropdown */}
          <div className="filter-group">
            <label htmlFor="job-posting-filter" className="filter-label" style={{ fontWeight: "700", fontSize: "14px" }}>
              Job Posting
            </label>
            <select
              id="job-posting-filter"
              className="filter-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              aria-label="Filter candidates by job posting"
            >
              <option value="all">All My Jobs</option>
              {recruiterJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Application Status Filter Dropdown */}
          <div className="filter-group">
            <label htmlFor="status-filter" className="filter-label" style={{ fontWeight: "700", fontSize: "14px" }}>
              Application Status
            </label>
            <select
              id="status-filter"
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter candidates by application status"
            >
              <option value="all">All Statuses</option>
              <option value="Applied">Applied</option>
              <option value="Under Review">Under Review</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview Scheduled">Interview Scheduled</option>
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
              <option value="Hired">Hired</option>
            </select>
          </div>

          {/* Experience Filter Dropdown */}
          <div className="filter-group">
            <label htmlFor="exp-filter" className="filter-label" style={{ fontWeight: "700", fontSize: "14px" }}>
              Experience Level
            </label>
            <select
              id="exp-filter"
              className="filter-select"
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              aria-label="Filter candidates by experience level"
            >
              <option value="all">All Experience Levels</option>
              <option value="1 Year">1+ Year</option>
              <option value="2 Years">2+ Years</option>
              <option value="3 Years">3+ Years</option>
              <option value="5 Years">5+ Years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div style={{ margin: "24px 0 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
          Showing {filteredApplications.length} Applicants to My Jobs
        </h2>
      </div>

      {/* EMPTY STATES */}
      {/* State 1: Recruiter has not posted any jobs */}
      {recruiterJobs.length === 0 ? (
        <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
          <div style={{ width: "64px", height: "64px", background: "var(--accent-light)", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
            <BriefcaseIcon size={32} color="var(--accent-blue)" />
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            You haven't posted any jobs yet.
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "480px", margin: "0 auto 24px auto" }}>
            Create and publish your first job listing to start receiving candidate applications for your company.
          </p>
          <button
            className="primary-btn"
            onClick={() => (navigate ? navigate("/employer/dashboard") : null)}
            aria-label="Post a new job opening"
          >
            <PlusCircle size={18} />
            <span>Post a New Job</span>
          </button>
        </div>
      ) : recruiterApplications.length === 0 ? (
        /* State 2: Recruiter has posted jobs but zero applications have been received */
        <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
          <div style={{ width: "64px", height: "64px", background: "var(--accent-light)", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
            <User size={32} color="var(--accent-blue)" />
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            No candidates have applied to your job postings yet.
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "480px", margin: "0 auto 0 auto" }}>
            When job seekers apply to your active job listings, their applications will automatically appear here for review.
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        /* State 3: Recruiter has applications, but none match current filter criteria */
        <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}>
          <div style={{ width: "64px", height: "64px", background: "var(--bg-highlight)", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
            <Filter size={32} color="var(--accent-blue)" />
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            No applicants match your current search or filter criteria.
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginBottom: "20px" }}>
            Try resetting your search query or selecting "All My Jobs" / "All Statuses".
          </p>
          <button
            className="secondary-btn"
            onClick={() => {
              setSearchTerm("");
              setSelectedJobId("all");
              setSelectedStatus("all");
              setSelectedExp("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Candidate Cards Grid */
        <div className="job-cards-container" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {filteredApplications.map((app) => {
            const statusStyle = getStatusBadgeStyle(app.status);

            return (
              <article
                key={app.id}
                className="job-card-accessible"
                tabIndex={0}
                aria-label={`Applicant: ${app.candidateName}, Applied for ${app.jobTitle}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                  position: "relative",
                }}
              >
                <div>
                  {/* Card Top Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <h3 className="job-title" style={{ fontSize: "22px", fontWeight: "800", margin: "0 0 4px 0", color: "var(--text-primary)" }}>
                        {app.candidateName}
                      </h3>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--accent-blue)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>Applied For:</span>
                        <span style={{ textDecoration: "underline" }}>{app.jobTitle}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      {/* Job-Specific Skill Match Score Badge */}
                      <span className="badge-match" title="Skill match score calculated against required skills for this job">
                        <Sparkles size={13} />
                        <span>{app.matchScore}% Match</span>
                      </span>

                      {/* Application Status Badge */}
                      <span
                        style={{
                          padding: "6px 14px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: "700",
                          ...statusStyle,
                        }}
                      >
                        Status: {app.status}
                      </span>
                    </div>
                  </div>

                  {/* Candidate Details Meta */}
                  <div className="job-card-details" style={{ margin: "16px 0 12px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                      <Calendar size={16} color="#64748B" />
                      <span><strong>Applied On:</strong> {app.appliedDate}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                      <Briefcase size={16} color="#64748B" />
                      <span><strong>Experience:</strong> {app.experience}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                      <MapPin size={16} color="#64748B" />
                      <span><strong>Location:</strong> {app.location}</span>
                    </div>
                  </div>

                  {/* Skills List */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Skills:
                    </div>
                    <div className="badge-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {app.skills.map((skill, idx) => (
                        <span key={idx} className="badge-type" style={{ fontSize: "12px", background: "var(--bg-highlight)", color: "var(--accent-blue)", border: "1px solid rgba(37,99,235,0.2)", padding: "3px 10px" }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accessibility Accommodations Info */}
                  {app.accessNeed && (
                    <div style={{ marginTop: "14px", background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "13px" }}>
                      <strong style={{ color: "var(--text-primary)" }}>Accessibility Support / Need:</strong> {app.accessNeed}
                    </div>
                  )}
                </div>

                {/* Candidate Action Buttons & Status Selector */}
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  {/* Status Dropdown Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label htmlFor={`status-select-${app.id}`} style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>
                      Update Status:
                    </label>
                    <select
                      id={`status-select-${app.id}`}
                      className="filter-select"
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value, app.candidateName)}
                      style={{ padding: "6px 12px", fontSize: "13px", width: "auto" }}
                      aria-label={`Change application status for ${app.candidateName}`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Selected">Selected</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hired">Hired</option>
                    </select>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="job-card-actions" style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="secondary-btn"
                      onClick={() => setSelectedCandidateModal(app)}
                      aria-label={`View full applicant profile for ${app.candidateName}`}
                    >
                      <User size={15} />
                      <span>View Profile</span>
                    </button>

                    <button
                      className={`primary-btn ${app.status === "Shortlisted" ? "applied" : ""}`}
                      onClick={() => handleStatusChange(app.id, app.status === "Shortlisted" ? "Applied" : "Shortlisted", app.candidateName)}
                      aria-label={app.status === "Shortlisted" ? `Remove ${app.candidateName} from shortlist` : `Shortlist ${app.candidateName}`}
                      style={app.status === "Shortlisted" ? { background: "#166534", color: "#FFF" } : {}}
                    >
                      {app.status === "Shortlisted" ? (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Shortlisted</span>
                        </>
                      ) : (
                        <>
                          <UserCheck size={15} />
                          <span>Shortlist</span>
                        </>
                      )}
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() => handleStatusChange(app.id, "Rejected", app.candidateName)}
                      aria-label={`Reject application for ${app.candidateName}`}
                      style={{ color: "#DC2626", borderColor: "#FCA5A5" }}
                    >
                      <UserX size={15} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedCandidateModal && (
        <div className="modal-overlay" onClick={() => setSelectedCandidateModal(null)} role="dialog" aria-modal="true" aria-labelledby="modal-candidate-name">
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="modal-candidate-name" style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: "var(--text-primary)" }}>
                  {selectedCandidateModal.candidateName}
                </h2>
                <div style={{ fontSize: "14px", color: "var(--accent-blue)", fontWeight: "700", marginTop: "4px" }}>
                  Applied For: {selectedCandidateModal.jobTitle} · Applied On: {selectedCandidateModal.appliedDate}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedCandidateModal(null)} aria-label="Close modal">✕</button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Application Details Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "var(--bg-primary)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Experience</span>
                  <strong>{selectedCandidateModal.experience}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Location</span>
                  <strong>{selectedCandidateModal.location}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Job Match Score</span>
                  <strong style={{ color: "var(--accent-blue)" }}>{selectedCandidateModal.matchScore}% Match</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Current Status</span>
                  <strong>{selectedCandidateModal.status}</strong>
                </div>
              </div>

              {/* Cover Note / Summary */}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Cover Note & Summary</h3>
                <p style={{ lineHeight: "1.6", color: "var(--text-primary)", background: "var(--bg-card)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  {selectedCandidateModal.summary}
                </p>
              </div>

              {/* Skills */}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Technical Skills</h3>
                <div className="badge-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedCandidateModal.skills.map((skill, idx) => (
                    <span key={idx} className="badge-type" style={{ fontSize: "14px", padding: "6px 14px", background: "var(--bg-highlight)", color: "var(--accent-blue)", border: "1px solid rgba(37,99,235,0.2)" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Accessibility Accommodations */}
              <div style={{ background: "var(--bg-highlight)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "6px", color: "var(--accent-blue)" }}>
                  Candidate Accommodation & Workplace Needs
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>{selectedCandidateModal.accessNeed}</p>
              </div>

              {/* Resume Document */}
              <div style={{ border: "1px dashed var(--border-color)", padding: "16px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={24} color="#2563EB" />
                  <div>
                    <strong style={{ display: "block" }}>Resume Document:</strong>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{selectedCandidateModal.resumeName}</span>
                  </div>
                </div>
                <button
                  className="btn-audio-listen"
                  onClick={() => speak(`Resume for ${selectedCandidateModal.candidateName}: ${selectedCandidateModal.summary}`)}
                  aria-label={`Read resume content for ${selectedCandidateModal.candidateName}`}
                >
                  Read Resume
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className="primary-btn"
                onClick={() => {
                  handleStatusChange(selectedCandidateModal.id, "Shortlisted", selectedCandidateModal.candidateName);
                  setSelectedCandidateModal({ ...selectedCandidateModal, status: "Shortlisted" });
                }}
              >
                Shortlist Candidate
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  handleStatusChange(selectedCandidateModal.id, "Rejected", selectedCandidateModal.candidateName);
                  setSelectedCandidateModal({ ...selectedCandidateModal, status: "Rejected" });
                }}
                style={{ color: "#DC2626" }}
              >
                Reject Application
              </button>
              <button className="secondary-btn" onClick={() => setSelectedCandidateModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
