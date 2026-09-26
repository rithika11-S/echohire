/**
 * Conversation Memory Context for Echo Assistant.
 * Tracks session state: lastReferencedField, lastReferencedJob, lastReferencedPage, and handles pronoun resolution ("that", "it").
 */

class ConversationMemory {
  constructor() {
    this.lastReferencedField = null; // { id: "name", label: "Name", value: "Rithika" }
    this.lastReferencedJob = null;   // { id, title, company, index, jobObj }
    this.lastReferencedPage = "home";
    this.lastReferencedValue = null;
    this.lastActionProposed = null;  // { type: "APPLY_JOB", payload: { job } }
    this.history = [];

    // Filtered / Recommended Jobs Sequential Navigation State
    this.filteredSequence = [];        // Array of job objects matching active filter or recommendations
    this.filteredSequenceIndex = 0;    // Index of job currently/last focused
    this.isNavigatingSequence = false; // Whether sequential navigation is active
    this.sequenceType = "filter";      // "filter" | "recommendations"
    this.sequenceAlreadySpokenOnNav = false; // Flag to prevent duplicate speech between action handler and route change
    this.justFilteredByVoice = false;        // Flag to prevent UI change listener re-speaking after voice filter
  }

  /**
   * Initializes or updates the active filtered jobs sequence.
   */
  setFilteredSequence(jobsList, initialIndex = 0) {
    this.filteredSequence = Array.isArray(jobsList) ? jobsList : [];
    this.filteredSequenceIndex = initialIndex;
    this.isNavigatingSequence = this.filteredSequence.length > 0;
    this.sequenceType = "filter";
    console.log(`[ConversationMemory] Set filtered sequence (${this.filteredSequence.length} jobs), starting at index ${initialIndex}`);
  }

  /**
   * Initializes or updates the active AI recommendations sequence.
   */
  setRecommendationSequence(jobsList, initialIndex = 0) {
    this.filteredSequence = Array.isArray(jobsList) ? jobsList : [];
    this.filteredSequenceIndex = initialIndex;
    this.isNavigatingSequence = this.filteredSequence.length > 0;
    this.sequenceType = "recommendations";
    console.log(`[ConversationMemory] Set recommendation sequence (${this.filteredSequence.length} jobs), starting at index ${initialIndex}`);
  }

  /**
   * Initializes or updates the active saved jobs sequence.
   */
  setSavedJobsSequence(jobsList, initialIndex = 0) {
    this.filteredSequence = Array.isArray(jobsList) ? jobsList : [];
    this.filteredSequenceIndex = initialIndex;
    this.isNavigatingSequence = this.filteredSequence.length > 0;
    this.sequenceType = "savedJobs";
    console.log(`[ConversationMemory] Set saved jobs sequence (${this.filteredSequence.length} jobs), starting at index ${initialIndex}`);
  }

  advanceFilteredSequence() {
    this.filteredSequenceIndex += 1;
    return this.getCurrentSequenceJob();
  }

  getCurrentSequenceJob() {
    if (
      this.isNavigatingSequence &&
      this.filteredSequenceIndex >= 0 &&
      this.filteredSequenceIndex < this.filteredSequence.length
    ) {
      return this.filteredSequence[this.filteredSequenceIndex];
    }
    return null;
  }

  clearFilteredSequence() {
    this.filteredSequence = [];
    this.filteredSequenceIndex = 0;
    this.isNavigatingSequence = false;
    this.sequenceType = "filter";
    this.sequenceAlreadySpokenOnNav = false;
    this.justFilteredByVoice = false;
  }

