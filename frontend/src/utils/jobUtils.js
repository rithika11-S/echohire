/**
 * Safe Job ID extraction helper function.
 * Supports both MongoDB _id and legacy id fields.
 */
export function getJobId(job) {
  if (!job) return "";
  return String(job._id || job.id || "");
}

/**
 * Safe check to verify if a job is currently saved in savedJobIds.
 * Supports string IDs, numeric IDs, MongoDB ObjectId, object forms,
 * and handles "job-" prefixed variations.
 */
export function isJobSaved(job, savedJobIds = []) {
  if (!job || !Array.isArray(savedJobIds) || savedJobIds.length === 0) return false;

  const candidateIds = new Set();
  
  if (typeof job === "string" || typeof job === "number") {
    const s = String(job).trim();
    if (s) {
      const clean = s.replace(/^job-/, "");
      candidateIds.add(s);
      candidateIds.add(clean);
      candidateIds.add(`job-${clean}`);
    }
  } else if (typeof job === "object") {
    if (job.id !== undefined && job.id !== null) {
      const s = String(job.id).trim();
      if (s) {
        const clean = s.replace(/^job-/, "");
        candidateIds.add(s);
        candidateIds.add(clean);
        candidateIds.add(`job-${clean}`);
      }
    }
    if (job._id !== undefined && job._id !== null) {
      const s = String(job._id).trim();
      if (s) {
        const clean = s.replace(/^job-/, "");
        candidateIds.add(s);
        candidateIds.add(clean);
        candidateIds.add(`job-${clean}`);
      }
    }
    const extracted = getJobId(job);
    if (extracted) {
      const s = String(extracted).trim();
      if (s) {
        const clean = s.replace(/^job-/, "");
        candidateIds.add(s);
        candidateIds.add(clean);
        candidateIds.add(`job-${clean}`);
      }
    }
  }

  if (candidateIds.size === 0) return false;

  return savedJobIds.some((sId) => {
    if (!sId && sId !== 0) return false;
    const sStr = String(typeof sId === "object" ? (sId._id || sId.id || "") : sId).trim();
    if (!sStr) return false;
    const sClean = sStr.replace(/^job-/, "");
    return (
      candidateIds.has(sStr) ||
      candidateIds.has(sClean) ||
      candidateIds.has(`job-${sClean}`)
    );
  });
}

/**
 * Filter jobs based on active search & filter criteria stored in sessionStorage.
 */
export function getFilteredJobsFromStorage(jobs = []) {
  if (!Array.isArray(jobs)) return [];
  if (typeof sessionStorage === "undefined") return jobs;

  const searchTerm = sessionStorage.getItem("echohire_filter_searchTerm") || "";
  const selectedCategory = sessionStorage.getItem("echohire_filter_category") || "all";
  const selectedType = sessionStorage.getItem("echohire_filter_type") || "all";
  const selectedLocation = sessionStorage.getItem("echohire_filter_location") || "all";
  const selectedSalary = sessionStorage.getItem("echohire_filter_salary") || "all";
  const selectedAccommodation = sessionStorage.getItem("echohire_filter_accommodation") || "all";

  const hasFilter =
    Boolean(searchTerm) ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    selectedLocation !== "all" ||
    selectedSalary !== "all" ||
    selectedAccommodation !== "all";

  if (!hasFilter) return jobs;

  return jobs.filter((job) => {
    if (!job) return false;
    const term = (searchTerm || "").toLowerCase();
    const matchQuery =
      !searchTerm ||
      (job.title && job.title.toLowerCase().includes(term)) ||
      (job.company && job.company.toLowerCase().includes(term)) ||
      (job.location && job.location.toLowerCase().includes(term)) ||
      (job.salary && job.salary.toLowerCase().includes(term)) ||
      (job.description && job.description.toLowerCase().includes(term)) ||
      (job.skills && Array.isArray(job.skills) && job.skills.some((s) => s && String(s).toLowerCase().includes(term)));

    const matchCat = selectedCategory === "all" || job.category === selectedCategory;
    const matchType = selectedType === "all" || job.type === selectedType;
    let matchLoc = selectedLocation === "all";
    if (!matchLoc && job.location) {
      const jobLocLower = job.location.toLowerCase();
      const selLocLower = selectedLocation.toLowerCase();

      if (jobLocLower.includes(selLocLower) || selLocLower.includes(jobLocLower)) {
        matchLoc = true;
      } else {
        const selTokens = selLocLower.split(/[\/\s,]+/).map((t) => t.trim()).filter((t) => t.length >= 3 && t !== "remote");
        const jobTokens = jobLocLower.split(/[\/\s,]+/).map((t) => t.trim()).filter((t) => t.length >= 3 && t !== "remote");

        matchLoc = selTokens.some((st) => jobTokens.some((jt) => jt.includes(st) || st.includes(jt)));
      }
    }
    
    let matchSal = true;
    if (selectedSalary !== "all") {
      const minVal = parseFloat(selectedSalary);
      const salNumbers = (job.salary || "").match(/\d+/g);
      const jobMinSal = salNumbers && salNumbers.length > 0 ? parseFloat(salNumbers[0]) : 0;
      matchSal = jobMinSal >= minVal;
    }

    const matchAcc =
      selectedAccommodation === "all" ||
      (job.accommodations && Array.isArray(job.accommodations) && job.accommodations.includes(selectedAccommodation));

    return matchQuery && matchCat && matchType && matchLoc && matchSal && matchAcc;
  });
}
