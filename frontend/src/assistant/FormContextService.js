/**
 * Form Context Service for Echo Assistant.
 * Allows any React form component to register active input fields with getter & setter callbacks.
 * Enables dynamic reading and voice-based modification of real form values and React states.
 */

class FormContextRegistry {
  constructor() {
    this.fieldsMap = new Map();
    this.currentFocusedElement = null;
    this.focusTimeoutId = null;

    if (typeof window !== "undefined") {
      window.addEventListener("focusin", (e) => {
        if (this.currentFocusedElement && e.target !== this.currentFocusedElement) {
          this.clearAllFocusStyles();
        }
      });
    }
  }

  /**
   * Clears voice highlight and focus styling from all form elements immediately.
   */
  clearAllFocusStyles() {
    if (typeof document === "undefined") return;

    if (this.focusTimeoutId) {
      clearTimeout(this.focusTimeoutId);
      this.focusTimeoutId = null;
    }

    if (this.currentFocusedElement) {
      try {
        this.currentFocusedElement.classList.remove("voice-field-focused");
        this.currentFocusedElement.style.outline = "";
        this.currentFocusedElement.style.borderColor = "";
        this.currentFocusedElement.style.boxShadow = "";
      } catch (e) {}
      this.currentFocusedElement = null;
    }

    document.querySelectorAll(".voice-field-focused").forEach((el) => {
      el.classList.remove("voice-field-focused");
      el.style.outline = "";
      el.style.borderColor = "";
      el.style.boxShadow = "";
    });

    document.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.style.boxShadow && el.style.boxShadow.includes("rgba(37, 99, 235")) {
        el.style.outline = "";
        el.style.borderColor = "";
        el.style.boxShadow = "";
      }
    });
  }

  /**
   * Registers a form field with getter/setter callbacks and aliases.
   * @param {Object} config
   * @param {string} config.id - Field unique identifier (e.g. "name", "email")
   * @param {string} config.label - Human-readable label (e.g. "Name", "Email Address")
   * @param {string} [config.elementId] - DOM element ID for focus management
   * @param {Function} config.getValue - Function returning the current field value
   * @param {Function} config.setValue - Function updating the field value in React state
   * @param {Array<string>} [config.aliases] - Additional search aliases for voice matching
   * @param {boolean} [config.isSecret] - Whether field contains sensitive data (e.g. password)
   */
  registerField(config) {
    if (!config || !config.id) return;
    const fieldId = config.id.toLowerCase();
    this.fieldsMap.set(fieldId, {
      id: config.id,
      label: config.label || config.id,
      elementId: config.elementId || config.id,
      getValue: config.getValue || (() => ""),
      setValue: config.setValue || (() => {}),
      focus: config.focus || (() => this.focusElement(config.elementId || config.id)),
      aliases: (config.aliases || []).map((a) => a.toLowerCase()),
      isSecret: Boolean(config.isSecret),
    });
    console.log(`[FormContextService] Registered field: "${config.label || config.id}" (id: ${config.id})`);
  }

  /**
   * Automatically focuses a DOM element by ID, name, or attribute, applying smooth scroll & visual highlight ONLY to that current field.
   */
  focusElement(elementId) {
    if (typeof window === "undefined" || !elementId) return false;

    // Immediately clear highlight from any previous field so only the current field is focused
    this.clearAllFocusStyles();

    let el = document.getElementById(elementId);
    if (!el) el = document.querySelector(`[name="${elementId}"]`);
    if (!el) el = document.querySelector(`[id*="${elementId}"]`);
    if (!el) el = document.querySelector(`[aria-label*="${elementId}" i]`);
    if (!el && (elementId.includes("email") || elementId.includes("name") || elementId.includes("password"))) {
      if (elementId.includes("email")) el = document.querySelector("input[type='email']:not([disabled]), input[name*='email']:not([disabled])");
      else if (elementId.includes("password")) el = document.querySelector("input[type='password']:not([disabled]), input[name*='password']:not([disabled])");
      else if (elementId.includes("name")) el = document.querySelector("input[name*='name']:not([disabled]), input[id*='name']:not([disabled])");
    }

    // Never highlight disabled elements (like static email)
    if (!el || el.disabled) return false;

    try {
      if (document.activeElement && document.activeElement !== el && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      el.focus();
      if (el.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      el.classList.add("voice-field-focused");
      this.currentFocusedElement = el;

      // Remove highlight immediately when focus leaves this element
      const onBlur = () => {
        el.classList.remove("voice-field-focused");
        el.style.outline = "";
        el.style.borderColor = "";
        el.style.boxShadow = "";
        if (this.currentFocusedElement === el) {
          this.currentFocusedElement = null;
        }
        el.removeEventListener("blur", onBlur);
      };
      el.addEventListener("blur", onBlur, { once: true });

      return true;
    } catch (err) {
      console.warn("[FormContextService] Could not focus element:", elementId, err);
    }
    return false;
  }

  /**
   * Focuses a field by ID or phrase.
   */
  focusField(phrase) {
    const field = this.findFieldByPhrase(phrase);
    if (field) {
      if (field.focus) field.focus();
      else this.focusElement(field.elementId || field.id);
      return field;
    }
    return null;
  }

  /**
   * Gets ordered array of currently registered form fields.
   */
  getRegisteredFields() {
    return Array.from(this.fieldsMap.values());
  }

  /**
   * Unregisters a form field when a component unmounts.
   * @param {string} fieldId
   */
  unregisterField(fieldId) {
    if (!fieldId) return;
    this.fieldsMap.delete(fieldId.toLowerCase());
    console.log(`[FormContextService] Unregistered field: id=${fieldId}`);
  }

  /**
   * Clears all registered fields (e.g. on page navigation).
   */
  clearAll() {
    this.fieldsMap.clear();
  }

  /**
   * Finds a registered field matching the given phrase.
   * @param {string} phrase - Normalized user phrase (e.g. "name", "my email", "phone number")
   * @returns {Object|null}
   */
  findFieldByPhrase(phrase) {
    if (!phrase) return null;
    const clean = phrase.toLowerCase().trim();

    // 1. Direct ID match
    if (this.fieldsMap.has(clean)) {
      return this.fieldsMap.get(clean);
    }

    // 2. Search by label or aliases
    for (const [id, config] of this.fieldsMap.entries()) {
      const labelLower = config.label.toLowerCase();
      if (clean === labelLower || clean.includes(labelLower) || labelLower.includes(clean)) {
        return config;
      }
      for (const alias of config.aliases) {
        if (clean === alias || clean.includes(alias) || alias.includes(clean)) {
          return config;
        }
      }
    }

    // 3. Fallback partial word match (e.g. "name", "email", "phone", "location", "summary")
    const commonKeys = ["name", "email", "phone", "location", "summary", "password", "experience", "education", "skill", "company"];
    for (const key of commonKeys) {
      if (clean.includes(key) && this.fieldsMap.has(key)) {
        return this.fieldsMap.get(key);
      }
    }

    return null;
  }

  /**
   * Gets a summary of currently registered form fields and their values.
   * Useful for dynamic Page Explanation.
   */
  getRegisteredFieldsSummary() {
    const list = [];
    for (const [id, config] of this.fieldsMap.entries()) {
      const val = config.getValue();
      list.push({
        id: config.id,
        label: config.label,
        value: val,
      });
    }
    return list;
  }
}

export const formContext = new FormContextRegistry();
