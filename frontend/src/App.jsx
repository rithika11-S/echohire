import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AccessibilityProvider, useAccessibility } from "./context/AccessibilityContext";
import { AssistantProvider } from "./context/AssistantContext";
import { Lock, LogIn } from "lucide-react";

import SkipLink from "./components/SkipLink";
import Header from "./components/Header";
import Home from "./components/Home";
import JobList from "./components/JobList";
import JobDetailModal from "./components/JobDetailModal";
import Seeker from "./components/Seeker";
import ApplicationsDashboard from "./components/ApplicationsDashboard";
import SavedJobs from "./components/SavedJobs";
import Employer from "./components/Employer";
import Recommentation from "./components/Recommentation";
import AuthModal from "./components/AuthModal";
import AccessibilitySettings from "./components/AccessibilitySettings";
import EchoAssistant from "./assistant/EchoAssistant";
import GlobalVoiceActivation from "./assistant/GlobalVoiceActivation.jsx";
import Login from "./components/Login";
import Register from "./components/Register";
import CandidateSearch from "./components/CandidateSearch";
import AdminDashboard from "./components/AdminDashboard";
import NotificationsModal from "./components/NotificationsModal";
import JobDetails from "./components/JobDetails";
import { getJobId, getFilteredJobsFromStorage, isJobSaved } from "./utils/jobUtils";

import { conversationMemory } from "./assistant/ConversationContext";
import PageIntroduction from "./accessibility/PageIntroduction";
import { usePageIntroduction } from "./accessibility/usePageIntroduction";

import {
  fetchJobsApi,
  createJobApi,
  fetchApplicationsApi,
  submitApplicationApi,
  updateApplicationStatusApi,
  fetchSavedJobsApi,
  saveJobApi,
  removeSavedJobApi,
  toggleSavedJobApi,
} from "./services/api";

import initialJobsData from "./data/data.json";
import "./App.css";

const INITIAL_APPLICATIONS = [
  {
    id: "app-demo-1",
    jobId: "job-0",
    jobTitle: "Frontend Developer",
    company: "InnoTech Labs",
    seekerId: "user-seeker-1",
    seekerName: "Rahul Sharma",
    seekerEmail: "seeker@echohire.com",
    seekerSkills: ["html", "css", "react"],
    appliedDate: "2026-08-25",
    status: "Shortlisted",
    resumeName: "Rahul_Sharma_Resume.pdf",
    coverNote: "Interested in accessible frontend engineering role.",
  },
  {
    id: "app-demo-2",
    jobId: "job-3",
    jobTitle: "AI Engineer",
    company: "NeuroLink Tech",
    seekerId: "user-seeker-1",
    seekerName: "Rahul Sharma",
    seekerEmail: "seeker@echohire.com",
    seekerSkills: ["python", "ml"],
    appliedDate: "2026-08-27",
    status: "Under Review",
    resumeName: "Rahul_Sharma_Resume.pdf",
    coverNote: "Experienced in machine learning and voice interface integration.",
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    seekerEmail: "seeker@echohire.com",
    message: "Your application for Frontend Developer at InnoTech Labs has been Shortlisted.",
    timestamp: "2026-08-30",
    read: false,
  },
];

