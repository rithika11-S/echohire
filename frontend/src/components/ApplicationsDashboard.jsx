import { useAccessibility } from "../context/AccessibilityContext";
import { FileText, Clock, UserCheck, Award, Volume2, Search } from "lucide-react";

export default function ApplicationsDashboard({ applications, setPage }) {
  const { speak } = useAccessibility();

  // Statistics breakdown
  const totalApps = applications.length;
  const underReviewCount = applications.filter((a) => a.status === "Under Review" || a.status === "Applied").length;
  const shortlistedCount = applications.filter((a) => a.status === "Shortlisted" || a.status === "Interview").length;
  const selectedCount = applications.filter((a) => a.status === "Selected").length;

  const getStatusClass = (status) => {
    switch (status) {
      case "Applied": return "status-applied";
      case "Under Review": return "status-review";
      case "Shortlisted": return "status-shortlisted";
      case "Interview": return "status-interview";
      case "Selected": return "status-selected";
      case "Rejected": return "status-rejected";
      default: return "status-applied";
    }
  };

  return (
    <div className="applications-page" role="region" aria-labelledby="applications-heading">
      <div style={{ marginBottom: "24px" }}>
        <h1 id="applications-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          My Job Applications
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Track real-time status updates and accessibility accommodations for your submitted applications.
        </p>
      </div>

      {/* SaaS Statistics Overview */}
      <div className="stats-cards-grid">
        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-value">{totalApps}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-value">{underReviewCount}</div>
            <div className="stat-label">Under Review</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="stat-value">{shortlistedCount}</div>
            <div className="stat-label">Shortlisted & Interview</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Award size={24} />
          </div>
          <div>
            <div className="stat-value">{selectedCount}</div>
            <div className="stat-label">Offers Selected</div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {applications.length === 0 ? (
        <div className="empty-state-card">
          <h2>No applications submitted yet</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            Explore open job positions and apply with your voice-enabled profile.
          </p>
          <button className="primary-btn" onClick={() => setPage("Jobs")}>
            <Search size={16} />
            <span>Find Jobs Now</span>
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="accessible-table" aria-label="Job applications progress tracking table">
            <caption>Submitted Job Applications Overview</caption>
            <thead>
              <tr>
                <th scope="col">Job Title</th>
                <th scope="col">Company</th>
                <th scope="col">Applied Date</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <strong style={{ color: "var(--text-primary)" }}>{app.jobTitle}</strong>
                  </td>
                  <td>{app.company}</td>
                  <td>{app.appliedDate || "Recently"}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(app.status)}`}>
                      Status: {app.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-audio-listen"
                      onClick={() => speak(`Application for ${app.jobTitle} at ${app.company}. Current status is: ${app.status}`)}
                      aria-label={`Read status aloud for ${app.jobTitle}`}
                    >
                      <Volume2 size={14} />
                      <span>Read Status</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
