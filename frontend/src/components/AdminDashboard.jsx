import { useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { Users, Building2, Briefcase, FileText, ShieldCheck, Activity, Trash2, CheckCircle2 } from "lucide-react";

export default function AdminDashboard({ jobs, setJobs, applications, users }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { announce } = useAccessibility();

  const seekerCount = users.filter((u) => u.role === "seeker" || !u.role || u.role === "job_seeker").length;
  const employerCount = users.filter((u) => u.role === "employer" || u.role === "recruiter").length;

  const handleDeleteJob = (jobId, title) => {
    if (window.confirm(`Admin Action: Remove job listing "${title}"?`)) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      announce(`Admin deleted job listing ${title}`);
    }
  };

  return (
    <div className="admin-dashboard-page" role="region" aria-labelledby="admin-heading">
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span className="badge-type" style={{ background: "#0F172A", color: "#FFFFFF", padding: "4px 12px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={14} />
            <span>Platform Administrator System</span>
          </span>
        </div>
        <h1 id="admin-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Admin Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Manage platform accounts, audit job listings, review application activity, and inspect system reports.
        </p>
      </div>

      {/* SaaS Statistics Overview */}
      <div className="stats-cards-grid">
        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{seekerCount}</div>
            <div className="stat-label">Registered Job Seekers</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Building2 size={24} />
          </div>
          <div>
            <div className="stat-value">{employerCount}</div>
            <div className="stat-label">Employer Accounts</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="stat-value">{jobs.length}</div>
            <div className="stat-label">Active Job Listings</div>
          </div>
        </div>

        <div className="stat-card" tabIndex={0}>
          <div className="stat-icon-wrapper">
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-value">{applications.length}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="employer-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Users Management ({users.length})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "jobs"}
          className={`tab-btn ${activeTab === "jobs" ? "active" : ""}`}
          onClick={() => setActiveTab("jobs")}
        >
          Jobs Moderation ({jobs.length})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === "applications"}
          className={`tab-btn ${activeTab === "applications" ? "active" : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          Applications Oversight ({applications.length})
        </button>
      </div>

      {/* Tab 1: Users Management */}
      {activeTab === "overview" && (
        <div className="table-responsive">
          <table className="accessible-table" aria-label="Platform Users Table">
            <caption>Registered Users & Employers Accounts</caption>
            <thead>
              <tr>
                <th scope="col">User Name</th>
                <th scope="col">Email Address</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.company && <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{u.company}</div>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge-type" style={{ background: u.role === "admin" ? "#0F172A" : "var(--accent-light)", color: u.role === "admin" ? "#FFFFFF" : "var(--accent-blue)" }}>
                      {u.role ? u.role.toUpperCase() : "SEEKER"}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge status-selected" style={{ fontSize: "12px" }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Jobs Moderation */}
      {activeTab === "jobs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {jobs.map((job) => (
            <div key={job.id} className="form-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{job.title}</h3>
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
                    {job.company} · {job.location} · {job.salary}
                  </div>
                </div>

                <button
                  className="btn-danger-sm"
                  onClick={() => handleDeleteJob(job.id, job.title)}
                  aria-label={`Admin remove job ${job.title}`}
                >
                  <Trash2 size={14} />
                  <span>Admin Remove Listing</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Applications Oversight */}
      {activeTab === "applications" && (
        <div className="table-responsive">
          <table className="accessible-table" aria-label="System Applications Table">
            <caption>Applications System Log</caption>
            <thead>
              <tr>
                <th scope="col">Candidate Name</th>
                <th scope="col">Job Title</th>
                <th scope="col">Company</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.seekerName}</strong></td>
                  <td>{app.jobTitle}</td>
                  <td>{app.company}</td>
                  <td>
                    <span className="status-badge status-shortlisted">
                      {app.status}
                    </span>
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
