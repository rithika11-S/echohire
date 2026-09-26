/**
 * Guided Application Voice Flow State Machine for Echo Assistant.
 * Guides visually impaired job seekers step-by-step through application review and submission.
 */

export const APPLICATION_STEPS = {
  IDLE: "IDLE",
  CONFIRM_INTENT: "CONFIRM_INTENT",
  STEP_1_PROFILE: "STEP_1_PROFILE",
  STEP_2_RESUME: "STEP_2_RESUME",
  STEP_3_NOTE: "STEP_3_NOTE",
  STEP_4_SUBMIT: "STEP_4_SUBMIT",
};

export class GuidedApplicationManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentStep = APPLICATION_STEPS.IDLE;
    this.jobToApply = null;
    this.coverNote = "";
  }

  startApplication(job) {
    if (!job) return { error: "No active job selected to apply." };

    this.jobToApply = job;
    this.currentStep = APPLICATION_STEPS.CONFIRM_INTENT;
    this.coverNote = "";

    return {
      step: this.currentStep,
      message: `You are about to apply for the ${job.title} position at ${job.company}. Would you like to continue?`,
    };
  }

  processStepInput(intentType, textInput, currentUser, onFinalSubmit) {
    if (this.currentStep === APPLICATION_STEPS.IDLE) {
      return null;
    }

    const q = (textInput || "").toLowerCase().trim();

    // Step 0: Initial Intent Confirmation
    if (this.currentStep === APPLICATION_STEPS.CONFIRM_INTENT) {
      if (q.includes("yes") || q.includes("continue") || q.includes("confirm") || q.includes("next") || intentType === "GUIDED_STEP_CONFIRM") {
        this.currentStep = APPLICATION_STEPS.STEP_1_PROFILE;
        const name = currentUser?.name || "Job Seeker";
        const email = currentUser?.email || "seeker@echohire.com";
        const skills = (currentUser?.skills || ["React", "JavaScript"]).join(", ");
        return {
          step: this.currentStep,
          message: `Step 1 of 4. Review your profile information: Name: ${name}. Email: ${email}. Skills: ${skills}. Say 'Next' to proceed.`,
        };
      } else {
        this.reset();
        return {
          step: APPLICATION_STEPS.IDLE,
          message: "Application cancelled. You can ask me to explain this job or save it for later.",
        };
      }
    }

    // Step 1: Review Profile
    if (this.currentStep === APPLICATION_STEPS.STEP_1_PROFILE) {
      if (q.includes("next") || q.includes("continue") || intentType === "GUIDED_STEP_CONFIRM") {
        this.currentStep = APPLICATION_STEPS.STEP_2_RESUME;
        const resumeName = currentUser?.resumeName || "Standard_Accessible_Resume.pdf";
        return {
          step: this.currentStep,
          message: `Step 2 of 4. Selected resume document: ${resumeName}. Say 'Next' to proceed to cover note.`,
        };
      } else if (q.includes("previous") || q.includes("back")) {
        this.currentStep = APPLICATION_STEPS.CONFIRM_INTENT;
        return {
          step: this.currentStep,
          message: `Back to confirmation. Apply for ${this.jobToApply.title} at ${this.jobToApply.company}? Say 'Yes' to continue.`,
        };
      }
    }

    // Step 2: Resume
    if (this.currentStep === APPLICATION_STEPS.STEP_2_RESUME) {
      if (q.includes("next") || q.includes("continue") || intentType === "GUIDED_STEP_CONFIRM") {
        this.currentStep = APPLICATION_STEPS.STEP_3_NOTE;
        return {
          step: this.currentStep,
          message: "Step 3 of 4. Optional cover note or workplace accommodation request. Dictate your note or say 'Next' to skip.",
        };
      } else if (q.includes("previous") || q.includes("back")) {
        this.currentStep = APPLICATION_STEPS.STEP_1_PROFILE;
        return {
          step: this.currentStep,
          message: "Back to Step 1. Profile information review.",
        };
      }
    }

    // Step 3: Cover Note / Accommodations
    if (this.currentStep === APPLICATION_STEPS.STEP_3_NOTE) {
      if (q.includes("next") || q.includes("skip") || intentType === "GUIDED_STEP_CONFIRM") {
        this.currentStep = APPLICATION_STEPS.STEP_4_SUBMIT;
        return {
          step: this.currentStep,
          message: `Step 4 of 4. You are ready to submit your application for ${this.jobToApply.title} at ${this.jobToApply.company}. Would you like to submit?`,
        };
      } else {
        // Record dictated note
        this.coverNote = textInput;
        this.currentStep = APPLICATION_STEPS.STEP_4_SUBMIT;
        return {
          step: this.currentStep,
          message: `Cover note recorded: "${textInput}". Step 4 of 4: Ready to submit application. Say 'Submit' or 'Yes' to confirm.`,
        };
      }
    }

    // Step 4: Final Submission Confirmation
    if (this.currentStep === APPLICATION_STEPS.STEP_4_SUBMIT) {
      if (q.includes("yes") || q.includes("submit") || q.includes("confirm") || intentType === "GUIDED_STEP_CONFIRM") {
        const job = this.jobToApply;
        const note = this.coverNote;
        this.reset();
        if (onFinalSubmit) onFinalSubmit(job, note);

        return {
          step: APPLICATION_STEPS.IDLE,
          message: `Application submitted successfully for ${job.title} at ${job.company}! Your application status is now trackable under My Applications.`,
          isSubmitted: true,
        };
      } else {
        this.reset();
        return {
          step: APPLICATION_STEPS.IDLE,
          message: "Application cancelled. Your draft was not submitted.",
        };
      }
    }

    return null;
  }
}