  /**
   * Formats a conversational, accessible description of a job in the sequence.
   * @param {Object} job - Target job listing
   * @param {number} index - Sequence index (0-based)
   * @param {number} total - Total matching jobs in sequence
   * @param {boolean|string} mode - false: initial, true/'return': returning from details, 'advance': advancing on "no"
   * @param {string} customType - "filter" | "recommendations" | "savedJobs" (defaults to this.sequenceType)
   * @param {boolean} isApplied - Whether this job is already applied by the active user
   * @returns {string} Natural language summary
   */
  formatJobExplanation(job, index = 0, total = 1, mode = false, customType = null, isApplied = false) {
    if (!job) return "";
    const type = customType || this.sequenceType || "filter";
    const ordinalWords = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
    const ordWord = ordinalWords[index] || `number ${index + 1}`;
    const descSnippet = job.description ? ` Responsibilities include ${job.description.slice(0, 110)}.` : "";
    const locText = job.location ? ` located in ${job.location}` : "";
    const salText = job.salary ? ` with salary ${job.salary}` : "";
    const skillsText = job.skills ? (Array.isArray(job.skills) ? job.skills.join(", ") : job.skills) : "";
    const skillsSnippet = skillsText ? ` Required skills: ${skillsText}.` : "";
    const matchScore = job.matchScore || 85;

    const isReturn = mode === true || mode === "return";
    const isAdvance = mode === "advance";

    if (type === "savedJobs") {
      const countPrefix = total === 1 ? "You have 1 saved job position." : `You have ${total} saved job positions.`;
      const hasNext = total > 1 && index < total - 1;
      const nextPrompt = hasNext ? " Would you like to move to the next saved job?" : "";

      if (isApplied) {
        if (isReturn) {
          return `Returned to Saved Jobs. The ${ordWord} saved job is ${job.title} at ${job.company},${locText}.${skillsSnippet} You have already applied for this job.${nextPrompt}`;
        }
        if (isAdvance) {
          return `Understood. Moving to the ${ordWord} saved job: ${job.title} at ${job.company},${locText}.${skillsSnippet} You have already applied for this job.${nextPrompt}`;
        }
        return `${countPrefix} The ${ordWord} saved job is ${job.title} at ${job.company},${locText}.${skillsSnippet} You have already applied for this job.${nextPrompt}`;
      }

      // Not applied: ask "Can I apply for this job?"
      if (isReturn) {
        return `Returned to Saved Jobs. The ${ordWord} saved job is ${job.title} at ${job.company},${locText}${salText}.${descSnippet || skillsSnippet} Can I apply for this job?`;
      }
      if (isAdvance) {
        return `Understood. Moving to the ${ordWord} saved job: ${job.title} at ${job.company},${locText}${salText}.${descSnippet || skillsSnippet} Can I apply for this job?`;
      }
      return `${countPrefix} The ${ordWord} saved job is ${job.title} at ${job.company},${locText}${salText}.${descSnippet || skillsSnippet} Can I apply for this job?`;
    }

    if (type === "recommendations") {
      if (isReturn) {
        return `Returned to AI Recommendations. The ${ordWord} recommendation is ${job.title} at ${job.company}, with an AI match score of ${matchScore} percent,${locText}${salText}.${descSnippet} Can I open view details for this job?`;
      }
      if (isAdvance) {
        return `Understood. Moving to the ${ordWord} recommendation: ${job.title} at ${job.company}, with an AI match score of ${matchScore} percent,${locText}${salText}.${descSnippet} Can I open view details for this job?`;
      }
      return `Welcome to AI Recommendations. Here are personalized job opportunities tailored to your profile and accessibility preferences. The first recommendation is ${job.title} at ${job.company}, with an AI match score of ${matchScore} percent,${locText}${salText}.${descSnippet} Can I open view details for this job?`;
    }

    // Default "filter" mode
    if (isReturn) {
      return `Returned to Find Jobs page with your active filters intact. The ${ordWord} job is ${job.title} at ${job.company},${locText}${salText}.${descSnippet} Can I open view details for this job?`;
    }
    if (isAdvance) {
      return `Understood. Moving to the ${ordWord} position: ${job.title} at ${job.company},${locText}${salText}.${descSnippet} Can I open view details for this job?`;
    }

    const countPrefix = total === 1 ? "Found 1 matching job." : `Found ${total} matching jobs.`;
    return `${countPrefix} The ${ordWord} job is ${job.title} at ${job.company},${locText}${salText}.${descSnippet} Can I open view details for this job?`;
  }

  /**
   * Sets the last referenced form field.
   */
  setReferencedField(fieldConfig, value) {
    if (!fieldConfig) return;
    this.lastReferencedField = {
      id: fieldConfig.id,
      label: fieldConfig.label,
      value: value !== undefined ? value : (fieldConfig.getValue ? fieldConfig.getValue() : ""),
    };
    console.log(`[ConversationMemory] Saved lastReferencedField:`, this.lastReferencedField);
  }

  /**
   * Sets the last referenced job.
   */
  setReferencedJob(job, index) {
    if (!job) return;
    this.lastReferencedJob = {
      id: job.id,
      title: job.title,
      company: job.company,
      index: index !== undefined ? index : 0,
      jobObj: job,
    };
    console.log(`[ConversationMemory] Saved lastReferencedJob:`, this.lastReferencedJob);
  }

  /**
   * Sets a proposed action for conversational follow-up confirmation ("Would you like me to open the form?").
   */
  setProposedAction(actionType, payload) {
    this.lastActionProposed = { type: actionType, payload, timestamp: Date.now() };
    console.log(`[ConversationMemory] Saved proposed action:`, this.lastActionProposed);
  }

  clearProposedAction() {
    this.lastActionProposed = null;
  }

  /**
   * Resolves target field when user uses pronouns ("that", "it", "this").
   * @param {string} phrase - User input text (e.g. "change that to Rithika")
   * @returns {Object|null}
   */
  resolveFieldPronoun(phrase) {
    if (!phrase) return this.lastReferencedField;
    const lower = phrase.toLowerCase();
    const pronouns = ["that", "it", "this", "the field"];

    for (const p of pronouns) {
      if (lower.includes(p) && this.lastReferencedField) {
        console.log(`[ConversationMemory] Resolved pronoun "${p}" to field: "${this.lastReferencedField.label}"`);
        return this.lastReferencedField;
      }
    }

    return this.lastReferencedField;
  }

  /**
   * Resolves target job when user uses pronouns ("that job", "it", "this job").
   * @param {string} phrase - User input text (e.g. "open that job", "apply for it")
   * @returns {Object|null}
   */
  resolveJobPronoun(phrase) {
    if (this.lastReferencedJob) {
      return this.lastReferencedJob;
    }
    return null;
  }

  /**
   * Appends exchange to conversation history.
   */
  addExchange(userText, assistantText) {
    this.history.push({ user: userText, assistant: assistantText, timestamp: Date.now() });
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  clear() {
    this.lastReferencedField = null;
    this.lastReferencedJob = null;
    this.lastReferencedValue = null;
    this.lastActionProposed = null;
    this.history = [];
  }
}

export const conversationMemory = new ConversationMemory();
