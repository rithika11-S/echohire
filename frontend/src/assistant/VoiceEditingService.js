/**
 * Guided Voice Editing Service & State Machine for Echo Assistant.
 * Controls safe, multi-step voice editing for critical fields (Name, Email).
 * Implements letter-by-letter spelling, spoken symbol normalization, confirmation steps, and validation.
 */

import { parseSpokenEmail, validateEmail, formatEmailForSpeech } from "./EmailParser.js";
import { formContext } from "./FormContextService.js";
import { conversationMemory } from "./ConversationContext.js";

export const EDIT_STATES = {
  IDLE: "IDLE",
  EDITING_FIELD: "EDITING_FIELD",
  CAPTURING_VALUE: "CAPTURING_VALUE",
  NORMALIZING_VALUE: "NORMALIZING_VALUE",
  CONFIRMING_VALUE: "CONFIRMING_VALUE",
  SPELLING_VALUE: "SPELLING_VALUE",
  WAITING_FOR_CORRECTION: "WAITING_FOR_CORRECTION",
  FINAL_CONFIRMATION: "FINAL_CONFIRMATION",
  SAVED: "SAVED",
};

export function isAffirmativeResponse(text) {
  if (!text) return false;
  const norm = text.toLowerCase().trim();

  const exacts = [
    "yes", "yeah", "yeah ok", "yeah okay", "yea", "yep", "yup", "ok", "okay",
    "sure", "fine", "right", "correct", "looks good", "sounds good", "save",
    "save it", "save profile", "confirm", "next", "done", "all good", "that's correct", "is correct",
    "check", "agree", "i agree", "create", "create account", "submit", "register"
  ];
  if (exacts.includes(norm)) return true;

  return (
    /\b(yes|yeah|yep|yup|yea|ok|okay|sure|fine|correct|confirm|save|next|done|check|agree|create|submit)\b/i.test(norm) ||
    norm.includes("is correct") ||
    norm.includes("looks good") ||
    norm.includes("sounds good") ||
    norm.includes("save profile") ||
    norm.includes("i agree") ||
    norm.includes("create account")
  );
}

export function isNegativeResponse(text) {
  if (!text) return false;
  const norm = text.toLowerCase().trim();
  return (
    /\b(no|nope|nah|incorrect|wrong|change)\b/i.test(norm)
  );
}

class VoiceEditingManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = EDIT_STATES.IDLE;
    this.activeFieldId = null;
    this.fieldLabel = "";
    this.previousValue = "";
    this.temporaryValue = "";
    this.awaitingConfirmation = false;
    this.spellingMode = false;
    this.targetField = null;
    formContext.clearAllFocusStyles();
  }

  /**
   * Normalizes spoken names:
   * Handles letter-by-letter input ("R I T H I K A space S E N T H I L K U M A R"),
   * removes improper spaces, applies proper title casing ("Rithika Senthilkumar").
   */
  normalizeName(rawInput) {
    if (!rawInput) return "";

    let text = rawInput.trim();

    // Strip common conversational carrier phrases
    text = text.replace(/^(my name is|set my name to|change my name to|update my name to|enter my name|my name|name is|it is|this is)\s+/gi, "");

    // Replace spoken control words
    text = text.replace(/\bspace\b/gi, " ");
    text = text.replace(/\bdash\b/gi, "-");
    text = text.replace(/\bhyphen\b/gi, "-");
    text = text.replace(/\bapostrophe\b/gi, "'");

    // Check if input is letter-by-letter (e.g. "R I T H I K A")
    const words = text.split(/\s+/);
    const isSpelledLetters = words.every((w) => w.length === 1 || w === "-" || w === "'");

    let combined = "";
    if (isSpelledLetters) {
      combined = words.join("");
    } else {
      // Process individual tokens
      combined = words
        .map((w) => {
          if (w.length === 1) return w;
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(" ");
    }

    // Capitalize words properly
    return combined
      .split(" ")
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Formats a name value letter-by-letter for spelling confirmation.
   * Example: "Rithika Senthilkumar" -> "R-I-T-H-I-K-A. S-E-N-T-H-I-L-K-U-M-A-R."
   */
  spellOutValue(val) {
    if (!val) return "";
    const parts = val.split(" ");
    return parts
      .map((part) =>
        part
          .toUpperCase()
          .split("")
          .join("-")
      )
      .join(". ");
  }

  /**
   * Initiates guided editing for a specific field.
   */
  startGuidedEdit(fieldQuery, initialNewValue = null, updateProfileCallback = null) {
    console.log("[VoiceEditing] Starting guided edit for fieldQuery:", fieldQuery, "initialNewValue:", initialNewValue);
    this.updateProfileCallback = updateProfileCallback;

    let target = formContext.findFieldByPhrase(fieldQuery);
    if (!target && (fieldQuery === "that" || fieldQuery === "it" || fieldQuery === "this" || !fieldQuery)) {
      const resolved = conversationMemory.resolveFieldPronoun(fieldQuery);
      if (resolved) {
        target = formContext.findFieldByPhrase(resolved.id);
      }
    }

    if (!target) {
      if (fieldQuery.toLowerCase().includes("name")) {
        target = formContext.findFieldByPhrase("name");
      } else if (fieldQuery.toLowerCase().includes("email")) {
        target = formContext.findFieldByPhrase("email");
      } else if (fieldQuery.toLowerCase().includes("password")) {
        target = formContext.findFieldByPhrase("password");
      }
    }

    if (!target) {
      return {
        success: false,
        prompt: `I couldn't find a form field matching "${fieldQuery}" on this page.`,
      };
    }

    this.targetField = target;
    this.activeFieldId = target.id;
    this.fieldLabel = target.label;
    this.previousValue = target.getValue() || "";
    this.state = EDIT_STATES.EDITING_FIELD;
    conversationMemory.setReferencedField(target, this.previousValue);

    // Automatically focus the input field in the DOM and clear other fields
    formContext.clearAllFocusStyles();
    if (target.focus) {
      target.focus();
    } else {
      formContext.focusElement(target.elementId || target.id);
    }

    // If new value provided directly ("Change my name to Rithika Senthilkumar")
    if (initialNewValue && initialNewValue.trim()) {
      return this.processCapturedValue(initialNewValue);
    }

    // Guided step 1: State active field label, existing value, and ask user for value
    this.state = EDIT_STATES.CAPTURING_VALUE;
    const existingVal = this.previousValue && this.previousValue.trim()
      ? `Current value is "${this.previousValue}".`
      : "It is currently empty.";

    let prompt = "";
    if (target.id === "name") {
      prompt = `Full Name field focused. ${existingVal} Please enter your full name.`;
    } else if (target.id === "email") {
      prompt = `Email Address field focused. ${existingVal} Please provide your email address.`;
    } else if (target.id === "phone") {
      prompt = `Phone Number field focused. ${existingVal} Please say your phone number.`;
    } else if (target.id === "location") {
      prompt = `Location field focused. ${existingVal} Please say your city or location.`;
    } else if (target.id === "summary") {
      prompt = `Professional Summary field focused. ${existingVal} Please dictate your summary.`;
    } else if (target.id === "skill") {
      prompt = `Skills & Expertise field focused. ${existingVal} Please say a skill to add to your profile or say next to continue.`;
    } else if (target.id === "resume") {
      prompt = `Resume Upload field focused. ${existingVal} Please say your resume file name or say next to keep your current resume.`;
    } else if (target.id === "accommodation") {
      prompt = `Accommodation Preferences field focused. ${existingVal} Please say your workplace accommodation preferences.`;
    } else if (target.id === "password" || target.isSecret) {
      prompt = `Password field focused. Please enter your password securely.`;
    } else if (target.id === "terms") {
      prompt = `Terms and Privacy Policy checkbox focused. Say yes or check to agree to the terms.`;
    } else if (target.id === "submit") {
      // Context-aware: Sign In page vs Create Account page vs Profile page
      if (target.elementId === "login-submit-btn") {
        prompt = `Sign In button focused. Say yes or sign in to log into your account now.`;
      } else if (target.elementId === "prof-save-btn" || target.label?.toLowerCase().includes("save")) {
        prompt = `Save Profile button focused. Say yes or save to update and save your profile settings now.`;
      } else {
        prompt = `Create Account button focused. Say yes or submit to create your account now.`;
      }
    } else {
      prompt = `${target.label} field focused. ${existingVal} Please say the value for ${target.label}.`;
    }

    return {
      success: true,
      prompt,
      state: this.state,
    };
  }

  /**
   * Processes value captured from user voice input.
   */
  processCapturedValue(rawInput) {
    console.log("[VoiceEditing] Processing captured value:", rawInput, "Field:", this.activeFieldId);

    // 0. Check if user input is actually a confirmation response (e.g. "yeah ok", "yes", "correct", "looks good", "next")
    if (isAffirmativeResponse(rawInput) && (this.temporaryValue || (this.targetField && this.targetField.getValue()))) {
      console.log("[VoiceEditing] Intercepted confirmation phrase during capture step. Committing update.");
      return this.commitUpdate();
    }

    // Automatically focus target element
    if (this.targetField) {
      if (this.targetField.focus) this.targetField.focus();
      else formContext.focusElement(this.targetField.elementId || this.targetField.id);
    }

    if (this.activeFieldId === "name") {
      const normalized = this.normalizeName(rawInput);

      // If after normalization it became empty or matched confirmation, commit current value
      if (!normalized || isAffirmativeResponse(normalized)) {
        return this.commitUpdate();
      }

      this.temporaryValue = normalized;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      // Update input field visually
      if (this.targetField) this.targetField.setValue(normalized);

      const prompt = `Name set to ${normalized}. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: normalized };
    }

    if (this.activeFieldId === "email") {
      const parsedEmail = parseSpokenEmail(rawInput);
      console.log("[VoiceEditing] Parsed spoken email:", parsedEmail);

      if (!validateEmail(parsedEmail)) {
        this.state = EDIT_STATES.CAPTURING_VALUE;
        const prompt = "That does not appear to be a valid email address. Please try again.";
        return { success: false, prompt, state: this.state };
      }

      this.temporaryValue = parsedEmail;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      // Update input field visually
      if (this.targetField) this.targetField.setValue(parsedEmail);

      const speechFormatted = formatEmailForSpeech(parsedEmail);
      const prompt = `I heard ${speechFormatted}. Is this email address correct?`;
      return { success: true, prompt, state: this.state, temporaryValue: parsedEmail };
    }

    if (this.activeFieldId === "phone") {
      let norm = rawInput.trim();
      norm = norm.replace(/^(my phone number is|my phone is|phone number is|phone is|it is|this is)\s+/gi, "");

      // Check if input starts with a question word or contains no digits
      const isQuestion = /^(what|how|where|can|explain|tell|show|read)\b/i.test(norm);
      const digitsMatch = norm.match(/\+?\d[\d\s\-]{4,14}\d/);

      if (isQuestion || !digitsMatch) {
        console.log("[VoiceEditing] Non-phone or question query received for phone field:", rawInput);
        const prompt = `Please say your numeric phone number for ${this.fieldLabel}.`;
        return { success: false, prompt, state: this.state };
      }

      const extractedPhone = digitsMatch[0].replace(/\s+/g, "");
      this.temporaryValue = extractedPhone;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      if (this.targetField) this.targetField.setValue(extractedPhone);

      const prompt = `Phone number set to ${extractedPhone}. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: extractedPhone };
    }

    if (this.activeFieldId === "skill") {
      let norm = rawInput.trim();
      norm = norm.replace(/^(add skill|skill is|my skill is|add)\s+/gi, "");

      if (!norm || isAffirmativeResponse(norm)) {
        return this.commitUpdate();
      }

      this.temporaryValue = norm;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      if (this.targetField) this.targetField.setValue(norm);

      const prompt = `Skill ${norm} added. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: norm };
    }

    if (this.activeFieldId === "resume") {
      let norm = rawInput.trim();
      norm = norm.replace(/^(my resume is|resume is|upload resume|resume file is)\s+/gi, "");

      if (!norm || isAffirmativeResponse(norm)) {
        return this.commitUpdate();
      }

      const formattedName = norm.includes(".") ? norm : `${norm}.pdf`;
      this.temporaryValue = formattedName;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      if (this.targetField) this.targetField.setValue(formattedName);

      const prompt = `Resume set to ${formattedName}. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: formattedName };
    }

    if (this.activeFieldId === "summary") {
      let norm = rawInput.trim();
      norm = norm.replace(/^(my summary is|my bio is|career summary is|bio is|it is|this is)\s+/gi, "");

      if (!norm || isAffirmativeResponse(norm)) {
        return this.commitUpdate();
      }

      this.temporaryValue = norm;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      if (this.targetField) this.targetField.setValue(norm);

      const prompt = `Professional summary updated. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: norm };
    }

    if (this.activeFieldId === "accommodation") {
      let norm = rawInput.trim();
      norm = norm.replace(/^(my accommodation is|my accessibility need is|accommodations are|needs are|it is|this is)\s+/gi, "");

      if (!norm || isAffirmativeResponse(norm)) {
        return this.commitUpdate();
      }

      this.temporaryValue = norm;
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      if (this.targetField) this.targetField.setValue(norm);

      const prompt = `Workplace accommodation preferences set to "${norm}". Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: norm };
    }

    if (this.activeFieldId === "password" || this.activeFieldId === "confirmPassword" || (this.targetField && this.targetField.isSecret)) {
      this.temporaryValue = rawInput.trim();
      if (this.targetField) this.targetField.setValue(this.temporaryValue);
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      this.awaitingConfirmation = true;

      const prompt = `${this.fieldLabel} received. Is this correct? Say yes or next to continue.`;
      return { success: true, prompt, state: this.state, temporaryValue: "••••••••" };
    }

    if (this.activeFieldId === "terms") {
      const norm = rawInput.toLowerCase().trim();
      const isCheck = isAffirmativeResponse(rawInput) || norm.includes("check") || norm.includes("agree") || norm.includes("yes") || norm.includes("yeah");
      if (isCheck) {
        this.temporaryValue = true;
        if (this.targetField) this.targetField.setValue(true);
        return this.commitUpdate();
      } else {
        const prompt = "Please say yes or check to agree to the Terms and Privacy Policy.";
        return { success: false, prompt, state: this.state };
      }
    }

    if (this.activeFieldId === "submit") {
      const normLower = rawInput.toLowerCase().trim();
      const isSubmit = isAffirmativeResponse(rawInput) ||
        normLower.includes("create") ||
        normLower.includes("submit") ||
        normLower.includes("register") ||
        normLower.includes("save") ||
        normLower.includes("update") ||
        normLower.includes("account") ||
        normLower.includes("sign in") ||
        normLower.includes("log in") ||
        normLower.includes("login") ||
        normLower.includes("signin");
      if (isSubmit) {
        this.temporaryValue = "Submit";
        const elementId = this.targetField ? this.targetField.elementId : "reg-submit-btn";
        const submitBtn = (elementId && document.getElementById(elementId)) || document.querySelector("form button[type='submit']");
        const isLoginPage = elementId === "login-submit-btn";
        const isProfilePage = elementId === "prof-save-btn" || (this.targetField && this.targetField.label?.toLowerCase().includes("save"));
        this.reset();
        if (submitBtn) {
          submitBtn.click();
          const prompt = isLoginPage
            ? "Signing you in now."
            : isProfilePage
            ? "Saving your profile settings now."
            : "Submitting form to create your account now.";
          return { success: true, prompt, state: EDIT_STATES.SAVED };
        } else {
          const prompt = "Could not find submission button on page.";
          return { success: false, prompt, state: EDIT_STATES.IDLE };
        }
      } else {
        const isLoginPage = this.targetField && this.targetField.elementId === "login-submit-btn";
        const isProfilePage = this.targetField && (this.targetField.elementId === "prof-save-btn" || this.targetField.label?.toLowerCase().includes("save"));
        const prompt = isLoginPage
          ? "Please say yes or sign in to log into your account."
          : isProfilePage
          ? "Please say yes or save to save your profile settings."
          : "Please say yes or create account to submit the form.";
        return { success: false, prompt, state: this.state };
      }
    }

    // Default field fallback - strip conversational carrier phrases for location/summary/etc.
    let norm = rawInput.trim();
    norm = norm.replace(/^(my location is|location is|my summary is|summary is|it is|this is)\s+/gi, "");

    this.temporaryValue = norm;
    if (this.targetField) this.targetField.setValue(norm);
    this.state = EDIT_STATES.CONFIRMING_VALUE;
    this.awaitingConfirmation = true;

    const prompt = `${this.fieldLabel} set to ${norm}. Is this correct?`;
    return { success: true, prompt, state: this.state, temporaryValue: norm };
  }

  /**
   * Handles user response during confirmation / spelling steps.
   */
  handleConfirmationResponse(userText) {
    const norm = userText.toLowerCase().trim();
    console.log("[VoiceEditing] Handling confirmation response:", userText, "Current state:", this.state);

    if (this.state === EDIT_STATES.SPELLING_VALUE) {
      if (isAffirmativeResponse(userText)) {
        return this.commitUpdate();
      }
      const spelledNormalized = this.normalizeName(userText);
      if (spelledNormalized.length > 0) {
        this.temporaryValue = spelledNormalized;
        if (this.targetField) this.targetField.setValue(spelledNormalized);
      }
      this.state = EDIT_STATES.CONFIRMING_VALUE;
      const prompt = `Your name is ${this.temporaryValue}. Is that correct?`;
      return { success: true, prompt, state: this.state };
    }

    // Check for "spell it", "spell that"
    if (norm.includes("spell") || norm.includes("letter by letter")) {
      this.state = EDIT_STATES.SPELLING_VALUE;
      const spelled = this.spellOutValue(this.temporaryValue);
      const prompt = `${spelled}. Is this spelling correct?`;
      return { success: true, prompt, state: this.state };
    }

    // Check positive affirmation ("yes", "yeah", "yeah ok", "correct", "ok", "next", "confirm")
    if (isAffirmativeResponse(userText)) {
      return this.commitUpdate();
    }

    // Check negative rejection ("no", "incorrect", "change it", "wrong")
    if (isNegativeResponse(userText)) {
      this.state = EDIT_STATES.CAPTURING_VALUE;
      const prompt = `Please say your ${this.fieldLabel} again.`;
      return { success: true, prompt, state: this.state };
    }

    // User provided a correction string
    if (norm.length > 1) {
      return this.processCapturedValue(userText);
    }

    const fallbackPrompt = `Is ${this.fieldLabel} correct? Please answer yes or no.`;
    return { success: true, prompt: fallbackPrompt, state: this.state };
  }

  /**
   * Commits the verified temporary value to actual application React state.
   */
  commitUpdate() {
    if (!this.targetField || !this.temporaryValue) {
      this.reset();
      return { success: false, prompt: "Editing cancelled. Missing valid field data." };
    }

    console.log("[VoiceEditing] Committing update for", this.activeFieldId, "New Value:", this.temporaryValue);

    // 1. Update React Form State via registered getter/setter
    this.targetField.setValue(this.temporaryValue);

    // 2. Update Auth Context profile if callback provided
    if (this.updateProfileCallback) {
      this.updateProfileCallback({ [this.activeFieldId]: this.temporaryValue });
    }

    // 3. Update conversation memory reference
    conversationMemory.setReferencedField(this.targetField, this.temporaryValue);

    const savedVal = this.temporaryValue;
    const label = this.fieldLabel;
    const currentId = this.activeFieldId;

    // 4. Find next registered field to automatically advance to next input
    const fields = formContext.getRegisteredFields();
    const currentIdx = fields.findIndex((f) => f.id === currentId);

    let nextField = null;
    if (currentIdx >= 0) {
      for (let i = currentIdx + 1; i < fields.length; i++) {
        const candidate = fields[i];
        if (candidate.disabled) continue;
        const domEl = candidate.elementId ? document.getElementById(candidate.elementId) : null;
        if (domEl && domEl.disabled) continue;
        nextField = candidate;
        break;
      }
    }

    if (nextField) {
      console.log("[VoiceEditing] Automatically advancing to next field:", nextField.id);
      const nextRes = this.startGuidedEdit(nextField.id, null, this.updateProfileCallback);
      const labelSpoken = label.replace(/\s*(checkbox|button)\s*/gi, "").trim();
      const valSpoken = typeof savedVal === "boolean" ? (savedVal ? "agreed" : "not agreed") : `saved as "${savedVal}"`;
      const prompt = `Your ${labelSpoken} has been ${valSpoken}. Moving to next field: ${nextRes.prompt}`;
      return {
        success: true,
        prompt,
        state: this.state,
        finalValue: savedVal,
        nextField: nextField.id,
      };
    }

    this.reset();
    const prompt = `Your ${label} has been confirmed as "${savedVal}". All profile settings completed and saved successfully.`;
    return { success: true, prompt, state: EDIT_STATES.SAVED, finalValue: savedVal };
  }
}

export const voiceEditingManager = new VoiceEditingManager();
