/**
 * Action Handler Engine for Echo Assistant.
 * Handles voice field editing, pronoun resolution, activation commands, navigation, and page explanations.
 */

import { INTENTS, normalizeText } from "./intentDetector.js";
import { echoTTS } from "./textToSpeech.js";
import { formContext } from "./FormContextService.js";
import { conversationMemory } from "./ConversationContext.js";
import { readCurrentPage, readAvailableButtons } from "./pageScreenReader.js";
import { voiceEditingManager, EDIT_STATES } from "./VoiceEditingService.js";
import { getJobId } from "../utils/jobUtils.js";

/**
 * Helper to programmatically update React input elements and trigger input events.
 */
function updateDomInput(selector, value) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(selector);
  if (el) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/**
 * Helper to programmatically update select dropdowns and trigger change events.
 */
function updateDomSelect(selector, value) {
  if (typeof document === "undefined") return false;
  const el = document.querySelector(selector);
  if (el) {
    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value"
    )?.set;

    let targetValue = value;
    let matchingOption = Array.from(el.options || []).find(
      (opt) => opt.value === value || opt.value.toLowerCase() === String(value).toLowerCase()
    );

    if (!matchingOption && value && value !== "all") {
      matchingOption = Array.from(el.options || []).find(
        (opt) =>
          opt.value.toLowerCase().includes(String(value).toLowerCase()) ||
          opt.textContent.toLowerCase().includes(String(value).toLowerCase())
      );
    }

    if (matchingOption) {
      targetValue = matchingOption.value;
    }

    if (nativeSelectValueSetter) {
      nativeSelectValueSetter.call(el, targetValue);
    } else {
      el.value = targetValue;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return matchingOption || targetValue === "all";
  }
  return false;
}

/**
 * Reusable helper to resolve which job object the user is referring to based on priority rules.
 */
export function resolveJobContext(jobIndex, context) {
  const visibleJobs = context.visibleJobs || [];

  if (context.isJobDetailOpen && context.activeJob) {
    return { job: context.activeJob, source: "Job Details View" };
  }

  if (jobIndex !== undefined && jobIndex !== null && jobIndex >= 0) {
    if (jobIndex < visibleJobs.length) {
      return { job: visibleJobs[jobIndex], source: `Job #${jobIndex + 1}` };
    }
    return {
      job: null,
      error: `Position number ${jobIndex + 1} is not available. There are currently ${visibleJobs.length} jobs displayed on this page.`,
      source: "Out of bounds",
    };
  }

  if (visibleJobs.length === 1) {
    return { job: visibleJobs[0], source: "Single Visible Job" };
  }

  if (visibleJobs.length > 1) {
    return {
      job: null,
      isAmbiguous: true,
      ambiguityMessage: `I can help with that. There are currently ${visibleJobs.length} jobs listed. You can say, for example, 'Where is the first job located?' or ask me to list the available jobs.`,
      source: "Ambiguous Multiple Jobs",
    };
  }

  return {
    job: null,
    error: "There are currently no jobs displayed on this page.",
    source: "No Jobs Visible",
  };
}

