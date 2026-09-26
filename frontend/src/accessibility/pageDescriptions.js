/**
 * Single Source of Truth Configuration for EchoHire Page Introductions & Orientations.
 * Used by Screen Readers (aria-live), Text-to-Speech synthesis, and the Voice Assistant.
 */

export const pageDescriptions = {
  home: {
    title: "Home",
    description: "Welcome to EchoHire, an accessible job platform designed to connect job seekers with inclusive employers.",
    actions: "You can search for jobs, explore recommendations, or create an account.",
    getDynamicSummary: () => "",
  },

  login: {
    title: "Sign In",
    description: "You are on the Sign In page. This page allows job seekers, employers, and administrators to access their accounts.",
    actions: "Enter your email address and password to sign in, or navigate to Create Account.",
    getDynamicSummary: () => "",
  },

  register: {
    title: "Create Account",
    description: "You are on the Create Account page. There are two different types of accounts on EchoHire: Job Seeker account for candidates looking for jobs, and Employer account for organizations hiring talent.",
    actions: "Say 'Job Seeker' or 'Option 1' to create a Job Seeker account, or say 'Employer' or 'Option 2' to create an Employer account.",
    getDynamicSummary: () => "",
  },

  registerJobSeeker: {
    title: "Job Seeker Registration",
    description: "You are on the Job Seeker Registration page. This page collects your contact details to create your career profile.",
    actions: "Fill in your full name, email, password, and optional voice dictation details to create your account.",
    getDynamicSummary: () => "",
  },

  registerEmployer: {
    title: "Employer Registration",
    description: "You are on the Employer Registration page. This page registers your company to post job listings and review talent.",
    actions: "Fill in your personal details and organization overview to create your employer account.",
    getDynamicSummary: () => "",
  },

  jobs: {
    title: "Find Jobs",
    description: "You are on the Find Jobs page. This page helps you search and filter available accessible job opportunities.",
    actions: "You can search by job title, skill, company, or location and open any job to view details.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      if (count === undefined || count === null) return "";
      if (count === 0) return "No jobs were found matching your search.";
      if (count === 1) return "There is currently 1 job available now.";
      return `There are currently ${count} jobs available now.`;
    },
  },

  jobDetail: {
    title: "Job Details",
    description: "You are on the Job Details view.",
    actions: "You can apply for this position, save the job for later, or listen to the details using Read Aloud.",
    getDynamicSummary: (meta) => {
      if (meta?.jobTitle) {
        return `Position: ${meta.jobTitle}.`;
      }
      if (meta?.job) {
        return `Job position: ${meta.job.title} at ${meta.job.company} located in ${meta.job.location}.`;
      }
      return "";
    },
  },
  jobDetails: {
    title: "Job Details",
    description: "You are on the Job Details page.",
    actions: "You can apply for this position, save the job for later, or listen to the details using Read Aloud.",
    getDynamicSummary: (meta) => {
      if (meta?.jobTitle) {
        return `Position: ${meta.jobTitle}.`;
      }
      if (meta?.job) {
        return `Job position: ${meta.job.title} at ${meta.job.company} located in ${meta.job.location}.`;
      }
      return "";
    },
  },

  recommendations: {
    title: "AI Job Recommendations",
    description: "You are on the AI Job Recommendations page. This page contains personalized job recommendations matched to your skills.",
    actions: "You can open a recommendation, view matching scores, or apply.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      return count ? `There are ${count} recommended jobs based on your profile.` : "";
    },
  },

  savedJobs: {
    title: "Saved Jobs",
    description: "You are on the Saved Jobs page. This page contains job listings you have saved for later review.",
    actions: "You can open a saved job, remove it from your saved list, or submit an application.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      return count !== undefined ? `You have ${count} saved ${count === 1 ? "job" : "jobs"}.` : "";
    },
  },

  applications: {
    title: "My Applications",
    description: "You are on the My Applications page. This page shows your submitted job applications and their current statuses.",
    actions: "You can review application status updates or track candidate progress.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      return count !== undefined ? `You have ${count} active ${count === 1 ? "application" : "applications"}.` : "";
    },
  },

  profile: {
    title: "Job Seeker Profile",
    description: "You are on the Profile page. This page contains your professional information, skills, resume, and accessibility preferences.",
    actions: "You can edit your personal details, dictate summary notes, or upload a new resume file.",
    getDynamicSummary: () => "",
  },

  accessibility: {
    title: "Accessibility Settings",
    description: "You are on the Accessibility Settings page. This page allows you to customize contrast, text size, voice dictation, and narration.",
    actions: "You can adjust text size presets, high-contrast themes, speech rate, and toggle automatic page introductions.",
    getDynamicSummary: () => "",
  },

  notifications: {
    title: "Notifications",
    description: "You are on the Notifications page. This page displays important updates regarding your applications and status changes.",
    actions: "You can listen to notifications aloud or mark them as read.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      return count !== undefined ? `You have ${count} unread ${count === 1 ? "notification" : "notifications"}.` : "";
    },
  },

  employerDashboard: {
    title: "Employer Dashboard",
    description: "You are on the Employer Dashboard. This page provides an overview of your hiring activity, active listings, and candidate applications.",
    actions: "You can manage active listings, post a new job, or review applicant qualifications.",
    getDynamicSummary: (meta) => {
      if (meta?.jobsCount !== undefined && meta?.appsCount !== undefined) {
        return `You have ${meta.jobsCount} active job listings and ${meta.appsCount} candidate applications.`;
      }
      return "";
    },
  },

  candidates: {
    title: "Find Candidates",
    description: "You are on the Candidates page. This page helps you search and review qualified professionals for your open roles.",
    actions: "You can search candidates by skill or location, view detailed candidate profiles, and shortlist top talent.",
    getDynamicSummary: (meta) => {
      const count = meta?.count;
      return count !== undefined ? `Showing ${count} qualified candidates.` : "";
    },
  },

  adminDashboard: {
    title: "Admin Dashboard",
    description: "You are on the Admin Dashboard. This page provides an overview of EchoHire platform users, employers, job listings, and system logs.",
    actions: "You can audit job listings, inspect user accounts, and review system reports.",
    getDynamicSummary: (meta) => {
      if (meta?.usersCount !== undefined && meta?.jobsCount !== undefined) {
        return `System status: ${meta.usersCount} registered users and ${meta.jobsCount} active job listings.`;
      }
      return "";
    },
  },

  notFound: {
    title: "Page Not Found",
    description: "You are on the Page Not Found screen. The page you requested could not be located.",
    actions: "You can return to the EchoHire home page or navigate to Find Jobs.",
    getDynamicSummary: () => "",
  },

  accessDenied: {
    title: "Access Denied",
    description: "You do not have permission to access this page.",
    actions: "Please sign in with appropriate account credentials or return to your dashboard.",
    getDynamicSummary: () => "",
  },
};

/**
 * Utility function to build a combined, concise page introduction string (1-3 sentences).
 */
export function getPageIntroText(key, meta = {}) {
  const config = pageDescriptions[key] || pageDescriptions.notFound;
  const staticPart = `${config.description} ${config.actions}`;
  const dynamicPart = config.getDynamicSummary ? config.getDynamicSummary(meta) : "";
  return dynamicPart ? `${config.description} ${dynamicPart} ${config.actions}` : staticPart;
}
