/**
 * Page Context Service for Echo Assistant.
 * Provides unified, structured context about the active page, search results, selected job, profile match, and applications.
 */

import { getJobId, getFilteredJobsFromStorage, isJobSaved } from "../utils/jobUtils";
import { conversationMemory } from "./ConversationContext";

export function buildPageContext({
  currentPath = "/",
  jobs = [],
  selectedJob = null,
  applications = [],
  savedJobIds = [],
  currentUser = null,
  users = [],
}) {
  const p = currentPath;

  // Determine current page identity
  let pageKey = "home";
  let pageTitle = "Home";

  if (p === "/" || p === "/home" || p === "Home") {
    pageKey = "home";
    pageTitle = "Home";
  } else if (p === "/jobs" || p === "Jobs") {
    pageKey = "jobs";
    pageTitle = "Find Jobs";
  } else if (p === "/login" || p === "Login") {
    pageKey = "login";
    pageTitle = "Sign In";
  } else if (p === "/register" || p.startsWith("/register")) {
    pageKey = "register";
    pageTitle = "Create Account";
  } else if (p === "/recommendations" || p === "Recommendations") {
    pageKey = "recommendations";
    pageTitle = "AI Job Recommendations";
  } else if (p === "/saved-jobs" || p === "SavedJobs") {
    pageKey = "savedJobs";
    pageTitle = "Saved Jobs";
  } else if (p === "/applications" || p === "Applications") {
    pageKey = "applications";
    pageTitle = "My Applications";
  } else if (p === "/profile" || p === "SeekerProfile") {
    pageKey = "profile";
    pageTitle = "Job Seeker Profile";
  } else if (p === "/employer/dashboard" || p === "EmployerDashboard") {
    pageKey = "employerDashboard";
    pageTitle = "Employer Dashboard";
  } else if (p === "/employer/candidates" || p === "Candidates") {
    pageKey = "candidates";
    pageTitle = "Find Candidates";
  } else if (p.startsWith("/jobs/") && p !== "/jobs") {
    pageKey = "jobDetails";
    const routeJobId = p.replace("/jobs/", "");
    const routeJob = (jobs || []).find((j) => getJobId(j) === routeJobId);
    pageTitle = routeJob ? routeJob.title : "Job Details";
  } else if (p === "/admin/dashboard" || p === "AdminDashboard") {
    pageKey = "adminDashboard";
    pageTitle = "Admin Dashboard";
  }

  // Active Job Details Context (if job detail modal or route view is active)
  const routeJobId = p.startsWith("/jobs/") && p !== "/jobs" ? p.replace("/jobs/", "") : null;
  const routeJob = routeJobId ? (jobs || []).find((j) => getJobId(j) === routeJobId) : null;
  const activeJob = (p.startsWith("/jobs/") && p !== "/jobs") ? (routeJob || selectedJob) : null;
  const isJobDetailOpen = Boolean(activeJob);

  // Calculate visible jobs based on current active page & active sequence filter
  let visibleJobs = [];
  if (pageKey === "savedJobs") {
    visibleJobs = (jobs || []).filter((j) => isJobSaved(j, savedJobIds));
  } else if (pageKey === "recommendations") {
    visibleJobs =
      conversationMemory.isNavigatingSequence &&
      conversationMemory.sequenceType === "recommendations" &&
      conversationMemory.filteredSequence.length > 0
        ? conversationMemory.filteredSequence
        : jobs || [];
  } else if (pageKey === "jobs") {
    visibleJobs =
      conversationMemory.isNavigatingSequence &&
      conversationMemory.sequenceType === "filter" &&
      conversationMemory.filteredSequence.length > 0
        ? conversationMemory.filteredSequence
        : getFilteredJobsFromStorage(jobs);
  } else if (pageKey === "home") {
    visibleJobs = jobs || [];
  }

  // Calculate Match Explanation for Active Job
  const getJobMatchExplanation = (job) => {
    if (!job) return "No active job selected.";

    const userSkills = (currentUser?.skills || ["React", "JavaScript", "HTML", "CSS"]).map((s) =>
      s.toLowerCase()
    );
    const jobSkills = (job.skills || []).map((s) => String(s).toLowerCase());

    const matchingSkills = job.skills
      ? job.skills.filter((s) => userSkills.includes(s.toLowerCase()))
      : [];
    const missingSkills = job.skills
      ? job.skills.filter((s) => !userSkills.includes(s.toLowerCase()))
      : [];

    const score = job.matchScore || (matchingSkills.length > 0 ? 85 : 70);

    let explanation = `Your match score is ${score} percent. `;
    if (matchingSkills.length > 0) {
      explanation += `You have skills in ${matchingSkills.join(", ")}, which match the job requirements. `;
    }
    if (missingSkills.length > 0) {
      explanation += `${missingSkills.join(", ")} ${
        missingSkills.length === 1 ? "is a skill" : "are skills"
      } listed in the job that ${missingSkills.length === 1 ? "is" : "are"} currently missing from your profile.`;
    } else {
      explanation += "Your profile skills fully satisfy all core technical requirements for this role.";
    }

    return explanation;
  };

  // Job Explanation Generator (Simple Summary)
  const getJobExplanation = (job) => {
    if (!job) return "No job selected.";
    const skillsList = job.skills ? job.skills.join(", ") : "general software development";
    return `This is a ${job.title} position at ${job.company}. You will work on building and improving key software systems. Main skills required include ${skillsList}. The position offers a compensation of ${job.salary || "competitive salary"}.`;
  };

  // Structured Job Summary
  const getJobSummary = (job) => {
    if (!job) return "No job selected.";
    return `Job Title: ${job.title}. Company: ${job.company}. Location: ${job.location}. Work Mode: ${job.type || "Full-Time Remote"}. Job Type: ${job.type || "Full-Time"}. Salary: ${job.salary || "Standard"}. Required Skills: ${(job.skills || []).join(", ") || "None specified"}. Experience Required: Approximately 2 years.`;
  };

  // Page Overview Text Generator
  const getPageExplanation = () => {
    switch (pageKey) {
      case "home":
        return "You are on the Home page of EchoHire. This platform connects job seekers with inclusive employers through accessible job discovery and voice dictation tools. You can search for jobs, explore recommendations, or sign in to your account.";
      case "jobs":
        const availableCount = visibleJobs.length;
        const countText = availableCount === 1 ? "1 job available now" : `${availableCount} jobs available now`;
        return `You are on the Find Jobs page. There are currently ${countText}. You can filter jobs using voice comments like 'Show jobs in Chennai', 'Find remote jobs', 'Filter by salary above 6 lakh', or 'Show frontend developer roles'.`;
      case "recommendations":
        return `You are on the AI Job Recommendations page. This page contains ${jobs.length} personalized job recommendations based on your skills, experience, and accessibility preferences. You can open any job to view details or apply.`;
      case "savedJobs":
        const savedList = (jobs || []).filter((j) => savedJobIds.includes(getJobId(j)) || savedJobIds.includes(j.id) || savedJobIds.includes(j._id));
        const savedTitles = savedList.slice(0, 3).map((j) => `${j.title} at ${j.company}`).join(", ");
        return savedList.length > 0
          ? `You are on the Saved Jobs page. You have ${savedList.length} saved ${savedList.length === 1 ? "position" : "positions"}, including ${savedTitles}. Voice controls available: You can say 'Apply for this job' to submit your application, 'Remove saved job' to remove a bookmark, or 'Find jobs' to return to job search.`
          : "You are on the Saved Jobs page. You currently have no saved jobs. You can say 'Find jobs' to explore open opportunities.";
      case "applications":
        const userApps = applications.filter((a) => !currentUser || a.seekerEmail === currentUser.email);
        return `You are on the My Applications page. This page shows your ${userApps.length} submitted job applications and their current application statuses. You can review candidate status updates.`;
      case "profile":
        return "You are on the Job Seeker Profile page. This page contains your personal details, career summary, skill tags, resume document, and workplace accommodation preferences. You can update your details or dictate summary notes.";
      case "employerDashboard":
        return `You are on the Employer Dashboard. This page provides an overview of your hiring activity with ${jobs.length} active jobs and ${applications.length} candidate applications. You can post new jobs and evaluate candidates.`;
      case "candidates":
        return "You are on the Candidates page. This page allows recruiters to search, filter, and shortlist qualified professionals for open roles.";
      case "jobDetails":
        if (activeJob) {
          const skillsStr = Array.isArray(activeJob.skills) ? activeJob.skills.join(", ") : (activeJob.skills || "Software Engineering");
          const accStr = Array.isArray(activeJob.accommodations) ? activeJob.accommodations.join(", ") : (activeJob.accommodations || "Screen Reader Compatible");
          return `You are on the Job Details page for ${activeJob.title} at ${activeJob.company || activeJob.companyName}. Location: ${activeJob.location}. Employment type: ${activeJob.jobType || activeJob.workMode || "Full-Time"}. Compensation: ${activeJob.salary || "Competitive Salary"}. Key required skills: ${skillsStr}. Accommodations: ${accStr}. Voice controls available: You can say 'Apply for this job' or 'Apply now' to submit your application, 'Save job' to bookmark it, or 'Back to Find Jobs page' to return to job search.`;
        }
        return "You are on the Job Details page. Voice controls available: You can say 'Apply for this job', 'Save job', or 'Back to Find Jobs page'.";
      case "adminDashboard":
        return `You are on the Admin Dashboard. This page provides system oversight with ${users.length} registered users and ${jobs.length} job listings.`;
      case "login":
        return "You are on the Sign In page. Enter your email and password to access your EchoHire account.";
      case "register":
        return "You are on the Create Account page. EchoHire offers two different types of accounts: 1. Job Seeker Account — for candidates to build profiles and apply for jobs. 2. Employer Account — for organizations to post job listings and hire talent. Say 'Job Seeker' or 'Employer' to choose your role.";
      default:
        return "You are on EchoHire. Navigate through jobs, applications, or profile using voice commands.";
    }
  };

  const activeSavedJobsList = (jobs || []).filter((j) => isJobSaved(j, savedJobIds));
  const activeUserAppliedIds = (applications || [])
    .filter((a) => !currentUser || a.seekerEmail === currentUser.email)
    .map((a) => String(a.jobId));

  return {
    pageKey,
    pageTitle,
    currentPath,
    jobsCount: visibleJobs.length,
    savedJobsCount: activeSavedJobsList.length,
    savedJobs: activeSavedJobsList,
    savedJobIds: savedJobIds || [],
    applicationsCount: applications.length,
    appliedJobIds: activeUserAppliedIds,
    isJobDetailOpen,
    activeJob,
    visibleJobs,
    allJobs: jobs || [],
    getJobMatchExplanation,
    getJobExplanation,
    getJobSummary,
    getPageExplanation,
  };
}