function ProtectedPageNotice({ title, message, navigate }) {
  return (
    <div className="empty-state-card" style={{ maxWidth: "600px", margin: "48px auto", padding: "48px 32px" }}>
      <div style={{ width: "56px", height: "56px", background: "var(--accent-light)", color: "var(--accent-blue)", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
        <Lock size={28} />
      </div>
      <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "10px" }}>
        {title || "Sign In Required"}
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "28px", lineHeight: "1.6" }}>
        {message || "You must be signed in to access this page. Please sign in or create an account as a Job Seeker or Recruiter."}
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="primary-btn" onClick={() => navigate("/login")}>
          <LogIn size={16} />
          <span>Sign In / Create Account</span>
        </button>
        <button className="secondary-btn" onClick={() => navigate("/")}>
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || "/");
  const [selectedJobForDetail, setSelectedJobForDetail] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const { currentUser, users } = useAuth();
  const { announce, speak } = useAccessibility();
  const { announcePageIntro } = usePageIntroduction();

  // Navigation function syncing URL & history pushState
  const navigate = useCallback((path) => {
    setCurrentPath(path);
    if (!path.startsWith("/jobs/") || path === "/jobs") {
      setSelectedJobForDetail(null);
    }
    if (!path.startsWith("/jobs/")) {
      if ((path === "/jobs" || path === "JobList") && conversationMemory.sequenceType !== "filter") {
        conversationMemory.clearFilteredSequence();
      } else if ((path === "/recommendations" || path === "Recommendations") && conversationMemory.sequenceType !== "recommendations") {
        conversationMemory.clearFilteredSequence();
      } else if ((path === "/saved-jobs" || path === "SavedJobs") && conversationMemory.sequenceType !== "savedJobs") {
        conversationMemory.clearFilteredSequence();
      } else if (path !== "/jobs" && path !== "/recommendations" && path !== "/saved-jobs" && path !== "SavedJobs" && path !== "JobList" && path !== "Recommendations") {
        conversationMemory.clearFilteredSequence();
      }
    }
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Notifications State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("echohire_notifications");
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem("echohire_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Jobs state & API sync
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("echohire_jobs");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialJobsData.map((j, index) => {
      const salaryList = [
        "₹8–14 LPA", "₹6–10 LPA", "₹10–16 LPA", "₹12–18 LPA", "₹7–11 LPA", 
        "₹5–9 LPA", "₹9–15 LPA", "₹11–17 LPA", "₹14–20 LPA", "₹6–12 LPA"
      ];
      const titleLower = (j.title || "").toLowerCase();
      const categoryVal = j.category || (
        titleLower.includes("ai") || titleLower.includes("data") || titleLower.includes("analyst") ? "AI & Data Science" :
        titleLower.includes("designer") || titleLower.includes("ux") || titleLower.includes("graphic") ? "Design" :
        titleLower.includes("qa") || titleLower.includes("tester") || titleLower.includes("testing") ? "Quality Assurance" :
        titleLower.includes("security") || titleLower.includes("cloud") || titleLower.includes("devops") ? "Cloud & Security" :
        "Software Development"
      );
      return {
        ...j,
        id: `job-${index}`,
        salary: j.salary || salaryList[index % salaryList.length],
        type: j.type || j.jobType || "Full-Time",
        category: categoryVal,
        accommodations: j.accommodations || [
          j.accessNeed === "screen reader" ? "Screen Reader Compatible" :
          j.accessNeed === "big text" ? "Voice-Guided Workflows" :
          j.accessNeed === "wheelchair access" ? "Braille Hardware Supported" : "Flexible Remote Work"
        ],
        description: j.description || `Responsible for key development and engineering tasks in ${j.title} position at ${j.company}.`
      };
    });
  });

  useEffect(() => {
    async function loadBackendJobs() {
      const apiJobs = await fetchJobsApi();
      if (apiJobs && apiJobs.length > 0) {
        setJobs(apiJobs);
      }
    }
    loadBackendJobs();
  }, []);

  useEffect(() => {
    localStorage.setItem("echohire_jobs", JSON.stringify(jobs));
  }, [jobs]);

  // Saved Jobs state & API sync
  const [savedJobIds, setSavedJobIds] = useState(() => {
    const saved = localStorage.getItem("echohire_saved_jobs");
    return saved ? JSON.parse(saved) : ["job-0", "job-3"];
  });

  useEffect(() => {
    async function loadSavedJobs() {
      const userId = currentUser?.id || "user-seeker-1";
      const apiSaved = await fetchSavedJobsApi(userId);
      if (apiSaved && Array.isArray(apiSaved)) {
        setSavedJobIds(apiSaved);
        localStorage.setItem("echohire_saved_jobs", JSON.stringify(apiSaved));
      }
    }
    loadSavedJobs();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("echohire_saved_jobs", JSON.stringify(savedJobIds));
  }, [savedJobIds]);

  // Applications state & API sync
  const [applications, setApplications] = useState(() => {
    const saved = localStorage.getItem("echohire_applications");
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  useEffect(() => {
    async function loadBackendApps() {
      const apiApps = await fetchApplicationsApi();
      if (apiApps && apiApps.length > 0) {
        setApplications(apiApps);
      }
    }
    loadBackendApps();
  }, []);

  useEffect(() => {
    localStorage.setItem("echohire_applications", JSON.stringify(applications));
  }, [applications]);

  // Recruiter Jobs & Recruiter Applications scoped to authenticated employer
  const recruiterJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (!currentUser) return false;
      if (j.recruiterId && j.recruiterId === currentUser.id) return true;
      if (j.companyId && currentUser.companyId && j.companyId === currentUser.companyId) return true;
      if (j.company && currentUser.company && j.company.toLowerCase() === currentUser.company.toLowerCase()) return true;
      return false;
    });
  }, [jobs, currentUser]);

  const recruiterApplications = useMemo(() => {
    const recruiterJobIds = new Set(recruiterJobs.map((j) => j.id));
    return applications.filter((a) => {
      if (!currentUser) return false;
      if (recruiterJobIds.has(a.jobId)) return true;
      if (a.recruiterId && a.recruiterId === currentUser.id) return true;
      if (a.company && currentUser.company && a.company.toLowerCase() === currentUser.company.toLowerCase()) return true;
      return false;
    });
  }, [applications, recruiterJobs, currentUser]);

  // Derive Current Route Key & Metadata for unified Page Context
  const getRouteInfo = useCallback(() => {
    const p = currentPath;
    let key = "home";
    let meta = {};

    if (p === "/" || p === "/home" || p === "Home") {
      key = "home";
    } else if (p === "/jobs" || p === "Jobs") {
      key = "jobs";
      const dynamicJobs = getFilteredJobsFromStorage(jobs);
      meta = { count: dynamicJobs.length };
    } else if (p.startsWith("/jobs/") && p !== "/jobs") {
      key = "jobDetails";
      const routeJobId = p.replace("/jobs/", "");
      const targetJob = jobs.find((j) => getJobId(j) === routeJobId);
      meta = { jobTitle: targetJob?.title || "Job Details", job: targetJob };
    } else if (p === "/login" || p === "Login") {
      key = "login";
    } else if (p === "/register") {
      key = "register";
    } else if (p === "/register/job-seeker") {
      key = "registerJobSeeker";
    } else if (p === "/register/employer") {
      key = "registerEmployer";
    } else if (p === "/recommendations" || p === "Recommendations") {
      key = "recommendations";
      meta = { count: jobs.length };
    } else if (p === "/saved-jobs" || p === "SavedJobs") {
      key = "savedJobs";
      const savedJobsList = jobs.filter((j) => isJobSaved(j, savedJobIds));
      meta = { count: savedJobsList.length };
    } else if (p === "/applications" || p === "Applications") {
      key = "applications";
      const userApps = applications.filter((a) => !currentUser || a.seekerEmail === currentUser.email);
      meta = { count: userApps.length };
    } else if (p === "/profile" || p === "SeekerProfile") {
      key = "profile";
    } else if (p === "/employer/dashboard" || p === "EmployerDashboard") {
      key = "employerDashboard";
      meta = { jobsCount: recruiterJobs.length, appsCount: recruiterApplications.length };
    } else if (p === "/employer/candidates" || p === "Candidates") {
      key = "candidates";
      meta = { count: recruiterApplications.length };
    } else if (p === "/admin/dashboard" || p === "AdminDashboard") {
      key = "adminDashboard";
      meta = { usersCount: users.length, jobsCount: jobs.length };
    }

    return { key, meta };
  }, [currentPath, jobs, applications, savedJobIds, users, currentUser, recruiterJobs, recruiterApplications]);

  const { key: currentRouteKey, meta: currentMeta } = getRouteInfo();

  // Automatic Page Orientation Announcement on Route Change
  useEffect(() => {
    if (
      currentRouteKey === "savedJobs" ||
      (conversationMemory.isNavigatingSequence &&
        (currentRouteKey === "jobs" || currentRouteKey === "recommendations"))
    ) {
      console.log(`[App] Saved jobs or sequential ${conversationMemory.sequenceType} review active — skipping generic announcePageIntro`);
      return;
    }
    announcePageIntro(currentRouteKey, currentMeta);
  }, [currentRouteKey, currentMeta, announcePageIntro]);

  // Add Job (Employer)
  const handleAddJob = async (newJob) => {
    const jobWithOwnership = {
      ...newJob,
      id: `job-${Date.now()}`,
      recruiterId: currentUser?.id || "recruiter-technova-1",
      company: currentUser?.company || newJob.company || "TechNova Solutions",
      companyId: currentUser?.companyId || currentUser?.company || "company-technova",
    };
    setJobs((prev) => [jobWithOwnership, ...prev]);
    await createJobApi(jobWithOwnership);
  };

  // Delete Job (Employer)
  const handleDeleteJob = async (jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    await deleteJobApi(jobId);
  };

  // Toggle Save Job
  const handleToggleSaveJob = async (jobOrId) => {
    if (!jobOrId && jobOrId !== 0) return;

    // Find the full job object if only an ID string was passed
    let jobObj = typeof jobOrId === "object" && jobOrId !== null ? jobOrId : null;
    const rawIdStr = String(typeof jobOrId === "object" ? (jobOrId.id || jobOrId._id || "") : jobOrId).trim();
    const rawCleanId = rawIdStr.replace(/^job-/, "");

    if (!jobObj && jobs && jobs.length > 0) {
      jobObj = jobs.find((j) => {
        const jId = String(j.id || "");
        const jClean = jId.replace(/^job-/, "");
        const jMongo = j._id ? String(j._id) : "";
        return jId === rawIdStr || jClean === rawCleanId || jMongo === rawIdStr || getJobId(j) === rawIdStr;
      }) || null;
    }

    const candidateIds = new Set();
    if (rawIdStr) {
      candidateIds.add(rawIdStr);
      candidateIds.add(rawCleanId);
      candidateIds.add(`job-${rawCleanId}`);
    }

    if (jobObj) {
      if (jobObj.id !== undefined && jobObj.id !== null) {
        const s = String(jobObj.id).trim();
        if (s) {
          const c = s.replace(/^job-/, "");
          candidateIds.add(s);
          candidateIds.add(c);
          candidateIds.add(`job-${c}`);
        }
      }
      if (jobObj._id !== undefined && jobObj._id !== null) {
        const s = String(jobObj._id).trim();
        if (s) {
          const c = s.replace(/^job-/, "");
          candidateIds.add(s);
          candidateIds.add(c);
          candidateIds.add(`job-${c}`);
        }
      }
      const extracted = getJobId(jobObj);
      if (extracted) {
        const s = String(extracted).trim();
        if (s) {
          const c = s.replace(/^job-/, "");
          candidateIds.add(s);
          candidateIds.add(c);
          candidateIds.add(`job-${c}`);
        }
      }
    }

    // Determine primary save ID
    const primaryId = (jobObj && (jobObj.id || getJobId(jobObj))) || rawIdStr;
    const userId = currentUser?.id || "user-seeker-1";

    // Accurately determine if the job is already saved
    const isCurrentlySaved = isJobSaved(jobObj || jobOrId, savedJobIds);

    if (isCurrentlySaved) {
      setSavedJobIds((prev) =>
        prev.filter((savedId) => {
          const sStr = String(savedId).trim();
          const sClean = sStr.replace(/^job-/, "");
          return !candidateIds.has(sStr) && !candidateIds.has(sClean) && !candidateIds.has(`job-${sClean}`);
        })
      );
      announce("Job removed from saved list.");
      for (const idToRemove of Array.from(candidateIds)) {
        await removeSavedJobApi(userId, idToRemove);
      }
    } else {
      setSavedJobIds((prev) => [...prev, primaryId]);
      announce("Job saved successfully.");
      await saveJobApi(userId, primaryId);
    }
  };

  // Submit Application
  const handleApplyJob = async (job, coverNote = "") => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const targetJobId = getJobId(job) || String(job.id || job._id || "");
    const existing = applications.find(
      (a) =>
        (String(a.jobId) === targetJobId || String(a.jobId) === String(job.id) || String(a.jobId) === String(job._id)) &&
        (!currentUser || a.seekerEmail === currentUser.email)
    );

    if (existing) {
      announce("You have already applied for this job.");
      speak(`You have already applied for ${job.title}.`);
      return;
    }

    const newApp = {
      id: `app-${Date.now()}`,
      jobId: targetJobId,
      jobTitle: job.title,
      company: job.company,
      companyId: job.companyId || job.company,
      recruiterId: job.recruiterId || "recruiter-technova-1",
      seekerId: currentUser.id,
      seekerName: currentUser.name || "Job Seeker",
      seekerEmail: currentUser.email || "seeker@echohire.com",
      seekerSkills: currentUser.skills || job.skills || [],
      appliedDate: new Date().toLocaleDateString(),
      status: "Applied",
      resumeName: currentUser.resumeName || "Standard_Resume.pdf",
      coverNote,
    };

    setApplications((prev) => [newApp, ...prev]);
    announce(`Application submitted for ${job.title} at ${job.company}`);
    speak(`Application submitted successfully for ${job.title}!`);

    await submitApplicationApi(newApp);
  };

  // Update Application Status (Employer) & Notification Generation
  const handleUpdateAppStatus = async (appId, newStatus) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === appId) {
          const newNotif = {
            id: `notif-${Date.now()}`,
            seekerEmail: app.seekerEmail || "seeker@echohire.com",
            message: `Your application for ${app.jobTitle} at ${app.company} has been updated to ${newStatus}.`,
            timestamp: new Date().toLocaleDateString(),
            read: false,
          };
          setNotifications((n) => [newNotif, ...n]);
          announce(`Updated status for ${app.jobTitle} to ${newStatus}. Candidate notification generated.`);
          return { ...app, status: newStatus };
        }
        return app;
      })
    );
    await updateApplicationStatusApi(appId, newStatus);
  };

  // User Unread Notifications
  const userNotifications = notifications.filter(
    (n) => !currentUser || n.seekerEmail === currentUser.email
  );
  const unreadNotifCount = userNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.seekerEmail === currentUser?.email ? { ...n, read: true } : n))
    );
  };

  // Handle successful login/registration redirection
  const handleAuthSuccess = (userRole) => {
    const roleLower = String(userRole || "").toLowerCase().trim();
    if (roleLower === "admin") {
      navigate("/admin/dashboard");
    } else if (roleLower === "employer" || roleLower === "recruiter") {
      navigate("/employer/dashboard");
    } else {
      navigate("/profile");
    }
  };

  // Helper page renderer
  const renderCurrentPage = () => {
    const p = currentPath;
    const activeUser = currentUser || (localStorage.getItem("echohire_current_user") ? JSON.parse(localStorage.getItem("echohire_current_user")) : null);

    // Public Route 1: Home
    if (p === "/" || p === "/home" || p === "Home") {
      return (
        <div>
          <PageIntroduction routeKey="home" />
          <Home
            setPage={(pageName) => navigate(pageName === "Home" ? "/" : pageName === "Jobs" ? "/jobs" : pageName === "EmployerDashboard" ? "/employer/dashboard" : pageName === "SeekerProfile" ? "/profile" : pageName)}
            openAuthModal={() => navigate("/login")}
            openAccessibilityModal={() => setIsAccessModalOpen(true)}
          />
        </div>
      );
    }

    // Public Route 2: Jobs Search (Job Seekers browse all available jobs)
    if (p === "/jobs" || p === "Jobs") {
      return (
        <div>
          <PageIntroduction routeKey="jobs" meta={currentMeta} />
          <JobList
            jobs={jobs}
            onSelectJob={(job) => navigate(`/jobs/${getJobId(job)}`)}
            savedJobIds={savedJobIds}
            onToggleSaveJob={handleToggleSaveJob}
          />
        </div>
      );
    }

    // Standalone Job Details Route (/jobs/:jobId)
    if (p.startsWith("/jobs/") && p !== "/jobs") {
      const jobId = p.replace("/jobs/", "");
      return (
        <div>
          <PageIntroduction routeKey="jobDetails" meta={currentMeta} />
          <JobDetails
            jobId={jobId}
            jobs={jobs}
            applications={applications}
            savedJobIds={savedJobIds}
            currentUser={currentUser}
            onApplyJob={handleApplyJob}
            onToggleSaveJob={handleToggleSaveJob}
            navigate={navigate}
          />
        </div>
      );
    }

    // Standalone Single Sign-In Page (/login)
    if (p === "/login" || p === "Login") {
      return (
        <div>
          <PageIntroduction routeKey="login" />
          <Login navigate={navigate} onSuccess={handleAuthSuccess} />
        </div>
      );
    }

    // Standalone Registration Pages (/register, /register/job-seeker, /register/employer)
    if (p === "/register" || p.startsWith("/register")) {
      let sub = "choice";
      let key = "register";
      if (p === "/register/job-seeker") { sub = "job-seeker"; key = "registerJobSeeker"; }
      if (p === "/register/employer") { sub = "employer"; key = "registerEmployer"; }
      return (
        <div>
          <PageIntroduction routeKey={key} />
          <Register subRoute={sub} navigate={navigate} onSuccess={handleAuthSuccess} />
        </div>
      );
    }

    // Protected Route: AI Recommendations
    if (p === "/recommendations" || p === "Recommendations") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Sign In Required" message="You must be signed in as a Job Seeker to view AI recommendations." navigate={navigate} />;
      }
      return (
        <div>
          <PageIntroduction routeKey="recommendations" meta={currentMeta} />
          <Recommentation jobs={jobs} onSelectJob={(job) => navigate(`/jobs/${getJobId(job)}`)} />
        </div>
      );
    }

    // Saved Jobs Route
    if (p === "/saved-jobs" || p === "SavedJobs") {
      if (activeUser && (activeUser.role === "employer" || activeUser.role === "recruiter")) {
        return <ProtectedPageNotice title="Job Seeker Feature" message="Saved jobs are only available for job seekers." navigate={navigate} />;
      }
      const savedJobsList = jobs.filter((j) => isJobSaved(j, savedJobIds));
      const appliedJobIds = applications
        .filter((a) => !activeUser || a.seekerEmail === activeUser.email)
        .map((a) => a.jobId);
      return (
        <div>
          <PageIntroduction routeKey="savedJobs" meta={currentMeta} />
          <SavedJobs
            savedJobs={savedJobsList}
            onSelectJob={(job) => navigate(`/jobs/${getJobId(job)}`)}
            onRemoveSaved={(jobOrId) => handleToggleSaveJob(jobOrId)}
            appliedJobIds={appliedJobIds}
            onApplyJob={(job) => handleApplyJob(job)}
          />
        </div>
      );
    }

    // Protected Route: Applications Tracking (Strict Job Seeker Privacy: Seeker sees ONLY their own applications)
    if (p === "/applications" || p === "Applications") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Sign In Required" message="You must be signed in as a Job Seeker to track your applications." navigate={navigate} />;
      }
      const seekerApplications = applications.filter(
        (a) => activeUser && (a.seekerEmail === activeUser.email || a.seekerId === activeUser.id)
      );
      return (
        <div>
          <PageIntroduction routeKey="applications" meta={currentMeta} />
          <ApplicationsDashboard applications={seekerApplications} setPage={(path) => navigate(path === "Jobs" ? "/jobs" : path)} />
        </div>
      );
    }

    // Protected Route: Job Seeker Profile
    if (p === "/profile" || p === "SeekerProfile") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Sign In Required" message="You must be signed in to manage your career profile." navigate={navigate} />;
      }
      return (
        <div>
          <PageIntroduction routeKey="profile" />
          <Seeker />
        </div>
      );
    }

    // Protected Employer Route: Employer Dashboard (Strict Recruiter Isolation: Recruiter sees ONLY their own jobs & applicants)
    if (p === "/employer/dashboard" || p === "EmployerDashboard") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Employer Sign In Required" message="You must be signed in to an Employer account to access the Employer Portal." navigate={navigate} />;
      }
      if (activeUser.role === "user" || activeUser.role === "seeker") {
        return <ProtectedPageNotice title="Employer Access Only" message="Your current account is registered as a Job Seeker." navigate={navigate} />;
      }

      return (
        <div>
          <PageIntroduction routeKey="employerDashboard" meta={currentMeta} />
          <Employer
            jobs={recruiterJobs}
            onCreateJob={handleAddJob}
            onDeleteJob={handleDeleteJob}
            applications={recruiterApplications}
            onUpdateAppStatus={handleUpdateAppStatus}
          />
        </div>
      );
    }

    // Protected Employer Route: Candidate Search (/employer/candidates)
    if (p === "/employer/candidates" || p === "Candidates") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Employer Sign In Required" message="You must be signed in to an Employer account to search candidate profiles." navigate={navigate} />;
      }
      if (activeUser.role === "user" || activeUser.role === "seeker") {
        return <ProtectedPageNotice title="Employer Access Only" message="Your current account is registered as a Job Seeker." navigate={navigate} />;
      }
      return (
        <div>
          <PageIntroduction routeKey="candidates" meta={currentMeta} />
          <CandidateSearch
            recruiterJobs={recruiterJobs}
            recruiterApplications={recruiterApplications}
            onUpdateAppStatus={handleUpdateAppStatus}
            navigate={navigate}
          />
        </div>
      );
    }

    // Protected Admin Route: Admin Dashboard (/admin/dashboard)
    if (p === "/admin/dashboard" || p === "AdminDashboard") {
      if (!activeUser) {
        return <ProtectedPageNotice title="Admin Authentication Required" message="Platform administrator login is required to access system settings." navigate={navigate} />;
      }
      if (activeUser.role !== "admin") {
        return <ProtectedPageNotice title="Administrator Access Only" message="You do not have administrative privileges to access this area." navigate={navigate} />;
      }
      return (
        <div>
          <PageIntroduction routeKey="adminDashboard" meta={currentMeta} />
          <AdminDashboard jobs={jobs} setJobs={setJobs} applications={applications} users={users} />
        </div>
      );
    }

    // Fallback: Home Page
    return (
      <div>
        <PageIntroduction routeKey="home" />
        <Home
          setPage={(pageName) => navigate(pageName === "Home" ? "/" : pageName === "Jobs" ? "/jobs" : pageName)}
          openAuthModal={() => navigate("/login")}
          openAccessibilityModal={() => setIsAccessModalOpen(true)}
        />
      </div>
    );
  };

  return (
    <div className="app-container">
      <SkipLink />

      <Header
        page={currentPath}
        setPage={(path) => navigate(path)}
        navigate={navigate}
        openAuthModal={() => navigate("/login")}
        openAccessibilityModal={() => setIsAccessModalOpen(true)}
        unreadNotifCount={unreadNotifCount}
        openNotificationsModal={() => setIsNotifModalOpen(true)}
      />

      <main id="main-content" className="main-content" tabIndex={-1}>
        {renderCurrentPage()}
      </main>

      {/* Modals & Floating Components */}
      {selectedJobForDetail && (
        <JobDetailModal
          job={selectedJobForDetail}
          onClose={() => setSelectedJobForDetail(null)}
          isSaved={selectedJobForDetail ? isJobSaved(selectedJobForDetail, savedJobIds) : false}
          onToggleSave={() => handleToggleSaveJob(selectedJobForDetail)}
          isApplied={applications.some((a) => a.jobId === selectedJobForDetail.id && a.seekerEmail === currentUser?.email)}
          onApplySubmit={(job, note) => {
            handleApplyJob(job, note);
            setSelectedJobForDetail(null);
          }}
          openAuthModal={() => navigate("/login")}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <AccessibilitySettings
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={userNotifications}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Persistent Global Voice Activation Listener (Active when assistant is closed) */}
      <GlobalVoiceActivation />

      {/* Echo Assistant Floating Button & Panel */}
      <EchoAssistant
        currentPath={currentPath}
        jobs={jobs}
        selectedJob={
          selectedJobForDetail ||
          (currentPath.startsWith("/jobs/") && currentPath !== "/jobs"
            ? jobs.find((j) => getJobId(j) === currentPath.replace("/jobs/", ""))
            : null)
        }
        applications={applications}
        savedJobIds={savedJobIds}
        currentUser={currentUser}
        users={users}
        navigate={navigate}
        onSelectJob={(job) => navigate(`/jobs/${getJobId(job)}`)}
        onSaveJob={handleToggleSaveJob}
        onUnsaveJob={handleToggleSaveJob}
        onApplySubmit={(job, note) => handleApplyJob(job, note)}
      />

      {/* Navy Footer (#0F172A) */}
      <footer className="footer-bar" role="contentinfo">
        <p style={{ fontWeight: "800", fontSize: "16px", color: "#FFFFFF", marginBottom: "6px" }}>
          EchoHire — Accessible employment for everyone
        </p>
        <p style={{ fontSize: "14px", color: "#94A3B8", maxWidth: "600px", margin: "0 auto 16px auto" }}>
          Inclusive job platform designed for visually impaired professionals with voice input and WCAG 2.1 AA screen-reader optimization.
        </p>
        <div className="footer-links">
          <button onClick={() => navigate("/")}>About</button>
          <button onClick={() => navigate("/jobs")}>Find Jobs</button>
          <button onClick={() => navigate("/register/employer")}>For Employers</button>
          <button onClick={() => setIsAccessModalOpen(true)}>Accessibility</button>
          <span>|</span>
          <button onClick={() => announce("Privacy Policy: EchoHire prioritizes user accessibility data protection.")}>Privacy Policy</button>
          <button onClick={() => announce("Terms of Service: Standard accessible platform guidelines apply.")}>Terms of Service</button>
          <button onClick={() => announce("Contact Support at support@echohire.org")}>Contact Support</button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AssistantProvider>
          <AppContent />
        </AssistantProvider>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