export function handleAssistantAction({
  intent,
  userQuery,
  context,
  navigate,
  onSelectJob,
  onSaveJob,
  onUnsaveJob,
  guidedAppManager,
  currentUser,
  onApplySubmit,
  openAssistantPanel,
  updateProfileState,
}) {
  const { type, target, searchTerm, jobIndex, fieldQuery, newValue } = intent;
  const visibleJobs = context.visibleJobs || [];
  const normalizedText = intent.normalizedText || normalizeText(userQuery);

  // Resolve job context for job property queries
  const resolvedContext = resolveJobContext(jobIndex, context);

  // Console Logging for Debugging
  console.log("Original command:", userQuery);
  console.log("Normalized command:", normalizedText);
  console.log("Detected intent:", type);
  console.log("Current path:", context.currentPath || "/");
  console.log("Current page:", context.pageTitle);

  const logAction = (actionName) => {
    console.log("Action executed:", actionName);
  };

  // 0. Active Guided Field Editing Flow Processing
  if (voiceEditingManager && voiceEditingManager.state !== EDIT_STATES.IDLE) {
    const qLower = (userQuery || "").toLowerCase().trim();
    const isQuestionPhrase =
      qLower.startsWith("what") ||
      qLower.startsWith("how") ||
      qLower.startsWith("where") ||
      qLower.startsWith("can you") ||
      qLower.startsWith("explain") ||
      qLower.startsWith("tell me") ||
      qLower.startsWith("show me") ||
      qLower.startsWith("read");

    // Special case: if user is focused on the submit button and says "sign in", "register",
    // "create account" etc., treat it as a form submission — NOT navigation
    const isOnSubmitField = voiceEditingManager.activeFieldId === "submit";
    const isFormSubmitPhrase =
      isOnSubmitField && (
        type === INTENTS.NAVIGATE_SIGNIN ||
        type === INTENTS.NAVIGATE_REGISTER ||
        type === INTENTS.NAVIGATE_REGISTER_SEEKER ||
        type === INTENTS.NAVIGATE_REGISTER_EMPLOYER ||
        type === INTENTS.FORM_SUBMIT
      );

    if (isFormSubmitPhrase) {
      console.log("[ActionHandler] Submit field active — treating navigation intent as form submit:", type);
      const result = voiceEditingManager.processCapturedValue(userQuery);
      if (result && result.prompt) {
        echoTTS.speak(result.prompt);
        conversationMemory.addExchange(userQuery, result.prompt);
        return { reply: result.prompt };
      }
    }

    const isCommandOrNavigationIntent =
      isQuestionPhrase ||
      type === INTENTS.READ_FIELD ||
      type === INTENTS.NAVIGATE_HOME ||
      type === INTENTS.NAVIGATE_JOBS ||
      type === INTENTS.NAVIGATE_RECOMMENDATIONS ||
      type === INTENTS.NAVIGATE_PROFILE ||
      type === INTENTS.NAVIGATE_APPLICATIONS ||
      type === INTENTS.NAVIGATE_SAVED_JOBS ||
      type === INTENTS.NAVIGATE_CANDIDATES ||
      type === INTENTS.NAVIGATE_EMPLOYER_DASHBOARD ||
      type === INTENTS.NAVIGATE_ADMIN_DASHBOARD ||
      type === INTENTS.NAVIGATE_BACK ||
      type === INTENTS.NAVIGATE_SIGNIN ||
      type === INTENTS.NAVIGATE_REGISTER ||
      type === INTENTS.NAVIGATE_REGISTER_SEEKER ||
      type === INTENTS.NAVIGATE_REGISTER_EMPLOYER ||
      type === INTENTS.ACTIVATE_ASSISTANT ||
      type === INTENTS.FORM_START_GUIDED ||
      type === INTENTS.FORM_NEXT_FIELD ||
      type === INTENTS.FORM_PREV_FIELD ||
      type === INTENTS.FORM_SKIP_FIELD ||
      type === INTENTS.FORM_REPEAT_FIELD ||
      type === INTENTS.FORM_CLEAR_FIELD ||
      type === INTENTS.FORM_SUBMIT ||
      type === INTENTS.FORM_CANCEL ||
      type === INTENTS.STOP_LISTENING ||
      type === INTENTS.ACCESSIBILITY_PAGE_EXPLAIN ||
      type === INTENTS.READ_BUTTONS ||
      (type && type.startsWith("AUDIO_CONTROL_"));

    if (isCommandOrNavigationIntent) {
      console.log("[ActionHandler] Command or question intent detected during voice editing:", type, "query:", userQuery);
      if (
        type === INTENTS.NAVIGATE_HOME ||
        type === INTENTS.NAVIGATE_JOBS ||
        type === INTENTS.NAVIGATE_RECOMMENDATIONS ||
        type === INTENTS.NAVIGATE_PROFILE ||
        type === INTENTS.NAVIGATE_APPLICATIONS ||
        type === INTENTS.NAVIGATE_SAVED_JOBS ||
        type === INTENTS.NAVIGATE_CANDIDATES ||
        type === INTENTS.NAVIGATE_EMPLOYER_DASHBOARD ||
        type === INTENTS.NAVIGATE_ADMIN_DASHBOARD ||
        type === INTENTS.NAVIGATE_BACK ||
        type === INTENTS.NAVIGATE_SIGNIN ||
        type === INTENTS.NAVIGATE_REGISTER ||
        type === INTENTS.NAVIGATE_REGISTER_SEEKER ||
        type === INTENTS.NAVIGATE_REGISTER_EMPLOYER ||
        type === INTENTS.FORM_CANCEL ||
        type === INTENTS.STOP_LISTENING
      ) {
        voiceEditingManager.reset();
      }
      // Fall through so intent is handled by specific system/question handler below
    } else {
      // Check if user is attempting navigation even if intent was ambiguous
      const hasNavPrefix =
        qLower.includes("navigate") ||
        qLower.includes("go to") ||
        qLower.includes("take me") ||
        qLower.includes("open page");

      if (hasNavPrefix) {
        console.log("[ActionHandler] Navigation prefix detected during voice editing, resetting voice manager:", userQuery);
        voiceEditingManager.reset();
      }

      logAction("GUIDED_VOICE_EDITING_STEP");
      console.log("Voice editing state:", voiceEditingManager.state);
      console.log("Temporary editing value:", voiceEditingManager.temporaryValue);
      console.log("Last referenced field:", voiceEditingManager.activeFieldId);

      let result = null;
      if (voiceEditingManager.state === EDIT_STATES.CAPTURING_VALUE) {
        result = voiceEditingManager.processCapturedValue(userQuery);
      } else {
        result = voiceEditingManager.handleConfirmationResponse(userQuery);
      }

      if (result && result.prompt) {
        echoTTS.speak(result.prompt);
        conversationMemory.addExchange(userQuery, result.prompt);
        return { reply: result.prompt };
      }
    }
  }

  // 1. VOICE ACTIVATION INTENT
  if (type === INTENTS.ACTIVATE_ASSISTANT) {
    logAction("ACTIVATE_ASSISTANT");
    if (openAssistantPanel) openAssistantPanel();
    const reply = "Echo Assistant is ready. How can I help you?";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a0. Social Greetings & Chitchat
  if (type === INTENTS.GREETING) {
    logAction("GREETING");
    const userName = currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : "";
    const reply = `Hello${userName}! How can I help you today? You can ask me questions about jobs, navigate pages, manage your profile, or ask for recommendations.`;
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  if (type === INTENTS.THANK_YOU) {
    logAction("THANK_YOU");
    const reply = "You're very welcome! Let me know whenever you need help searching for jobs, managing applications, or navigating EchoHire.";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a. GENERAL_SITE_PAGES Intent ("What are all the other pages provided in this website?", "What pages are available?")
  if (type === INTENTS.GENERAL_SITE_PAGES) {
    logAction("GENERAL_SITE_PAGES");
    const isRecruiter = currentUser?.role === "employer" || currentUser?.role === "recruiter";
    let reply = "";
    if (isRecruiter) {
      reply = "EchoHire provides several pages for Employers: Home, Employer Dashboard, Candidates, Find Jobs, and Profile. Employer Dashboard lets you create and manage job listings and review applicants, Candidates allows searching qualified professionals, and Find Jobs lets you browse market listings. You can ask me to open any of these pages.";
    } else {
      reply = "EchoHire provides several pages: Home, Find Jobs, Recommendations, Saved Jobs, Applications, and Profile. Find Jobs lets you search and filter opportunities, Recommendations shows suggested jobs tailored to your skills, Saved Jobs accesses jobs you've bookmarked, Applications tracks your submitted applications, and Profile lets you manage your career details. You can ask me to open any of these pages.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a2. GENERAL_SITE_ABOUT Intent ("What is EchoHire?", "Tell me about EchoHire")
  if (type === INTENTS.GENERAL_SITE_ABOUT) {
    logAction("GENERAL_SITE_ABOUT");
    const reply = "EchoHire is an accessible job platform designed for job seekers and inclusive employers. It features AI job matching, hands-free voice navigation, screen reader support, and automated application tracking. You can search for jobs, save listings, apply, track your application statuses, or manage your profile using voice commands or typed messages.";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a3. ROLE_FEATURES_QUERY Intent ("What can a job seeker do?", "What can a recruiter do?")
  if (type === INTENTS.ROLE_FEATURES_QUERY) {
    logAction("ROLE_FEATURES_QUERY");
    const isRecruiter = currentUser?.role === "employer" || currentUser?.role === "recruiter";
    let reply = "";
    if (isRecruiter) {
      reply = "As a Recruiter on EchoHire, you can create and manage job listings, review applicant candidate profiles, update application status tracking, search candidate database, and manage your company profile.";
    } else {
      reply = "As a Job Seeker on EchoHire, you can search for jobs, receive AI recommendations, save bookmarked jobs, submit and track applications, manage your profile and accommodation needs, and navigate hands-free with Echo Assistant.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a4. HOW_TO_QUERY Intent ("How do I apply?", "How do I save a job?")
  if (type === INTENTS.HOW_TO_QUERY) {
    logAction("HOW_TO_QUERY");
    const topic = intent.topic;
    let reply = "";
    if (topic === "apply") {
      reply = "To apply for a job, navigate to Find Jobs or Job Details, select a position, and say 'Apply for this job' or click the Apply button. I will guide you through submitting your application.";
    } else if (topic === "save") {
      reply = "To save a job, say 'Save this job' while viewing any job card or job details page. The job will be added to your Saved Jobs page.";
    } else if (topic === "profile") {
      reply = "To update your profile, say 'Open my profile' or navigate to Profile. You can update your name, phone, summary, skills, and accessibility needs directly.";
    } else if (topic === "postJob") {
      reply = "To post a job as a Recruiter, sign in to your Employer account, go to Employer Dashboard, click 'Post a New Job', and fill in the role details.";
    } else {
      reply = "You can use EchoHire by navigating through pages, searching for jobs, or asking me for assistance at any step.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a5. RECOMMENDATIONS_QUERY Intent ("Which page shows jobs recommended for me?")
  if (type === INTENTS.RECOMMENDATIONS_QUERY) {
    logAction("RECOMMENDATIONS_QUERY");
    const reply = "The AI Job Recommendations page shows jobs suggested specifically for you based on your profile skills and accessibility preferences. Would you like me to open Recommendations?";
    conversationMemory.setProposedAction("NAVIGATE", { route: "/recommendations", pageName: "Recommendations" });
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1a6. AFFIRMATIVE_CONFIRM & NEGATIVE_CANCEL Intents ("Yes", "Sure", "Apply now", "No")
  if (type === INTENTS.AFFIRMATIVE_CONFIRM) {
    logAction("AFFIRMATIVE_CONFIRM");
    if (conversationMemory.lastActionProposed) {
      const { type: actType, payload } = conversationMemory.lastActionProposed;
      conversationMemory.clearProposedAction();
      if (actType === "NAVIGATE" && payload?.route) {
        if (navigate) navigate(payload.route);
        const reply = `Opening ${payload.pageName || "the page"}.`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
      if (actType === "OPEN_JOB_DETAILS" && payload?.job) {
        if (onSelectJob) onSelectJob(payload.job);
        conversationMemory.setReferencedJob(payload.job);
        const reply = `Opening view details for ${payload.job.title} at ${payload.job.company}.`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
      if (actType === "APPLY_JOB" && payload?.job) {
        const targetJob = payload.job;
        if (!currentUser) {
          if (navigate) navigate("/login");
          const msg = "Please sign in to your Job Seeker account to submit applications.";
          echoTTS.speak(msg);
          conversationMemory.addExchange(userQuery, msg);
          return { reply: msg };
        }

        if (onApplySubmit) {
          onApplySubmit(targetJob, "");
        }

        if (typeof document !== "undefined") {
          const applyBtn = document.querySelector(".primary-btn:not(.applied), button[aria-label*='Apply']");
          if (applyBtn) {
            applyBtn.click();
          }
        }

        // Check if sequential review is active on saved jobs
        if (conversationMemory.isNavigatingSequence && conversationMemory.sequenceType === "savedJobs") {
          const sequence = conversationMemory.filteredSequence;
          const nextIndex = conversationMemory.filteredSequenceIndex + 1;

          if (nextIndex < sequence.length) {
            conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
              job: sequence[nextIndex],
              list: sequence,
              index: nextIndex,
              sequenceType: "savedJobs",
            });
            const reply = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}! Would you like to move to the next saved job?`;
            echoTTS.speak(reply);
            conversationMemory.addExchange(userQuery, reply);
            return { reply };
          } else {
            conversationMemory.clearFilteredSequence();
            const reply = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}! You have reviewed all your saved jobs.`;
            echoTTS.speak(reply);
            conversationMemory.addExchange(userQuery, reply);
            return { reply };
          }
        }

        const reply = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}!`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
      if (actType === "NEXT_SAVED_JOB") {
        const sequence = conversationMemory.filteredSequence;
        const nextIndex = conversationMemory.filteredSequenceIndex + 1;

        if (nextIndex < sequence.length) {
          conversationMemory.filteredSequenceIndex = nextIndex;
          const nextJob = sequence[nextIndex];
          conversationMemory.setReferencedJob(nextJob, nextIndex);

          const appliedIds = context.appliedJobIds || [];
          const nextJobId = getJobId(nextJob);
          const isApplied =
            appliedIds.includes(nextJobId) ||
            appliedIds.includes(nextJob.id) ||
            appliedIds.includes(nextJob._id) ||
            appliedIds.includes(String(nextJob.id || "").replace(/^job-/, "")) ||
            appliedIds.includes(`job-${String(nextJob.id || "").replace(/^job-/, "")}`);

          if (isApplied) {
            if (nextIndex < sequence.length - 1) {
              conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
                job: nextJob,
                list: sequence,
                index: nextIndex,
                sequenceType: "savedJobs",
              });
            } else {
              conversationMemory.clearProposedAction();
            }
          } else {
            conversationMemory.setProposedAction("APPLY_JOB", {
              job: nextJob,
              list: sequence,
              index: nextIndex,
              sequenceType: "savedJobs",
            });
          }

          const reply = conversationMemory.formatJobExplanation(
            nextJob,
            nextIndex,
            sequence.length,
            "advance",
            "savedJobs",
            isApplied
          );
          echoTTS.speak(reply);
          conversationMemory.addExchange(userQuery, reply);
          return { reply };
        } else {
          conversationMemory.clearFilteredSequence();
          const reply = "You have reached the end of your saved jobs. Let me know if you would like to explore any job again or find more jobs.";
          echoTTS.speak(reply);
          conversationMemory.addExchange(userQuery, reply);
          return { reply };
        }
      }
    }
    const reply = "Understood. How else can I assist you on EchoHire?";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  if (type === INTENTS.NEGATIVE_CANCEL) {
    logAction("NEGATIVE_CANCEL");
    if (conversationMemory.isNavigatingSequence && conversationMemory.filteredSequence.length > 0) {
      conversationMemory.clearProposedAction();
      const nextIndex = conversationMemory.filteredSequenceIndex + 1;
      const sequence = conversationMemory.filteredSequence;

      if (nextIndex < sequence.length) {
        conversationMemory.filteredSequenceIndex = nextIndex;
        const nextJob = sequence[nextIndex];
        conversationMemory.setReferencedJob(nextJob, nextIndex);

        if (conversationMemory.sequenceType === "savedJobs") {
          const appliedIds = context.appliedJobIds || [];
          const nextJobId = getJobId(nextJob);
          const isApplied =
            appliedIds.includes(nextJobId) ||
            appliedIds.includes(nextJob.id) ||
            appliedIds.includes(nextJob._id) ||
            appliedIds.includes(String(nextJob.id || "").replace(/^job-/, "")) ||
            appliedIds.includes(`job-${String(nextJob.id || "").replace(/^job-/, "")}`);

          if (isApplied) {
            if (nextIndex < sequence.length - 1) {
              conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
                job: nextJob,
                list: sequence,
                index: nextIndex,
                sequenceType: "savedJobs",
              });
            } else {
              conversationMemory.clearProposedAction();
            }
          } else {
            conversationMemory.setProposedAction("APPLY_JOB", {
              job: nextJob,
              list: sequence,
              index: nextIndex,
              sequenceType: "savedJobs",
            });
          }

          const reply = conversationMemory.formatJobExplanation(
            nextJob,
            nextIndex,
            sequence.length,
            "advance",
            "savedJobs",
            isApplied
          );
          echoTTS.speak(reply);
          conversationMemory.addExchange(userQuery, reply);
          return { reply };
        }

        // Default filter / recommendations mode
        conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
          job: nextJob,
          list: sequence,
          index: nextIndex,
          sequenceType: conversationMemory.sequenceType,
        });

        const reply = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, "advance");
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      } else {
        const isRec = conversationMemory.sequenceType === "recommendations";
        const isSaved = conversationMemory.sequenceType === "savedJobs";
        conversationMemory.clearFilteredSequence();
        const reply = isSaved
          ? "You have reached the end of your saved jobs. Let me know if you would like to explore any job again or find more jobs."
          : isRec
          ? `You have reached the end of the recommendations. Let me know if you would like to explore any job again or search for new jobs.`
          : `You have reached the end of all ${sequence.length} filtered positions. Let me know if you would like to adjust your filters or search again.`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
    }

    conversationMemory.clearProposedAction();
    const reply = "No problem. Let me know if you need anything else.";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 1b. PROFILE_EDIT_NAME Intent ("Change my name", "Edit my name")
  if (type === INTENTS.PROFILE_EDIT_NAME) {
    logAction("PROFILE_EDIT_NAME");
    const editRes = voiceEditingManager.startGuidedEdit("name", newValue, updateProfileState);
    if (editRes && editRes.prompt) {
      echoTTS.speak(editRes.prompt);
      conversationMemory.addExchange(userQuery, editRes.prompt);
      return { reply: editRes.prompt };
    }
  }

  // 1c. FORM_START_GUIDED Intent ("Start guided form", "Help me fill the form", "Yes")
  if (type === INTENTS.FORM_START_GUIDED) {
    logAction("FORM_START_GUIDED");
    const fields = formContext.getRegisteredFields();
    if (fields.length > 0) {
      const firstField = fields[0];
      firstField.focus();
      const editRes = voiceEditingManager.startGuidedEdit(firstField.id, null, updateProfileState);
      const reply = `Starting voice-guided form assistance. ${editRes.prompt}`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    } else {
      const reply = "No active form fields detected on this page.";
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }
  }

  // 1d. FORM_NEXT_FIELD Intent ("Next field", "Next", "Skip")
  if (type === INTENTS.FORM_NEXT_FIELD || type === INTENTS.FORM_SKIP_FIELD) {
    logAction("FORM_NEXT_FIELD");
    const allFields = formContext.getRegisteredFields();

    // Filter to ONLY enabled fields that exist in DOM and are not disabled
    const fields = allFields.filter((f) => {
      if (f.disabled) return false;
      const domEl = f.elementId ? document.getElementById(f.elementId) : null;
      if (domEl && domEl.disabled) return false;
      return true;
    });

    if (fields.length > 0) {
      // Find current active index: check voiceEditingManager first, or document.activeElement
      let activeIdx = fields.findIndex((f) => f.id === voiceEditingManager.activeFieldId);
      if (activeIdx === -1 && typeof document !== "undefined" && document.activeElement) {
        const activeEl = document.activeElement;
        activeIdx = fields.findIndex((f) => {
          const el = f.elementId ? document.getElementById(f.elementId) : null;
          return el === activeEl || (el && el.contains(activeEl));
        });
      }

      const nextIdx = (activeIdx >= 0 && activeIdx < fields.length - 1) ? activeIdx + 1 : 0;
      const nextField = fields[nextIdx];

      // 1. Clear highlight and blur previous active element immediately
      formContext.clearAllFocusStyles();
      if (typeof document !== "undefined" && document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      // 2. Focus the new target field in the DOM
      if (nextField.elementId) {
        formContext.focusElement(nextField.elementId);
      } else if (nextField.focus) {
        nextField.focus();
      }

      // 3. Update voiceEditingManager state and speak prompt
      const editRes = voiceEditingManager.startGuidedEdit(nextField.id, null, updateProfileState);
      const reply = editRes?.prompt?.toLowerCase().includes(nextField.label.toLowerCase())
        ? editRes.prompt
        : `Moved to ${nextField.label}. ${editRes?.prompt || "Please enter the value."}`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    } else if (conversationMemory.isNavigatingSequence) {
      // Fallback for job sequence if on jobs page without active form
      const nextIndex = conversationMemory.filteredSequenceIndex + 1;
      const sequence = conversationMemory.filteredSequence;
      if (nextIndex < sequence.length) {
        conversationMemory.filteredSequenceIndex = nextIndex;
        const nextJob = sequence[nextIndex];
        conversationMemory.setReferencedJob(nextJob, nextIndex);
        conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
          job: nextJob,
          list: sequence,
          index: nextIndex,
          sequenceType: conversationMemory.sequenceType,
        });
        const reply = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, "advance");
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
    }
  }

  // 1e. FORM_PREV_FIELD Intent ("Previous field", "Previous")
  if (type === INTENTS.FORM_PREV_FIELD) {
    logAction("FORM_PREV_FIELD");
    const allFields = formContext.getRegisteredFields();

    // Filter to ONLY enabled fields that exist in DOM and are not disabled
    const fields = allFields.filter((f) => {
      if (f.disabled) return false;
      const domEl = f.elementId ? document.getElementById(f.elementId) : null;
      if (domEl && domEl.disabled) return false;
      return true;
    });

    if (fields.length > 0) {
      let activeIdx = fields.findIndex((f) => f.id === voiceEditingManager.activeFieldId);
      if (activeIdx === -1 && typeof document !== "undefined" && document.activeElement) {
        const activeEl = document.activeElement;
        activeIdx = fields.findIndex((f) => {
          const el = f.elementId ? document.getElementById(f.elementId) : null;
          return el === activeEl || (el && el.contains(activeEl));
        });
      }

      const prevIdx = activeIdx > 0 ? activeIdx - 1 : fields.length - 1;
      const prevField = fields[prevIdx];

      formContext.clearAllFocusStyles();
      if (typeof document !== "undefined" && document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      if (prevField.elementId) {
        formContext.focusElement(prevField.elementId);
      } else if (prevField.focus) {
        prevField.focus();
      }

      const editRes = voiceEditingManager.startGuidedEdit(prevField.id, null, updateProfileState);
      const reply = editRes?.prompt?.toLowerCase().includes(prevField.label.toLowerCase())
        ? editRes.prompt
        : `Moved back to ${prevField.label}. ${editRes?.prompt || "Please enter the value."}`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }
  }

  // 1f. FORM_REPEAT_FIELD Intent ("Repeat", "What do I need to enter?", "Read my answer")
  if (type === INTENTS.FORM_REPEAT_FIELD) {
    logAction("FORM_REPEAT_FIELD");
    if (voiceEditingManager.targetField) {
      const val = voiceEditingManager.targetField.getValue();
      const reply = `Focused field is ${voiceEditingManager.fieldLabel}. Current value is: ${val || "empty"}.`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }
  }

  // 1g. FORM_CLEAR_FIELD Intent ("Clear this field", "Clear")
  if (type === INTENTS.FORM_CLEAR_FIELD) {
    logAction("FORM_CLEAR_FIELD");
    if (voiceEditingManager.targetField) {
      voiceEditingManager.targetField.setValue("");
      const reply = `Cleared ${voiceEditingManager.fieldLabel}. Please say the new value.`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }
  }

  // 1h. FORM_SUBMIT Intent ("Sign in", "Submit application", "Save changes", "Submit")
  if (type === INTENTS.FORM_SUBMIT) {
    logAction("FORM_SUBMIT");
    if (typeof document !== "undefined") {
      // Try specific known button IDs first so the correct button is always clicked
      const specificBtn =
        document.getElementById("login-submit-btn") ||
        document.getElementById("reg-submit-btn") ||
        document.getElementById("emp-submit-btn") ||
        document.getElementById("prof-save-btn");
      const primarySubmitBtn = specificBtn ||
        document.querySelector("form button[type='submit']") ||
        document.querySelector("button.primary-btn-large") ||
        document.querySelector("button.primary-btn");
      if (primarySubmitBtn) {
        primarySubmitBtn.click();
        const isProfilePage = primarySubmitBtn.id === "prof-save-btn" || !!document.getElementById("prof-save-btn");
        const reply = isProfilePage ? "Saving your profile settings now." : "Submitting form now.";
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
    }
  }

  // 2. READ FORM FIELD INTENT ("What is in the name?", "Read my email", "What is my name?")
  if (type === INTENTS.READ_FIELD) {
    logAction("READ_FIELD");
    let targetField = formContext.findFieldByPhrase(fieldQuery);

    // If query is a pronoun ("that", "it"), check conversation memory
    if (!targetField && (fieldQuery === "that" || fieldQuery === "it" || fieldQuery === "this")) {
      const resolvedRef = conversationMemory.resolveFieldPronoun(userQuery);
      if (resolvedRef) {
        targetField = formContext.findFieldByPhrase(resolvedRef.id);
      }
    }

    if (targetField) {
      const currentVal = targetField.getValue();
      conversationMemory.setReferencedField(targetField, currentVal);
      const reply = `Your ${targetField.label} is currently ${currentVal || "empty"}.`;
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }

    // Check currentUser profile object as fallback
    if (currentUser && fieldQuery) {
      const key = fieldQuery.toLowerCase();
      if (currentUser[key]) {
        const reply = `Your ${key} is currently ${currentUser[key]}.`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
    }

    const fallbackReply = `I couldn't find a form field matching "${fieldQuery}" on this page.`;
    echoTTS.speak(fallbackReply);
    return { reply: fallbackReply };
  }

  // 3. VOICE FIELD EDITING INTENT ("Edit my name", "Change my name to Rithika Senthilkumar", "Change my email")
  if (type === INTENTS.UPDATE_FIELD) {
    logAction("UPDATE_FIELD");
    console.log("Fields found:", formContext.getRegisteredFieldsSummary().map((f) => f.label));

    const editResult = voiceEditingManager.startGuidedEdit(
      fieldQuery || "that",
      newValue,
      updateProfileState
    );

    if (editResult && editResult.prompt) {
      echoTTS.speak(editResult.prompt);
      conversationMemory.addExchange(userQuery, editResult.prompt);
      return { reply: editResult.prompt };
    }
  }

  // 4. Guided application flow processing
  if (guidedAppManager && guidedAppManager.currentStep !== "IDLE") {
    logAction("GUIDED_APPLICATION_STEP");
    const stepResult = guidedAppManager.processStepInput(
      type,
      userQuery,
      currentUser,
      (job, note) => {
        if (onApplySubmit) onApplySubmit(job, note);
      }
    );

    if (stepResult) {
      echoTTS.speak(stepResult.message);
      return { reply: stepResult.message };
    }
  }

  // 5. Audio Control Intents
  if (type === INTENTS.STOP_LISTENING) {
    logAction("STOP_LISTENING");
    const reply = "Voice listening paused. You can click Enable Voice Activation to resume hands-free listening.";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply, stopListening: true };
  }
  if (type === INTENTS.AUDIO_CONTROL_STOP) {
    logAction("AUDIO_STOP");
    echoTTS.stop();
    return { reply: "Audio playback stopped." };
  }
  if (type === INTENTS.AUDIO_CONTROL_REPEAT) {
    logAction("AUDIO_REPEAT");
    echoTTS.repeat();
    return { reply: "Repeating last audio response." };
  }
  if (type === INTENTS.AUDIO_CONTROL_PAUSE) {
    logAction("AUDIO_PAUSE");
    echoTTS.pause();
    return { reply: "Audio paused." };
  }
  if (type === INTENTS.AUDIO_CONTROL_RESUME) {
    logAction("AUDIO_RESUME");
    echoTTS.resume();
    return { reply: "Audio resumed." };
  }
  if (type === INTENTS.AUDIO_CONTROL_FASTER) {
    logAction("AUDIO_FASTER");
    echoTTS.speakFaster();
    return { reply: "Speech rate increased." };
  }
  if (type === INTENTS.AUDIO_CONTROL_SLOWER) {
    logAction("AUDIO_SLOWER");
    echoTTS.speakSlower();
    return { reply: "Speech rate decreased." };
  }

  // 6. GLOBAL VOICE NAVIGATION INTENTS
  if (
    type === INTENTS.NAVIGATE_HOME ||
    type === INTENTS.NAVIGATE_SIGNIN ||
    type === INTENTS.NAVIGATE_REGISTER ||
    type === INTENTS.NAVIGATE_REGISTER_SEEKER ||
    type === INTENTS.NAVIGATE_REGISTER_EMPLOYER ||
    type === INTENTS.NAVIGATE_JOBS ||
    type === INTENTS.NAVIGATE_RECOMMENDATIONS ||
    type === INTENTS.NAVIGATE_PROFILE ||
    type === INTENTS.NAVIGATE_APPLICATIONS ||
    type === INTENTS.NAVIGATE_SAVED_JOBS ||
    type === INTENTS.NAVIGATE_CANDIDATES ||
    type === INTENTS.NAVIGATE_EMPLOYER_DASHBOARD ||
    type === INTENTS.NAVIGATE_ADMIN_DASHBOARD ||
    type === INTENTS.NAVIGATE_BACK ||
    type === INTENTS.NAVIGATION
  ) {
    logAction(`NAVIGATE_${(target || type).toUpperCase()}`);
    let route = "/";
    let speakName = "Home";
    let pageDesc = "You are on the Home page. You can search for jobs, explore recommendations, or manage your account.";

    const navTarget = target || (
      type === INTENTS.NAVIGATE_HOME ? "home" :
      type === INTENTS.NAVIGATE_SIGNIN ? "login" :
      type === INTENTS.NAVIGATE_REGISTER ? "register" :
      type === INTENTS.NAVIGATE_REGISTER_SEEKER ? "registerSeeker" :
      type === INTENTS.NAVIGATE_REGISTER_EMPLOYER ? "registerEmployer" :
      "home"
    );

    switch (navTarget) {
      case "home":
        route = "/";
        speakName = "Home";
        pageDesc = "You are on the Home page. You can search for jobs, explore recommendations, manage your profile, or adjust accessibility settings.";
        break;
      case "login":
        route = "/login";
        speakName = "Sign In";
        pageDesc = "You are now on the Sign In page. This page contains fields for your email and password and a button to sign in.";
        break;
      case "register":
        route = "/register";
        speakName = "Create Account";
        pageDesc = "There are two different account types on EchoHire: 1. Job Seeker account for candidates looking for jobs. 2. Employer account for companies posting jobs and hiring talent. You can say 'Job Seeker' or 'Employer' to choose your account type.";
        break;
      case "registerSeeker":
        route = "/register/job-seeker";
        speakName = "Job Seeker Registration";
        pageDesc = "Please fill in your full name, email, password, and location to create your job seeker account.";
        break;
      case "registerEmployer":
        route = "/register/employer";
        speakName = "Employer Registration";
        pageDesc = "Please fill in your full name, company name, work email, password, and location to create your employer account.";
        break;
      case "jobs":
        route = "/jobs";
        speakName = "Find Jobs";
        if (conversationMemory.isNavigatingSequence) {
          const nextIndex = conversationMemory.filteredSequenceIndex + 1;
          const sequence = conversationMemory.filteredSequence;

          if (nextIndex < sequence.length) {
            conversationMemory.filteredSequenceIndex = nextIndex;
            const nextJob = sequence[nextIndex];
            conversationMemory.setReferencedJob(nextJob, nextIndex);
            conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: nextJob, list: sequence, index: nextIndex });
            conversationMemory.sequenceAlreadySpokenOnNav = true;

            pageDesc = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, true);
          } else {
            conversationMemory.clearFilteredSequence();
            conversationMemory.sequenceAlreadySpokenOnNav = true;
            pageDesc = `Returned to Find Jobs page with your active filters intact. You have reviewed all ${sequence.length} filtered positions. Let me know if you would like to adjust your filters, search for new jobs, or hear any job summary again.`;
          }
        } else {
          pageDesc = "Here you can explore accessible career opportunities. You can search or filter jobs by location, salary, or role.";
        }
        break;
      case "recommendations":
        route = "/recommendations";
        speakName = "AI Recommendations";
        if (conversationMemory.isNavigatingSequence && conversationMemory.sequenceType === "recommendations") {
          const nextIndex = conversationMemory.filteredSequenceIndex + 1;
          const sequence = conversationMemory.filteredSequence;

          if (nextIndex < sequence.length) {
            conversationMemory.filteredSequenceIndex = nextIndex;
            const nextJob = sequence[nextIndex];
            conversationMemory.setReferencedJob(nextJob, nextIndex);
            conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
              job: nextJob,
              list: sequence,
              index: nextIndex,
              sequenceType: "recommendations",
            });
            conversationMemory.sequenceAlreadySpokenOnNav = true;

            pageDesc = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, true, "recommendations");
          } else {
            conversationMemory.clearFilteredSequence();
            conversationMemory.sequenceAlreadySpokenOnNav = true;
            pageDesc = `Returned to AI Recommendations. You have reviewed all ${sequence.length} recommended positions. Let me know if you would like to explore any job again or search for new jobs.`;
          }
        } else {
          pageDesc = "Showing personalized jobs matching your skills and accessibility preferences.";
        }
        break;
      case "savedJobs":
        route = "/saved-jobs";
        speakName = "Saved Jobs";
        const savedList = (context.savedJobs && context.savedJobs.length > 0)
          ? context.savedJobs
          : (context.allJobs || []).filter((j) => isJobSaved(j, context.savedJobIds || []));

        if (savedList.length > 0) {
          conversationMemory.setSavedJobsSequence(savedList, 0);
          const topJob = savedList[0];
          conversationMemory.setReferencedJob(topJob, 0);
          const topJobId = getJobId(topJob);
          const appliedIds = context.appliedJobIds || [];
          const isApplied =
            appliedIds.includes(topJobId) ||
            appliedIds.includes(topJob.id) ||
            appliedIds.includes(topJob._id) ||
            appliedIds.includes(String(topJob.id || "").replace(/^job-/, "")) ||
            appliedIds.includes(`job-${String(topJob.id || "").replace(/^job-/, "")}`);

          if (isApplied) {
            if (savedList.length > 1) {
              conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
                job: topJob,
                list: savedList,
                index: 0,
                sequenceType: "savedJobs",
              });
            } else {
              conversationMemory.clearProposedAction();
            }
          } else {
            conversationMemory.setProposedAction("APPLY_JOB", {
              job: topJob,
              list: savedList,
              index: 0,
              sequenceType: "savedJobs",
            });
          }
          conversationMemory.sequenceAlreadySpokenOnNav = true;
          pageDesc = conversationMemory.formatJobExplanation(
            topJob,
            0,
            savedList.length,
            false,
            "savedJobs",
            isApplied
          );
        } else {
          pageDesc = "You currently have no saved jobs. You can say 'Find jobs' to explore available career opportunities.";
        }
        break;
      case "applications":
        route = "/applications";
        speakName = "My Applications";
        pageDesc = "Showing your submitted job applications.";
        break;
      case "profile":
        route = "/profile";
        speakName = "My Profile";
        pageDesc = "Here you can review and edit your personal details, summary, and skills.";
        break;
      case "candidates":
        if (currentUser && (currentUser.role === "user" || currentUser.role === "seeker")) {
          const denyReply = "The Candidates page is restricted to Recruiter accounts. You are currently signed in as a Job Seeker.";
          echoTTS.speak(denyReply);
          return { reply: denyReply };
        }
        route = "/employer/candidates";
        speakName = "Candidates for My Jobs";
        pageDesc = "This page allows recruiters to review candidates who applied to their posted jobs.";
        break;
      case "employerDashboard":
        if (currentUser && (currentUser.role === "user" || currentUser.role === "seeker")) {
          const denyReply = "The Employer Dashboard is restricted to Recruiter accounts. You are currently signed in as a Job Seeker.";
          echoTTS.speak(denyReply);
          return { reply: denyReply };
        }
        route = "/employer/dashboard";
        speakName = "Employer Dashboard";
        pageDesc = "Manage your posted job listings and review candidate applications.";
        break;
      case "adminDashboard":
        if (currentUser && currentUser.role !== "admin") {
          const denyReply = "The Admin Dashboard requires platform administrator privileges.";
          echoTTS.speak(denyReply);
          return { reply: denyReply };
        }
        route = "/admin/dashboard";
        speakName = "Admin Dashboard";
        pageDesc = "System oversight and user management panel.";
        break;
      case "back":
        window.history.back();
        const backMsg = "Navigating back to previous page.";
        echoTTS.speak(backMsg);
        return { reply: backMsg };
      default:
        route = "/";
    }

    console.log("Executing navigation to:", route);
    if (navigate) navigate(route);
    console.log("New page:", route);

    const navReply = pageDesc.startsWith("Returned") || pageDesc.startsWith("Opening")
      ? pageDesc
      : `Opening the ${speakName} page. ${pageDesc}`;
    echoTTS.speak(navReply);
    conversationMemory.addExchange(userQuery, navReply);
    return { reply: navReply };
  }

  // 7. ACCESSIBLE PAGE EXPLANATION ("What is on this page?", "Explain this page", "Describe this screen")
  if (type === INTENTS.ACCESSIBILITY_PAGE_EXPLAIN) {
    logAction("ACCESSIBILITY_PAGE_EXPLAIN");
    const text = readCurrentPage(context.currentPath, context);
    echoTTS.speak(text);
    conversationMemory.addExchange(userQuery, text);
    return { reply: text };
  }

  // 7b. READ AVAILABLE BUTTONS ("What buttons are available?")
  if (type === INTENTS.READ_BUTTONS) {
    logAction("READ_BUTTONS");
    const text = readAvailableButtons();
    echoTTS.speak(text);
    conversationMemory.addExchange(userQuery, text);
    return { reply: text };
  }

  // 8. List Current Jobs Intent
  if (type === INTENTS.LIST_CURRENT_JOBS) {
    logAction("LIST_CURRENT_JOBS");
    let reply = "";
    const isSavedPage =
      context.pageKey === "savedJobs" ||
      context.currentPath === "/saved-jobs" ||
      context.currentPath === "SavedJobs";
    const isSavedQuery =
      isSavedPage ||
      normalizedText.includes("saved") ||
      (userQuery && userQuery.toLowerCase().includes("saved")) ||
      (userQuery && userQuery.toLowerCase().includes("save job"));

    if (isSavedQuery) {
      const savedList =
        context.savedJobs && context.savedJobs.length > 0
          ? context.savedJobs
          : isSavedPage && visibleJobs.length > 0
          ? visibleJobs
          : (context.allJobs || []).filter((j) => isJobSaved(j, context.savedJobIds || []));

      if (savedList.length === 0) {
        reply = "You currently have no saved jobs. You can say 'Find jobs' to explore and bookmark opportunities.";
      } else {
        if (!isSavedPage && navigate) {
          navigate("/saved-jobs");
        }

        conversationMemory.setSavedJobsSequence(savedList, 0);
        const topJob = savedList[0];
        conversationMemory.setReferencedJob(topJob, 0);

        const appliedIds = context.appliedJobIds || [];
        const topJobId = getJobId(topJob);
        const isApplied =
          appliedIds.includes(topJobId) ||
          appliedIds.includes(topJob.id) ||
          appliedIds.includes(topJob._id) ||
          appliedIds.includes(String(topJob.id || "").replace(/^job-/, "")) ||
          appliedIds.includes(`job-${String(topJob.id || "").replace(/^job-/, "")}`);

        if (isApplied) {
          if (savedList.length > 1) {
            conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
              job: topJob,
              list: savedList,
              index: 0,
              sequenceType: "savedJobs",
            });
          } else {
            conversationMemory.clearProposedAction();
          }
        } else {
          conversationMemory.setProposedAction("APPLY_JOB", {
            job: topJob,
            list: savedList,
            index: 0,
            sequenceType: "savedJobs",
          });
        }

        reply = conversationMemory.formatJobExplanation(
          topJob,
          0,
          savedList.length,
          false,
          "savedJobs",
          isApplied
        );
      }
    } else if (visibleJobs.length === 0) {
      reply = "There are currently no jobs available on this page.";
    } else {
      const jobListFormatted = visibleJobs
        .map((j, i) => `${i + 1}. ${j.title} at ${j.company}.`)
        .join("\n");
      reply = `There ${visibleJobs.length === 1 ? "is currently 1 job" : `are currently ${visibleJobs.length} jobs`} available now. They are:\n${jobListFormatted}\n\nYou can ask me to explain a specific job, open a job, search for another job, or repeat this list.`;
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 9. Count Current Jobs Intent
  if (type === INTENTS.COUNT_CURRENT_JOBS) {
    logAction("COUNT_CURRENT_JOBS");
    let reply = "";
    if (visibleJobs.length === 0) {
      reply = "There are currently no jobs available on this page.";
    } else if (visibleJobs.length === 1) {
      reply = "There is currently 1 job available now.";
    } else {
      reply = `There are currently ${visibleJobs.length} jobs available now.`;
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 10. Open Job Details Intent ("Open the second job", "Open view details of this job", "open details", "view details")
  if (type === INTENTS.JOB_ORDINAL_OPEN) {
    logAction(`JOB_ORDINAL_OPEN_${jobIndex >= 0 ? jobIndex + 1 : "REFERENCED"}`);
    let reply = "";
    let targetJob = null;

    if (jobIndex >= 0 && jobIndex < visibleJobs.length) {
      targetJob = visibleJobs[jobIndex];
    } else {
      targetJob =
        conversationMemory.lastActionProposed?.payload?.job ||
        conversationMemory.getCurrentSequenceJob() ||
        resolvedContext.job ||
        conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
      if (!targetJob && visibleJobs.length > 0) {
        targetJob = visibleJobs[0];
      }
    }

    if (targetJob) {
      conversationMemory.clearProposedAction();
      if (onSelectJob) onSelectJob(targetJob);
      conversationMemory.setReferencedJob(targetJob, jobIndex >= 0 ? jobIndex : (conversationMemory.filteredSequenceIndex || 0));
      reply = `Opening view details for ${targetJob.title} at ${targetJob.company}.`;
    } else if (jobIndex >= 0) {
      reply = `Position number ${jobIndex + 1} is not available. There are currently ${visibleJobs.length} jobs displayed on this page.`;
    } else if (visibleJobs.length > 1) {
      reply = `There are currently ${visibleJobs.length} jobs displayed. Which position would you like to view details for? You can say 'Open the first job' or 'Open job 2'.`;
    } else {
      reply = "There are currently no job listings available to view details for.";
    }

    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 11. Explain Nth Job ("Tell me about the first job", "Explain the third job", "Tell about the job")
  if (type === INTENTS.JOB_ORDINAL_EXPLAIN) {
    logAction(`JOB_ORDINAL_EXPLAIN_INDEX_${jobIndex + 1}`);
    let reply = "";
    let targetJob = null;
    let targetIndex = jobIndex;

    if (jobIndex >= 0 && jobIndex < visibleJobs.length) {
      targetJob = visibleJobs[jobIndex];
    } else if (jobIndex < 0 && visibleJobs.length > 0) {
      targetJob =
        conversationMemory.lastActionProposed?.payload?.job ||
        conversationMemory.getCurrentSequenceJob() ||
        resolvedContext.job ||
        visibleJobs[0];
      targetIndex = conversationMemory.filteredSequenceIndex || 0;
    }

    if (targetJob) {
      const isSavedPage =
        context.pageKey === "savedJobs" ||
        context.currentPath === "/saved-jobs" ||
        context.currentPath === "SavedJobs";

      if (isSavedPage) {
        conversationMemory.setReferencedJob(targetJob, targetIndex);
        const appliedIds = context.appliedJobIds || [];
        const tId = getJobId(targetJob);
        const isApplied =
          appliedIds.includes(tId) ||
          appliedIds.includes(targetJob.id) ||
          appliedIds.includes(targetJob._id) ||
          appliedIds.includes(String(targetJob.id || "").replace(/^job-/, "")) ||
          appliedIds.includes(`job-${String(targetJob.id || "").replace(/^job-/, "")}`);

        if (isApplied) {
          if (visibleJobs.length > 1 && targetIndex < visibleJobs.length - 1) {
            conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
              job: targetJob,
              list: visibleJobs,
              index: targetIndex,
              sequenceType: "savedJobs",
            });
          } else {
            conversationMemory.clearProposedAction();
          }
        } else {
          conversationMemory.setProposedAction("APPLY_JOB", {
            job: targetJob,
            list: visibleJobs,
            index: targetIndex,
            sequenceType: "savedJobs",
          });
        }

        reply = conversationMemory.formatJobExplanation(
          targetJob,
          targetIndex,
          visibleJobs.length,
          false,
          "savedJobs",
          isApplied
        );
      } else {
        conversationMemory.setReferencedJob(targetJob, targetIndex);
        conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: targetJob });
        reply = `Job ${targetIndex + 1} is ${targetJob.title} at ${targetJob.company}. Location: ${targetJob.location}. Work mode: ${targetJob.workMode || "Remote"}. Salary: ${targetJob.salary || "Competitive Salary"}. Required skills: ${(targetJob.skills || []).join(", ") || "General development"}. ${context.getJobMatchExplanation(targetJob)} Would you like me to open the view details for this job?`;
      }
    } else {
      reply = `Position number ${jobIndex + 1} is not available. There are currently ${visibleJobs.length} jobs displayed on this page.`;
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 12. LOCATION Query ("Where is this job?", "Where is the first job located?")
  if (type === INTENTS.JOB_INFO_LOCATION) {
    logAction("JOB_INFO_LOCATION");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const ordinalPrefix = jobIndex >= 0 ? `The job #${jobIndex + 1}, ` : "";
      reply = `${ordinalPrefix}${j.title} position at ${j.company} is ${
        (j.workMode || "").toLowerCase().includes("remote") ? "a remote position " : ""
      }located in ${j.location}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check its location.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 13. SALARY Query ("What is the salary of the first job?", "How much does job two pay?")
  if (type === INTENTS.JOB_INFO_SALARY) {
    logAction("JOB_INFO_SALARY");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const ordinalPrefix = jobIndex >= 0 ? `the job #${jobIndex + 1}, ` : "";
      reply = `The salary for ${ordinalPrefix}${j.title} at ${j.company} is ${j.salary || "competitive compensation"}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check its salary.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 14. COMPANY Query ("Which company posted the first job?", "Who is hiring for job two?")
  if (type === INTENTS.JOB_INFO_COMPANY) {
    logAction("JOB_INFO_COMPANY");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const ordinalPrefix = jobIndex >= 0 ? `Job #${jobIndex + 1}, ` : "";
      reply = `${ordinalPrefix}${j.title}, was posted by ${j.company}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check its company.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 15. TITLE Query ("What is the third job?", "What is job number two?")
  if (type === INTENTS.JOB_INFO_TITLE) {
    logAction("JOB_INFO_TITLE");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      reply = `Job #${jobIndex + 1} is ${j.title} at ${j.company}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 16. REMOTE / WORK MODE Query ("Is the third job remote?", "What is the work mode of job two?")
  if (type === INTENTS.JOB_INFO_REMOTE) {
    logAction("JOB_INFO_REMOTE");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const ordinalPrefix = jobIndex >= 0 ? `The job #${jobIndex + 1}, ` : "";
      reply = `${ordinalPrefix}${j.title} at ${j.company} is a ${j.workMode || "Remote"} position located in ${j.location}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check work mode.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 17. MATCH SCORE Query ("What is the match score of the second job?")
  if (type === INTENTS.JOB_MATCH_EXPLAIN) {
    logAction("JOB_MATCH_EXPLAIN");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const ordinalPrefix = jobIndex >= 0 ? `For job #${jobIndex + 1}, ` : "";
      reply = `${ordinalPrefix}${j.title} at ${j.company}, ${context.getJobMatchExplanation(j)}`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check match score.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 17b. SKILLS Query ("What are the required skills?")
  if (type === INTENTS.JOB_INFO_SKILLS) {
    logAction("JOB_INFO_SKILLS");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const skillsStr = Array.isArray(j.skills) ? j.skills.join(", ") : j.skills || "Python, Machine Learning, SQL";
      reply = `The required skills for ${j.title} at ${j.company} are: ${skillsStr}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check required skills.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 17c. ACCOMMODATIONS Query ("What accessibility accommodations are provided?")
  if (type === INTENTS.JOB_INFO_ACCOMMODATIONS) {
    logAction("JOB_INFO_ACCOMMODATIONS");
    let reply = "";
    if (resolvedContext.job) {
      const j = resolvedContext.job;
      conversationMemory.setReferencedJob(j, jobIndex);
      const accList = Array.isArray(j.accommodations)
        ? j.accommodations.join(", ")
        : Array.isArray(j.accessibilityInformation)
        ? j.accessibilityInformation.join(", ")
        : "Screen Reader Compatible, Flexible Working Hours, Remote Work Options, Assistive Technology Support";
      reply = `The accessibility accommodations provided for ${j.title} at ${j.company} include: ${accList}.`;
    } else if (resolvedContext.isAmbiguous) {
      reply = resolvedContext.ambiguityMessage;
    } else {
      reply = resolvedContext.error || "Please select or mention a specific job listing to check accessibility accommodations.";
    }
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 18. Job Action: Apply for Job
  if (type === INTENTS.JOB_ACTION_APPLY) {
    logAction("JOB_ACTION_APPLY");
    let targetJob = context.activeJob || resolvedContext.job || conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
    if (!targetJob && visibleJobs.length > 0) {
      targetJob = visibleJobs[0];
    }
    if (!targetJob) {
      const msg = resolvedContext.isAmbiguous
        ? resolvedContext.ambiguityMessage
        : "Please select or open a specific job listing before applying.";
      echoTTS.speak(msg);
      conversationMemory.addExchange(userQuery, msg);
      return { reply: msg };
    }

    if (!currentUser) {
      if (navigate) navigate("/login");
      const msg = "Please sign in to your Job Seeker account to submit applications.";
      echoTTS.speak(msg);
      conversationMemory.addExchange(userQuery, msg);
      return { reply: msg };
    }

    const appliedIds = context.appliedJobIds || [];
    const targetJobId = getJobId(targetJob);
    const isAlreadyApplied =
      appliedIds.includes(targetJobId) ||
      appliedIds.includes(targetJob.id) ||
      appliedIds.includes(targetJob._id) ||
      appliedIds.includes(String(targetJob.id || "").replace(/^job-/, "")) ||
      appliedIds.includes(`job-${String(targetJob.id || "").replace(/^job-/, "")}`);

    if (isAlreadyApplied) {
      const replyMsg = `You have already applied for ${targetJob.title} at ${targetJob.company}.`;
      echoTTS.speak(replyMsg);
      conversationMemory.addExchange(userQuery, replyMsg);
      return { reply: replyMsg };
    }

    if (typeof document !== "undefined") {
      const applyBtn = document.querySelector(".primary-btn:not(.applied), .primary-btn-large, button[aria-label*='Apply']");
      if (applyBtn) {
        applyBtn.click();
      }
    }

    if (onApplySubmit) {
      onApplySubmit(targetJob, "");
    }

    if (conversationMemory.isNavigatingSequence && conversationMemory.sequenceType === "savedJobs") {
      const sequence = conversationMemory.filteredSequence;
      const nextIndex = conversationMemory.filteredSequenceIndex + 1;

      if (nextIndex < sequence.length) {
        conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
          job: sequence[nextIndex],
          list: sequence,
          index: nextIndex,
          sequenceType: "savedJobs",
        });
        const replyMsg = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}! Would you like to move to the next saved job?`;
        echoTTS.speak(replyMsg);
        conversationMemory.addExchange(userQuery, replyMsg);
        return { reply: replyMsg };
      } else {
        conversationMemory.clearFilteredSequence();
        const replyMsg = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}! You have reviewed all your saved jobs.`;
        echoTTS.speak(replyMsg);
        conversationMemory.addExchange(userQuery, replyMsg);
        return { reply: replyMsg };
      }
    }

    const replyMsg = `Application submitted successfully for ${targetJob.title} at ${targetJob.company}!`;
    echoTTS.speak(replyMsg);
    conversationMemory.addExchange(userQuery, replyMsg);
    return { reply: replyMsg };
  }

  // 19. Job Action: Save / Bookmark Job or Save Profile
  if (type === INTENTS.JOB_ACTION_SAVE) {
    logAction("JOB_ACTION_SAVE");
    const currentPath = context.currentPath || "/";

    if (currentPath === "/profile" || currentPath === "SeekerProfile") {
      if (typeof document !== "undefined") {
        const saveProfileBtn = document.querySelector("button.primary-btn, button[type='submit']");
        if (saveProfileBtn) {
          saveProfileBtn.click();
          const saveMsg = "Your profile changes have been saved successfully.";
          echoTTS.speak(saveMsg);
          conversationMemory.addExchange(userQuery, saveMsg);
          return { reply: saveMsg };
        }
      }
    }

    let targetJob = context.activeJob || resolvedContext.job || conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
    if (!targetJob && visibleJobs.length > 0) {
      targetJob = visibleJobs[0];
    }

    if (targetJob) {
      const jobId = getJobId(targetJob) || targetJob.id;
      if (onSaveJob) onSaveJob(jobId);

      if (typeof document !== "undefined") {
        const btn = document.querySelector(".btn-save, button[aria-label*='Save']");
        if (btn) btn.click();
      }

      const saveMsg = `Saved ${targetJob.title} at ${targetJob.company} to your saved jobs list.`;
      echoTTS.speak(saveMsg);
      conversationMemory.addExchange(userQuery, saveMsg);
      return { reply: saveMsg };
    }

    const msg = "Please select or open a job listing to save it.";
    echoTTS.speak(msg);
    conversationMemory.addExchange(userQuery, msg);
    return { reply: msg };
  }

  // 20. Job Action: Remove Saved Job
  if (type === INTENTS.JOB_ACTION_UNSAVE) {
    logAction("JOB_ACTION_UNSAVE");
    let targetJob = context.activeJob || resolvedContext.job || conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
    if (!targetJob && visibleJobs.length > 0) {
      targetJob = visibleJobs[0];
    }
    if (!targetJob) {
      const msg = resolvedContext.isAmbiguous
        ? resolvedContext.ambiguityMessage
        : "Please select or open a specific job listing to remove from saved jobs.";
      echoTTS.speak(msg);
      conversationMemory.addExchange(userQuery, msg);
      return { reply: msg };
    }

    const jobId = getJobId(targetJob) || targetJob.id;
    if (onUnsaveJob) onUnsaveJob(jobId);
    if (onSaveJob) onSaveJob(jobId);

    if (typeof document !== "undefined") {
      const btn = document.querySelector(".btn-save.saved, button[aria-label*='Remove']");
      if (btn) btn.click();
    }

    const unsaveMsg = `${targetJob.title} at ${targetJob.company} has been removed from your saved jobs.`;
    echoTTS.speak(unsaveMsg);
    conversationMemory.addExchange(userQuery, unsaveMsg);
    return { reply: unsaveMsg };
  }

  // 21. Job Explanations & Summaries
  if (type === INTENTS.JOB_EXPLAIN_SIMPLE) {
    logAction("JOB_EXPLAIN_SIMPLE");
    const targetJob = resolvedContext.job || conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
    if (!targetJob) {
      const msg = resolvedContext.isAmbiguous
        ? resolvedContext.ambiguityMessage
        : "Please select or mention a specific job listing to hear its explanation.";
      echoTTS.speak(msg);
      conversationMemory.addExchange(userQuery, msg);
      return { reply: msg };
    }

    conversationMemory.setReferencedJob(targetJob);
    conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: targetJob });
    const expText = `${context.getJobExplanation(targetJob)} Would you like me to open the view details for this job?`;
    echoTTS.speak(expText);
    conversationMemory.addExchange(userQuery, expText);
    return { reply: expText };
  }

  if (type === INTENTS.JOB_SUMMARY) {
    logAction("JOB_SUMMARY");
    const targetJob = resolvedContext.job || conversationMemory.resolveJobPronoun(userQuery)?.jobObj;
    if (!targetJob) {
      const msg = resolvedContext.isAmbiguous
        ? resolvedContext.ambiguityMessage
        : "Please select or mention a specific job listing to hear its summary.";
      echoTTS.speak(msg);
      conversationMemory.addExchange(userQuery, msg);
      return { reply: msg };
    }

    conversationMemory.setReferencedJob(targetJob);
    conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: targetJob });
    const summaryText = `${context.getJobSummary(targetJob)} Would you like me to open the view details for this job?`;
    echoTTS.speak(summaryText);
    conversationMemory.addExchange(userQuery, summaryText);
    return { reply: summaryText };
  }

  // 22. Voice Job Filtering Intents (Location, Salary, Role, Reset)
  // 22. Voice Job Filtering Intents (Location, Salary, Role, Reset, Next)
  if (type === INTENTS.NEXT_FILTERED_JOB) {
    logAction("NEXT_FILTERED_JOB");
    if (conversationMemory.isNavigatingSequence) {
      const nextIndex = conversationMemory.filteredSequenceIndex + 1;
      const sequence = conversationMemory.filteredSequence;

      if (nextIndex < sequence.length) {
        conversationMemory.filteredSequenceIndex = nextIndex;
        const nextJob = sequence[nextIndex];
        conversationMemory.setReferencedJob(nextJob, nextIndex);
        conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
          job: nextJob,
          list: sequence,
          index: nextIndex,
          sequenceType: conversationMemory.sequenceType,
        });

        const reply = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, "advance");
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      } else {
        const isRec = conversationMemory.sequenceType === "recommendations";
        conversationMemory.clearFilteredSequence();
        const reply = isRec
          ? `You have reached the end of the recommendations. Let me know if you would like to explore any job again or search for new jobs.`
          : `You have reached the end of all ${sequence.length} filtered positions. Let me know if you would like to adjust your filters or search again.`;
        echoTTS.speak(reply);
        conversationMemory.addExchange(userQuery, reply);
        return { reply };
      }
    } else {
      const reply = "No active job review sequence is currently in progress. You can explore jobs or recommendations first.";
      echoTTS.speak(reply);
      conversationMemory.addExchange(userQuery, reply);
      return { reply };
    }
  }

  if (type === INTENTS.FILTER_JOBS_LOCATION) {
    const targetLoc = intent.location || "Remote";
    logAction(`FILTER_JOBS_LOCATION_${targetLoc}`);
    if (navigate && context.currentPath !== "/jobs") navigate("/jobs");

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("echohire_filter_location", targetLoc);
    }
    const matchedSelect = updateDomSelect("#loc-filter", targetLoc);
    if (!matchedSelect) {
      updateDomInput(".search-input", targetLoc);
    } else {
      updateDomInput(".search-input", "");
    }

    const allJobsList = (context.allJobs && context.allJobs.length > 0) ? context.allJobs : (context.visibleJobs || []);
    const matchedJobs = allJobsList.filter((j) =>
      j.location && j.location.toLowerCase().includes(targetLoc.toLowerCase())
    );

    const count = matchedJobs.length;
    let reply = "";
    if (count > 0) {
      const topJob = matchedJobs[0];
      conversationMemory.justFilteredByVoice = true;
      conversationMemory.setFilteredSequence(matchedJobs, 0);
      conversationMemory.setReferencedJob(topJob, 0);
      conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: topJob, list: matchedJobs, index: 0 });

      reply = conversationMemory.formatJobExplanation(topJob, 0, count, false);
    } else {
      conversationMemory.clearFilteredSequence();
      reply = `No job listings currently found for location ${targetLoc}. Showing all available jobs.`;
      updateDomInput(".search-input", "");
      updateDomSelect("#loc-filter", "all");
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("echohire_filter_location", "all");
      }
    }

    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  if (type === INTENTS.FILTER_JOBS_SALARY) {
    const minSalary = intent.minSalary || 600000;
    const lpaVal = minSalary >= 100000 ? Math.round(minSalary / 100000) : minSalary;
    logAction(`FILTER_JOBS_SALARY_${lpaVal}_LPA`);
    if (navigate && context.currentPath !== "/jobs") navigate("/jobs");

    let salOption = "all";
    if (lpaVal >= 12) salOption = "12";
    else if (lpaVal >= 10) salOption = "10";
    else if (lpaVal >= 8) salOption = "8";
    else if (lpaVal >= 6) salOption = "6";

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("echohire_filter_salary", salOption);
    }
    updateDomSelect("#sal-filter", salOption);
    updateDomInput(".search-input", "");

    const allJobsList = (context.allJobs && context.allJobs.length > 0) ? context.allJobs : (context.visibleJobs || []);
    const matchedJobs = allJobsList.filter((j) => {
      const nums = (j.salary || "").match(/\d+/g);
      const minSal = nums && nums.length > 0 ? parseFloat(nums[0]) : 0;
      return minSal >= lpaVal;
    });

    const count = matchedJobs.length;
    let reply = "";
    if (count > 0) {
      const topJob = matchedJobs[0];
      conversationMemory.justFilteredByVoice = true;
      conversationMemory.setFilteredSequence(matchedJobs, 0);
      conversationMemory.setReferencedJob(topJob, 0);
      conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: topJob, list: matchedJobs, index: 0 });

      reply = conversationMemory.formatJobExplanation(topJob, 0, count, false);
    } else {
      conversationMemory.clearFilteredSequence();
      reply = `No job listings currently found with salary above ${lpaVal} Lakhs. Showing all available jobs.`;
      updateDomSelect("#sal-filter", "all");
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("echohire_filter_salary", "all");
      }
    }

    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  if (type === INTENTS.FILTER_JOBS_ROLE) {
    const roleTerm = intent.roleTerm || "Developer";
    logAction(`FILTER_JOBS_ROLE_${roleTerm}`);
    if (navigate && context.currentPath !== "/jobs") navigate("/jobs");

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("echohire_filter_searchTerm", roleTerm);
    }
    updateDomInput(".search-input", roleTerm);

    const allJobsList = (context.allJobs && context.allJobs.length > 0) ? context.allJobs : (context.visibleJobs || []);
    const matchedJobs = allJobsList.filter((j) => {
      const t = (roleTerm || "").toLowerCase();
      return (
        (j.title && j.title.toLowerCase().includes(t)) ||
        (j.skills && Array.isArray(j.skills) && j.skills.some((s) => String(s).toLowerCase().includes(t)))
      );
    });

    const count = matchedJobs.length;
    let reply = "";
    if (count > 0) {
      const topJob = matchedJobs[0];
      conversationMemory.justFilteredByVoice = true;
      conversationMemory.setFilteredSequence(matchedJobs, 0);
      conversationMemory.setReferencedJob(topJob, 0);
      conversationMemory.setProposedAction("OPEN_JOB_DETAILS", { job: topJob, list: matchedJobs, index: 0 });

      reply = conversationMemory.formatJobExplanation(topJob, 0, count, false);
    } else {
      conversationMemory.clearFilteredSequence();
      reply = `No job listings currently found matching role ${roleTerm}.`;
    }

    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  if (type === INTENTS.FILTER_JOBS_RESET) {
    logAction("FILTER_JOBS_RESET");
    if (navigate && context.currentPath !== "/jobs") navigate("/jobs");

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("echohire_filter_searchTerm");
      sessionStorage.removeItem("echohire_filter_category");
      sessionStorage.removeItem("echohire_filter_type");
      sessionStorage.removeItem("echohire_filter_location");
      sessionStorage.removeItem("echohire_filter_salary");
      sessionStorage.removeItem("echohire_filter_accommodation");
    }

    updateDomInput(".search-input", "");
    updateDomSelect("#cat-filter", "all");
    updateDomSelect("#loc-filter", "all");
    updateDomSelect("#sal-filter", "all");
    updateDomSelect("#type-filter", "all");
    updateDomSelect("#acc-filter", "all");

    conversationMemory.clearFilteredSequence();

    const reply = "Cleared all job filters. Displaying all available job listings.";
    echoTTS.speak(reply);
    conversationMemory.addExchange(userQuery, reply);
    return { reply };
  }

  // 22b. Search Jobs Intents
  if (type === INTENTS.SEARCH_JOBS) {
    logAction(`SEARCH_JOBS_${searchTerm}`);
    if (navigate && context.currentPath !== "/jobs") navigate("/jobs");

    if (searchTerm) {
      updateDomInput(".search-input", searchTerm);
    }

    const searchReply = searchTerm
      ? `Searching available jobs matching "${searchTerm}".`
      : "Opening Find Jobs search portal.";
    echoTTS.speak(searchReply);
    conversationMemory.addExchange(userQuery, searchReply);
    return { reply: searchReply };
  }

  // 23. Conversational Fallback Engine
  logAction("CONVERSATIONAL_FALLBACK");
  const qLower = (userQuery || "").toLowerCase();

  // If query asks about pages or available sections
  if (qLower.includes("page") || qLower.includes("section") || qLower.includes("where can i go") || qLower.includes("options")) {
    const isRecruiter = currentUser?.role === "employer" || currentUser?.role === "recruiter";
    const pagesList = isRecruiter
      ? "Home, Employer Dashboard, Candidates, Find Jobs, and Profile"
      : "Home, Find Jobs, Recommendations, Saved Jobs, Applications, and Profile";
    const pageReply = `EchoHire provides several pages including ${pagesList}. You can ask me to open any of these pages for you.`;
    echoTTS.speak(pageReply);
    conversationMemory.addExchange(userQuery, pageReply);
    return { reply: pageReply };
  }

  // If query asks about platform or capabilities
  if (qLower.includes("echohire") || qLower.includes("website") || qLower.includes("site") || qLower.includes("platform") || qLower.includes("do")) {
    const aboutReply = "EchoHire is an accessible employment platform with AI job matching, screen reader accessibility, and hands-free voice assistance. You can search jobs, save listings, submit applications, manage your profile, or navigate anywhere using voice or text commands.";
    echoTTS.speak(aboutReply);
    conversationMemory.addExchange(userQuery, aboutReply);
    return { reply: aboutReply };
  }

  // Friendly conversational fallback (Requirement 22)
  const friendlyFallback = "I'm not sure what you mean. You can ask me about this page, your jobs, applications, profile, or navigation.";
  echoTTS.speak(friendlyFallback);
  conversationMemory.addExchange(userQuery, friendlyFallback);
  return { reply: friendlyFallback };
}
