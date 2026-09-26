/**
 * Dynamic Page Screen Reader Engine for Echo Assistant.
 * Inspects DOM structure (headings, main landmarks, forms, input fields, buttons, dynamic data counts)
 * and combines with active Page Context to generate dynamic screen reader descriptions.
 */

import { formContext } from "./FormContextService.js";
import { conversationMemory } from "./ConversationContext.js";

export function readCurrentPage(currentPath = typeof window !== "undefined" ? window.location.pathname : "/", pageContext = {}) {
  const path = currentPath || (typeof window !== "undefined" ? window.location.pathname : "/");

  console.log("Current route:", path);
  console.log("Page changed");
  console.log("Waiting for page render");
  console.log("Reading current page");

  // 1. Inspect DOM Heading
  let heading = "";
  if (typeof document !== "undefined") {
    const h1El = document.querySelector("h1");
    if (h1El && h1El.innerText && h1El.innerText.trim()) {
      heading = h1El.innerText.trim();
    } else {
      const h2El = document.querySelector("h2");
      if (h2El && h2El.innerText && h2El.innerText.trim()) {
        heading = h2El.innerText.trim();
      } else {
        heading = document.title || "EchoHire";
      }
    }
  } else {
    heading = pageContext.pageTitle || "EchoHire";
  }
  console.log("Page heading:", heading);

  // 2. Inspect DOM Active Filters Tags
  const activeFilterTexts = [];
  if (typeof document !== "undefined") {
    const filterTagEls = document.querySelectorAll(".badge-filter-tag");
    filterTagEls.forEach((el) => {
      let txt = el.innerText || el.textContent || "";
      txt = txt.replace(/×/g, "").replace(/\u00d7/g, "").trim();
      if (txt && !activeFilterTexts.includes(txt)) {
        activeFilterTexts.push(txt);
      }
    });
  }

  // 3. Inspect DOM Job Cards Titles & Companies
  const visibleCardSummaries = [];
  if (typeof document !== "undefined") {
    const cardEls = document.querySelectorAll(".job-card-accessible, .job-card, [data-job-card]");
    cardEls.forEach((card) => {
      const titleEl = card.querySelector(".job-title, h3, h2");
      const compEl = card.querySelector(".job-company-name, .company-name");
      const title = titleEl ? titleEl.innerText.trim() : "";
      const company = compEl ? compEl.innerText.trim() : "";
      if (title) {
        visibleCardSummaries.push(company ? `${title} at ${company}` : title);
      }
    });
  }

  // 4. Inspect Dynamic Data Counts
  let visibleJobCount = visibleCardSummaries.length > 0 ? visibleCardSummaries.length : (pageContext.visibleJobs?.length || pageContext.jobsCount || 0);
  if (conversationMemory.isNavigatingSequence && conversationMemory.filteredSequence.length > 0) {
    visibleJobCount = conversationMemory.filteredSequence.length;
  }

  // 5. Inspect Input Fields & Registered Form Context Fields
  const inputNames = [];
  if (typeof document !== "undefined") {
    const inputElements = document.querySelectorAll("input:not([type='hidden']), textarea, select");
    inputElements.forEach((input) => {
      let labelText = input.getAttribute("aria-label") || input.placeholder;
      if (!labelText && input.id) {
        const labelEl = document.querySelector(`label[for='${input.id}']`);
        if (labelEl) labelText = labelEl.innerText.trim();
      }
      if (labelText) {
        const cleanLabel = labelText
          .replace(/\(Voice Input Supported\)/gi, "")
          .replace(/\(Voice Dictation Supported\)/gi, "")
          .trim();
        if (cleanLabel && !inputNames.includes(cleanLabel)) {
          inputNames.push(cleanLabel);
        }
      }
    });
  }

  // Combine with FormContext registered fields
  const registeredFields = formContext.getRegisteredFieldsSummary();
  registeredFields.forEach((rf) => {
    if (!inputNames.includes(rf.label)) {
      inputNames.push(rf.label);
    }
  });

  console.log("Inputs found:", inputNames);

  // 6. Inspect Buttons
  const buttonNames = [];
  if (typeof document !== "undefined") {
    const buttonElements = document.querySelectorAll("button:not(.ai-float-btn):not(.btn-icon)");
    buttonElements.forEach((btn) => {
      const btnText = btn.getAttribute("aria-label") || btn.innerText.trim();
      if (btnText && btnText.length < 50 && !buttonNames.includes(btnText)) {
        buttonNames.push(btnText);
      }
    });
  }

  // 7. Build Dynamic Screen Reader Summary based on Route & DOM
  let description = "";

  if (path === "/profile" || path === "SeekerProfile") {
    const fieldsList = inputNames.length > 0 ? inputNames.join(", ") : "your name, email address, phone number, location, skills, and resume";
    description = `You are on the Job Seeker Profile page. Available information includes ${fieldsList}. This page contains a form. Would you like voice-guided assistance?`;
  } else if (path === "/login" || path === "Login") {
    description = `Welcome to Sign In. You need to enter your email address and password. This page contains a form. Would you like voice-guided assistance?`;
  } else if (path === "/register" || path.startsWith("/register")) {
    description = `Welcome to account registration. I can guide you through creating your account. This page contains a form. Would you like voice-guided assistance?`;
  } else if (path === "/jobs" || path === "Jobs") {
    let filtersPart = "";
    if (activeFilterTexts.length > 0) {
      filtersPart = ` with active filters: ${activeFilterTexts.join(", ")}`;
    }

    let jobsListPart = "";
    if (visibleCardSummaries.length > 0) {
      const topJobs = visibleCardSummaries.slice(0, 4).map((str, idx) => `${idx + 1}. ${str}`).join(", ");
      jobsListPart = ` Displaying ${visibleJobCount} matching ${visibleJobCount === 1 ? "position" : "positions"}: ${topJobs}${visibleJobCount > 4 ? `, and ${visibleJobCount - 4} more` : ""}.`;
    } else if (visibleJobCount > 0) {
      jobsListPart = ` There are currently ${visibleJobCount} job listings displayed.`;
    } else {
      jobsListPart = ` There are no matching job listings found for your active filters.`;
    }

    description = `You are on the Find Jobs page${filtersPart}.${jobsListPart} You can say 'View details of job 1', 'Filter by location', or ask me to explain any job.`;
  } else if (path.startsWith("/jobs/") && path !== "/jobs") {
    const activeJob = pageContext.activeJob || (pageContext.allJobs || []).find((j) => String(j.id) === path.replace("/jobs/", ""));
    if (activeJob) {
      const skillsStr = Array.isArray(activeJob.skills) ? activeJob.skills.join(", ") : (activeJob.skills || "Software development");
      const accStr = Array.isArray(activeJob.accommodations) ? activeJob.accommodations.join(", ") : (activeJob.accommodations || "Screen Reader Compatible");
      description = `You are on the Job Details page for ${activeJob.title} at ${activeJob.company || activeJob.companyName}. Location: ${activeJob.location}. Employment type: ${activeJob.jobType || activeJob.workMode || "Full-Time"}. Compensation: ${activeJob.salary || "Competitive Salary"}. Key required skills include ${skillsStr}. Workplace accommodations provided: ${accStr}. Voice controls available: You can say 'Apply for this job' or 'Apply now' to submit your application, 'Save job' to bookmark it, or 'Back to Find Jobs page' to return to job search.`;
    } else {
      description = `You are on the Job Details page. Here you can inspect full job responsibilities, skills, and accessibility accommodations. Voice controls available: You can say 'Apply for this job', 'Save job', or 'Back to Find Jobs page'.`;
    }
  } else if (path === "/recommendations" || path === "Recommendations") {
    let jobsListPart = "";
    if (visibleCardSummaries.length > 0) {
      const topJobs = visibleCardSummaries.slice(0, 3).map((str, idx) => `${idx + 1}. ${str}`).join(", ");
      jobsListPart = ` Displaying ${visibleJobCount} recommendations: ${topJobs}.`;
    } else {
      jobsListPart = ` There are currently ${visibleJobCount} job recommendations displayed.`;
    }
    description = `You are on the Recommendations page.${jobsListPart} You can ask me to list the available jobs or explain a specific recommendation.`;
  } else if (path === "/saved-jobs" || path === "SavedJobs") {
    let jobsListPart = "";
    if (visibleCardSummaries.length > 0) {
      const topJobs = visibleCardSummaries.slice(0, 3).map((str, idx) => `${idx + 1}. ${str}`).join(", ");
      jobsListPart = ` including ${topJobs}`;
    } else if ((pageContext.visibleJobs || []).length > 0) {
      const topSaved = pageContext.visibleJobs.slice(0, 3).map((j) => `${j.title} at ${j.company}`).join(", ");
      jobsListPart = ` including ${topSaved}`;
    }
    const count =
      pageContext.visibleJobs && Array.isArray(pageContext.visibleJobs)
        ? pageContext.visibleJobs.length
        : visibleCardSummaries.length > 0
        ? visibleCardSummaries.length
        : (pageContext.savedJobsCount || 0);
    if (count > 0) {
      description = `You are on the Saved Jobs page. You currently have ${count} saved job ${count === 1 ? "position" : "positions"}${jobsListPart}. Voice controls available: You can say 'Apply for this job' to submit your application, 'Remove saved job' to remove a bookmark, or 'Find jobs' to explore more positions.`;
    } else {
      description = `You are on the Saved Jobs page. You currently have no saved jobs. You can say 'Find jobs' to explore available career opportunities.`;
    }
  } else if (path === "/applications" || path === "Applications") {
    const appsCount = pageContext.applicationsCount || (typeof document !== "undefined" ? document.querySelectorAll(".application-card").length : 0);
    description = `You are on the My Applications page. This page displays your submitted job applications and their application statuses. There are currently ${appsCount} applications displayed.`;
  } else if (path === "/employer/dashboard" || path === "EmployerDashboard") {
    description = `You are on the Employer Dashboard. This page provides hiring management tools with active job postings and candidate applications.`;
  } else if (path === "/employer/candidates" || path === "Candidates") {
    description = `You are on the Candidates page. This page allows recruiters to search, filter, and shortlist qualified candidate profiles.`;
  } else if (path === "/admin/dashboard" || path === "AdminDashboard") {
    description = `You are on the Admin Dashboard. This page provides system oversight with user management and job listings oversight.`;
  } else {
    description = `You are on the ${heading} page of EchoHire. This page provides accessible job discovery and voice controls. You can search for jobs, view AI recommendations, or sign in to your account.`;
  }

  console.log("Generated page description:", description);
  return description;
}

/**
 * Inspects visible buttons on the DOM and returns a formatted list of available button names.
 */
export function readAvailableButtons() {
  if (typeof document === "undefined") {
    return "There are no distinct interactive buttons visible on this page.";
  }

  const buttonElements = document.querySelectorAll("button:not(.ai-float-btn):not(.btn-icon)");
  const buttonNames = [];
  buttonElements.forEach((btn) => {
    const btnText = btn.getAttribute("aria-label") || btn.innerText.trim();
    if (btnText && btnText.length < 50 && !buttonNames.includes(btnText)) {
      buttonNames.push(btnText);
    }
  });

  if (buttonNames.length === 0) {
    return "There are no distinct interactive buttons visible on this page.";
  }

  return `The available buttons on this page are: ${buttonNames.join(", ")}.`;
}
