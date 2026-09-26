/**
 * Context-Aware Suggested Commands for Echo Assistant.
 * Generates relevant, clean command suggestions based on the user's active page and job detail context.
 */

export function getSuggestedCommands(pageKey, isJobDetailOpen = false) {
  if (isJobDetailOpen || pageKey === "jobDetails") {
    return [
      "Explain this page",
      "Apply for this job",
      "Save this job",
      "Back to Find Jobs page",
      "What skills are required?",
      "What is the salary?",
    ];
  }

  switch (pageKey) {
    case "jobs":
      return [
        "Explain this page",
        "Jobs in Chennai",
        "Salary above 6 lakh",
        "Frontend developer roles",
        "Show remote jobs",
        "Clear filters",
      ];
    case "recommendations":
      return [
        "What are my recommended jobs?",
        "What pages are on this website?",
        "Find jobs near me",
      ];
    case "applications":
      return [
        "How do I track my applications?",
        "What pages are available?",
        "Find jobs",
      ];
    case "savedJobs":
      return [
        "List saved jobs",
        "Apply for this job",
        "Remove saved job",
        "Find jobs",
      ];
    case "profile":
      return [
        "What skills are in my profile?",
        "How do I update my profile?",
        "What pages are available?",
      ];
    case "employerDashboard":
      return [
        "What can a recruiter do here?",
        "How do I post a new job?",
        "Find candidates",
      ];
    case "candidates":
      return [
        "How do I evaluate candidates?",
        "Search developer candidates",
      ];
    case "adminDashboard":
      return [
        "What can an admin do here?",
        "System status overview",
      ];
    default:
      return [
        "What pages are on this website?",
        "What can I do on EchoHire?",
        "Find jobs",
        "Open my profile",
      ];
  }
}
