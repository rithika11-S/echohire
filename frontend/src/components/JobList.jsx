import { useState, useEffect, useMemo, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { Search, Mic, MapPin, IndianRupee, Bookmark, Volume2, ExternalLink, Filter, RotateCcw, X } from "lucide-react";
import { getJobId, isJobSaved } from "../utils/jobUtils";
import { conversationMemory } from "../assistant/ConversationContext";
import { echoTTS } from "../assistant/textToSpeech";

export default function JobList({
  jobs = [],
  onSelectJob,
  savedJobIds = [],
  onToggleSaveJob,
}) {
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem("echohire_filter_searchTerm") || "");
  const [selectedCategory, setSelectedCategory] = useState(() => sessionStorage.getItem("echohire_filter_category") || "all");
  const [selectedType, setSelectedType] = useState(() => sessionStorage.getItem("echohire_filter_type") || "all");
  const [selectedLocation, setSelectedLocation] = useState(() => sessionStorage.getItem("echohire_filter_location") || "all");
  const [selectedSalary, setSelectedSalary] = useState(() => sessionStorage.getItem("echohire_filter_salary") || "all");
  const [selectedAccommodation, setSelectedAccommodation] = useState(() => sessionStorage.getItem("echohire_filter_accommodation") || "all");

  const { speak, startVoiceInput, isListening, announce } = useAccessibility();

  const isInitialMount = useRef(true);
  const prevFiltersRef = useRef({
    searchTerm,
    selectedCategory,
    selectedType,
    selectedLocation,
    selectedSalary,
    selectedAccommodation,
  });
  const filterChangeTimeoutRef = useRef(null);

  // Keep sessionStorage in sync with active filter states
  useEffect(() => {
    sessionStorage.setItem("echohire_filter_searchTerm", searchTerm);
    sessionStorage.setItem("echohire_filter_category", selectedCategory);
    sessionStorage.setItem("echohire_filter_type", selectedType);
    sessionStorage.setItem("echohire_filter_location", selectedLocation);
    sessionStorage.setItem("echohire_filter_salary", selectedSalary);
    sessionStorage.setItem("echohire_filter_accommodation", selectedAccommodation);
  }, [searchTerm, selectedCategory, selectedType, selectedLocation, selectedSalary, selectedAccommodation]);

  // Extract categories & locations
  const categories = useMemo(() => {
    const set = new Set(jobs.map((j) => j.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [jobs]);

  const locations = useMemo(() => {
    const set = new Set(jobs.map((j) => j.location).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [jobs]);

  // Active filters check
  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchTerm) ||
      selectedCategory !== "all" ||
      selectedType !== "all" ||
      selectedLocation !== "all" ||
      selectedSalary !== "all" ||
      selectedAccommodation !== "all"
    );
  }, [searchTerm, selectedCategory, selectedType, selectedLocation, selectedSalary, selectedAccommodation]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedType("all");
    setSelectedLocation("all");
    setSelectedSalary("all");
    setSelectedAccommodation("all");
    sessionStorage.removeItem("echohire_filter_searchTerm");
    sessionStorage.removeItem("echohire_filter_category");
    sessionStorage.removeItem("echohire_filter_type");
    sessionStorage.removeItem("echohire_filter_location");
    sessionStorage.removeItem("echohire_filter_salary");
    sessionStorage.removeItem("echohire_filter_accommodation");
    conversationMemory.clearFilteredSequence();
    announce("Cleared all search and filter preferences.");
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
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
  }, [jobs, searchTerm, selectedCategory, selectedType, selectedLocation, selectedSalary, selectedAccommodation]);

  // Handle user-initiated filter changes and explain first matching job
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const prev = prevFiltersRef.current;
    const hasChanged =
      prev.searchTerm !== searchTerm ||
      prev.selectedCategory !== selectedCategory ||
      prev.selectedType !== selectedType ||
      prev.selectedLocation !== selectedLocation ||
      prev.selectedSalary !== selectedSalary ||
      prev.selectedAccommodation !== selectedAccommodation;

    if (!hasChanged) return;

    prevFiltersRef.current = {
      searchTerm,
      selectedCategory,
      selectedType,
      selectedLocation,
      selectedSalary,
      selectedAccommodation,
    };

    if (conversationMemory.justFilteredByVoice) {
      conversationMemory.justFilteredByVoice = false;
      return;
    }

    if (!hasActiveFilters) {
      conversationMemory.clearFilteredSequence();
      return;
    }

    if (filterChangeTimeoutRef.current) {
      clearTimeout(filterChangeTimeoutRef.current);
    }

    filterChangeTimeoutRef.current = setTimeout(() => {
      if (filteredJobs.length > 0) {
        const topJob = filteredJobs[0];
        conversationMemory.setFilteredSequence(filteredJobs, 0);
        conversationMemory.setReferencedJob(topJob, 0);
        conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: topJob, list: filteredJobs, index: 0 });

        const speechText = conversationMemory.formatJobExplanation(topJob, 0, filteredJobs.length, false);
        echoTTS.speak(speechText);
        conversationMemory.addExchange("filter jobs", speechText);

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("echohire_assistant_message", {
              detail: { sender: "ai", text: speechText },
            })
          );
        }
      } else {
        conversationMemory.clearFilteredSequence();
        const speechText = "No job listings found matching your selected filters. You can reset or broaden your search criteria.";
        echoTTS.speak(speechText);
        conversationMemory.addExchange("filter jobs", speechText);

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("echohire_assistant_message", {
              detail: { sender: "ai", text: speechText },
            })
          );
        }
      }
    }, 400);

    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, [
    searchTerm,
    selectedCategory,
    selectedType,
    selectedLocation,
    selectedSalary,
    selectedAccommodation,
    filteredJobs,
    hasActiveFilters,
  ]);

  const handleVoiceSearch = () => {
    startVoiceInput((recognizedText) => {
      setSearchTerm(recognizedText);
      announce(`Searched for ${recognizedText}`);
    });
  };

  return (
    <div className="job-list-page" role="region" aria-labelledby="jobs-heading">
      {/* Header Banner */}
      <div style={{ marginBottom: "24px" }}>
        <h1 id="jobs-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Find Your Next Opportunity
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Discover accessible, voice-friendly job listings tailored for visually impaired professionals.
        </p>
      </div>

      {/* Search & Filter Card */}
      <div className="search-filter-card" role="search" aria-label="Job search and filters">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Filter size={18} color="var(--accent-blue)" />
            <span>Search & Filter Jobs</span>
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-link-reset"
              onClick={handleResetFilters}
              aria-label="Clear all applied search filters"
              style={{ fontSize: "13px", color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <RotateCcw size={14} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="search-input-row">
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search jobs, skills, locations, or salary (e.g. Chennai, 8 LPA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search job listings by title, company, location, or required skill"
              style={{ paddingLeft: "42px" }}
            />
            <Search size={18} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          </div>
          <button
            type="button"
            className={`mic-btn ${isListening ? "listening" : ""}`}
            onClick={handleVoiceSearch}
            aria-label="Use voice search dictation"
            title="Voice Search Input"
          >
            <Mic size={16} />
            <span>{isListening ? "Listening..." : "Voice Search"}</span>
          </button>
        </div>

        <div className="filter-controls-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          <div className="filter-group">
            <label htmlFor="cat-filter" className="filter-label">Job Domain</label>
            <select
              id="cat-filter"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="loc-filter" className="filter-label">Location</label>
            <select
              id="loc-filter"
              className="filter-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.filter(l => l !== "all").map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sal-filter" className="filter-label">Salary Range</label>
            <select
              id="sal-filter"
              className="filter-select"
              value={selectedSalary}
              onChange={(e) => setSelectedSalary(e.target.value)}
            >
              <option value="all">All Salaries</option>
              <option value="6">Above ₹6 LPA</option>
              <option value="8">Above ₹8 LPA</option>
              <option value="10">Above ₹10 LPA</option>
              <option value="12">Above ₹12 LPA</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="type-filter" className="filter-label">Job Type</label>
            <select
              id="type-filter"
              className="filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Employment Types</option>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="acc-filter" className="filter-label">Accessibility Accommodation</label>
            <select
              id="acc-filter"
              className="filter-select"
              value={selectedAccommodation}
              onChange={(e) => setSelectedAccommodation(e.target.value)}
            >
              <option value="all">All Accommodations</option>
              <option value="Screen Reader Compatible">Screen Reader Compatible</option>
              <option value="Voice-Guided Workflows">Voice-Guided Workflows</option>
              <option value="Braille Hardware Supported">Braille Hardware Supported</option>
              <option value="Flexible Remote Work">Flexible Remote Work</option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags Row */}
        {hasActiveFilters && (
          <div className="active-filters-bar" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border-color)" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Active Filters:</span>
            {searchTerm && (
              <span className="badge-filter-tag">
                Keyword: "{searchTerm}"
                <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear keyword search">&times;</button>
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="badge-filter-tag">
                Domain: {selectedCategory}
                <button type="button" onClick={() => setSelectedCategory("all")} aria-label="Clear domain filter">&times;</button>
              </span>
            )}
            {selectedLocation !== "all" && (
              <span className="badge-filter-tag">
                Location: {selectedLocation}
                <button type="button" onClick={() => setSelectedLocation("all")} aria-label="Clear location filter">&times;</button>
              </span>
            )}
            {selectedSalary !== "all" && (
              <span className="badge-filter-tag">
                Salary: Above ₹{selectedSalary} LPA
                <button type="button" onClick={() => setSelectedSalary("all")} aria-label="Clear salary filter">&times;</button>
              </span>
            )}
            {selectedType !== "all" && (
              <span className="badge-filter-tag">
                Type: {selectedType}
                <button type="button" onClick={() => setSelectedType("all")} aria-label="Clear job type filter">&times;</button>
              </span>
            )}
            {selectedAccommodation !== "all" && (
              <span className="badge-filter-tag">
                Accommodation: {selectedAccommodation}
                <button type="button" onClick={() => setSelectedAccommodation("all")} aria-label="Clear accommodation filter">&times;</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div style={{ margin: "24px 0 12px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
          Showing {filteredJobs.length} Available Jobs
        </h2>
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 && (
        <div className="empty-state-card">
          <h2>No matching jobs found</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
            Try broadening your search keywords or resetting your accessibility filter preferences.
          </p>
          <button type="button" className="secondary-btn" onClick={handleResetFilters}>
            <RotateCcw size={15} />
            <span>Show All Available Jobs</span>
          </button>
        </div>
      )}

      {/* Job Cards Grid */}
      <div className="job-cards-container">
        {filteredJobs.map((job) => {
          const isSaved = isJobSaved(job, savedJobIds);

          return (
            <article
              key={job.id}
              className="job-card-accessible"
              tabIndex={0}
              aria-label={`${job.title} at ${job.company}, ${job.location}, ${job.type}`}
            >
              <div>
                <div className="job-card-header">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <div className="job-company-name">{job.company}</div>
                  </div>
                  <span className="badge-type">{job.type}</span>
                </div>

                <div className="job-card-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} color="#475569" />
                    <span><strong>Location:</strong> {job.location}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <IndianRupee size={15} color="#475569" />
                    <span><strong>Salary:</strong> {job.salary}</span>
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
              </div>

              <div className="job-card-actions">
                <button
                  className="primary-btn"
                  onClick={() => {
                    const id = getJobId(job);
                    if (id && onSelectJob) {
                      conversationMemory.setReferencedJob(job);
                      onSelectJob(job);
                    }
                  }}
                  aria-label={`View full details for ${job.title}`}
                >
                  <ExternalLink size={15} />
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  className={`btn-save ${isSaved ? "saved" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onToggleSaveJob) onToggleSaveJob(job);
                  }}
                  aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                >
                  <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>

                <button
                  className="btn-audio-listen"
                  onClick={() => speak(`${job.title} at ${job.company}. Location: ${job.location}. Salary: ${job.salary}. Description: ${job.description}`)}
                  aria-label={`Listen to job summary for ${job.title}`}
                >
                  <Volume2 size={15} />
                  <span>Read Aloud</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
