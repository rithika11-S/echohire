/**
 * Natural Language Intent Classifier for Echo Assistant.
 * Includes text normalization, conversational filler removal, ordinal index parsing,
 * field reading/editing detection, activation triggers, and page-aware intents.
 */

import { normalizeVoiceCommand } from "./normalizeVoiceCommand.js";

export const INTENTS = {
  ACTIVATE_ASSISTANT: "ACTIVATE_ASSISTANT",
  GREETING: "GREETING",
  THANK_YOU: "THANK_YOU",
  GENERAL_SITE_PAGES: "GENERAL_SITE_PAGES",
  GENERAL_SITE_ABOUT: "GENERAL_SITE_ABOUT",
  ROLE_FEATURES_QUERY: "ROLE_FEATURES_QUERY",
  HOW_TO_QUERY: "HOW_TO_QUERY",
  RECOMMENDATIONS_QUERY: "RECOMMENDATIONS_QUERY",
  AFFIRMATIVE_CONFIRM: "AFFIRMATIVE_CONFIRM",
  NEGATIVE_CANCEL: "NEGATIVE_CANCEL",
  READ_FIELD: "READ_FIELD",
  UPDATE_FIELD: "UPDATE_FIELD",
  NAVIGATE_HOME: "NAVIGATE_HOME",
  NAVIGATE_SIGNIN: "NAVIGATE_SIGNIN",
  NAVIGATE_REGISTER: "NAVIGATE_REGISTER",
  NAVIGATE_REGISTER_SEEKER: "NAVIGATE_REGISTER_SEEKER",
  NAVIGATE_REGISTER_EMPLOYER: "NAVIGATE_REGISTER_EMPLOYER",
  NAVIGATE_JOBS: "NAVIGATE_JOBS",
  NAVIGATE_RECOMMENDATIONS: "NAVIGATE_RECOMMENDATIONS",
  NAVIGATE_PROFILE: "NAVIGATE_PROFILE",
  NAVIGATE_APPLICATIONS: "NAVIGATE_APPLICATIONS",
  NAVIGATE_SAVED_JOBS: "NAVIGATE_SAVED_JOBS",
  NAVIGATE_CANDIDATES: "NAVIGATE_CANDIDATES",
  NAVIGATE_EMPLOYER_DASHBOARD: "NAVIGATE_EMPLOYER_DASHBOARD",
  NAVIGATE_ADMIN_DASHBOARD: "NAVIGATE_ADMIN_DASHBOARD",
  NAVIGATE_BACK: "NAVIGATE_BACK",
  LIST_CURRENT_JOBS: "LIST_CURRENT_JOBS",
  COUNT_CURRENT_JOBS: "COUNT_CURRENT_JOBS",
  JOB_ORDINAL_OPEN: "JOB_ORDINAL_OPEN",
  JOB_ORDINAL_EXPLAIN: "JOB_ORDINAL_EXPLAIN",
  NAVIGATION: "NAVIGATION",
  SEARCH_JOBS: "SEARCH_JOBS",
  JOB_EXPLAIN_SIMPLE: "JOB_EXPLAIN_SIMPLE",
  JOB_SUMMARY: "JOB_SUMMARY",
  JOB_MATCH_EXPLAIN: "JOB_MATCH_EXPLAIN",
  JOB_INFO_LOCATION: "JOB_INFO_LOCATION",
  JOB_INFO_SALARY: "JOB_INFO_SALARY",
  JOB_INFO_SKILLS: "JOB_INFO_SKILLS",
  JOB_INFO_COMPANY: "JOB_INFO_COMPANY",
  JOB_INFO_TITLE: "JOB_INFO_TITLE",
  JOB_INFO_REMOTE: "JOB_INFO_REMOTE",
  JOB_INFO_EXP: "JOB_INFO_EXP",
  JOB_INFO_RESPONSES: "JOB_INFO_RESPONSES",
  JOB_INFO_REQS: "JOB_INFO_REQS",
  JOB_INFO_ACCOMMODATIONS: "JOB_INFO_ACCOMMODATIONS",
  JOB_ACTION_APPLY: "JOB_ACTION_APPLY",
  JOB_ACTION_SAVE: "JOB_ACTION_SAVE",
  JOB_ACTION_UNSAVE: "JOB_ACTION_UNSAVE",
  ACCESSIBILITY_PAGE_EXPLAIN: "ACCESSIBILITY_PAGE_EXPLAIN",
  READ_BUTTONS: "READ_BUTTONS",
  STOP_LISTENING: "STOP_LISTENING",
  AUDIO_CONTROL_STOP: "AUDIO_CONTROL_STOP",
  AUDIO_CONTROL_REPEAT: "AUDIO_CONTROL_REPEAT",
  AUDIO_CONTROL_PAUSE: "AUDIO_CONTROL_PAUSE",
  AUDIO_CONTROL_RESUME: "AUDIO_CONTROL_RESUME",
  AUDIO_CONTROL_FASTER: "AUDIO_CONTROL_FASTER",
  AUDIO_CONTROL_SLOWER: "AUDIO_CONTROL_SLOWER",
  GUIDED_STEP_NEXT: "GUIDED_STEP_NEXT",
  GUIDED_STEP_PREV: "GUIDED_STEP_PREV",
  GUIDED_STEP_CONFIRM: "GUIDED_STEP_CONFIRM",
  FORM_START_GUIDED: "FORM_START_GUIDED",
  FORM_NEXT_FIELD: "FORM_NEXT_FIELD",
  FORM_PREV_FIELD: "FORM_PREV_FIELD",
  FORM_SKIP_FIELD: "FORM_SKIP_FIELD",
  FORM_REPEAT_FIELD: "FORM_REPEAT_FIELD",
  FORM_CLEAR_FIELD: "FORM_CLEAR_FIELD",
  FORM_SUBMIT: "FORM_SUBMIT",
  FORM_CANCEL: "FORM_CANCEL",
  PROFILE_EDIT_NAME: "PROFILE_EDIT_NAME",
  FILTER_JOBS_LOCATION: "FILTER_JOBS_LOCATION",
  FILTER_JOBS_SALARY: "FILTER_JOBS_SALARY",
  FILTER_JOBS_ROLE: "FILTER_JOBS_ROLE",
  FILTER_JOBS_MODE: "FILTER_JOBS_MODE",
  FILTER_JOBS_RESET: "FILTER_JOBS_RESET",
  NEXT_FILTERED_JOB: "NEXT_FILTERED_JOB",
  UNKNOWN: "UNKNOWN",
};

/**
 * Normalizes user text by removing punctuation and conversational filler phrases.
 */
export function normalizeText(text) {
  if (!text) return "";

  let norm = text.toLowerCase();

  // Normalize specific concatenated tokens and common variations
  norm = norm
    .replace(/\bfindjobs\b/g, "find jobs")
    .replace(/\bfindjob\b/g, "find job")
    .replace(/\brecommandations\b/g, "recommendations")
    .replace(/\brecommandation\b/g, "recommendation");

  // Remove punctuation
  norm = norm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"‘“’”]/g, " ");

  // Remove conversational filler phrases
  const fillerPhrases = [
    "i want to go to",
    "i want to go",
    "i want to know",
    "i would like to know",
    "i'd like to know",
    "take me to the",
    "take me to",
    "take me",
    "navigate to the",
    "navigate to",
    "navigate",
    "go to the",
    "go to",
    "go",
    "open the",
    "open",
    "tell me about",
    "tell me where",
    "tell me what",
    "tell me",
    "can you tell me",
    "could you tell me",
    "can you please",
    "could you please",
    "would you please",
    "can you",
    "could you",
    "would you",
    "please",
    "ok",
    "okay",
    "hey",
    "hello",
    "hi",
    "let me know",
  ];

  for (const phrase of fillerPhrases) {
    const reg = new RegExp(`\\b${phrase}\\b`, "gi");
    norm = norm.replace(reg, " ");
  }

  // Collapse extra spaces
  return norm.replace(/\s+/g, " ").trim();
}

/**
 * Helper to parse ordinal index from text (0-indexed).
 */
export function parseOrdinalIndex(text) {
  const ordinals = [
    { words: ["first", "1st", "number 1", "number one", "job 1", "job one", "position 1"], index: 0 },
    { words: ["second", "2nd", "number 2", "number two", "job 2", "job two", "position 2"], index: 1 },
    { words: ["third", "3rd", "number 3", "number three", "job 3", "job three", "position 3"], index: 2 },
    { words: ["fourth", "4th", "number 4", "number four", "job 4", "job four", "position 4"], index: 3 },
    { words: ["fifth", "5th", "number 5", "number five", "job 5", "job five", "position 5"], index: 4 },
    { words: ["sixth", "6th", "number 6", "number six", "job 6", "job six", "position 6"], index: 5 },
    { words: ["seventh", "7th", "number 7", "number seven", "job 7", "job seven", "position 7"], index: 6 },
    { words: ["eighth", "8th", "number 8", "number eight", "job 8", "job eight", "position 8"], index: 7 },
    { words: ["ninth", "9th", "number 9", "number nine", "job 9", "job nine", "position 9"], index: 8 },
    { words: ["tenth", "10th", "number 10", "number ten", "job 10", "job ten", "position 10"], index: 9 },
  ];

  for (const item of ordinals) {
    for (const w of item.words) {
      if (text.includes(w)) {
        return item.index;
      }
    }
  }

  return -1;
}

/**
 * Helper to parse field update commands ("change my name to Rithika").
 */
function parseFieldUpdate(normText, rawText) {
  const updateVerbs = ["change", "set", "update", "modify", "put", "write", "edit"];

  for (const verb of updateVerbs) {
    const reg = new RegExp(`\\b${verb}\\b`, "i");
    if (reg.test(rawText)) {
      const dividerRegex = /\b(to|as|with)\b/i;
      const match = rawText.match(dividerRegex);
      if (match) {
        const dividerPos = rawText.search(dividerRegex);
        const leftPart = rawText.substring(0, dividerPos).trim();
        const newValue = rawText.substring(dividerPos + match[0].length).trim();

        let fieldQuery = leftPart
          .replace(new RegExp(`^.*?\\b(${verb}s?)\\b`, "i"), "")
          .replace(/\b(my|the|field|value|info|details|input)\b/gi, "")
          .trim();

        if (!fieldQuery || fieldQuery === "that" || fieldQuery === "it" || fieldQuery === "this") {
          fieldQuery = "that";
        }

        return { fieldQuery, newValue };
      }
    }
  }

  // Handle guided update requests without explicit "to" value ("edit my name", "change my email")
  const guidedVerbs = ["edit", "change", "update", "modify"];
  for (const verb of guidedVerbs) {
    if (new RegExp(`\\b${verb}\\b`, "i").test(rawText)) {
      const lower = rawText.toLowerCase();
      if (lower.includes("name")) {
        return { fieldQuery: "name", newValue: null };
      }
      if (lower.includes("email")) {
        return { fieldQuery: "email", newValue: null };
      }
      if (lower.includes("phone")) {
        return { fieldQuery: "phone", newValue: null };
      }
      if (lower.includes("summary") || lower.includes("bio")) {
        return { fieldQuery: "summary", newValue: null };
      }
      if (lower.includes("accommodation")) {
        return { fieldQuery: "accommodation", newValue: null };
      }
    }
  }

  return null;
}

/**
 * Helper to parse field read commands ("what is in the name?", "read my email").
 */
function parseFieldRead(normText, rawText) {
  const lower = rawText.toLowerCase();

  if (
    lower.includes("what is in") ||
    lower.includes("what's in") ||
    lower.includes("what is my") ||
    lower.includes("what's my") ||
    lower.includes("read my") ||
    lower.includes("read field") ||
    lower.includes("what is written")
  ) {
    let fieldQuery = lower
      .replace("what is in the", "")
      .replace("what is in", "")
      .replace("what's in the", "")
      .replace("what's in", "")
      .replace("what is my", "")
      .replace("what's my", "")
      .replace("read my", "")
      .replace("read field", "")
      .replace("what is written in the", "")
      .replace("what is written in", "")
      .replace("field", "")
      .trim();

    return { fieldQuery };
  }
  return null;
}

export function detectIntent(rawText) {
  if (!rawText) return { type: INTENTS.UNKNOWN, normalizedText: "" };

  const rawLower = rawText.toLowerCase().trim();
  const norm = normalizeText(rawText);
  const ordinalIndex = parseOrdinalIndex(norm);

  const commandNorm = normalizeVoiceCommand(rawText);
  const actionWords = ["open", "start", "activate"];
  const assistantKeywords = ["assistant", "echo"];

  const hasAction = actionWords.some((w) => commandNorm.includes(w));
  const hasKeyword = assistantKeywords.some((w) => commandNorm.includes(w));
  const isActivationMatch = (hasAction && hasKeyword) || commandNorm.includes("hey echo");

  // 1. VOICE ASSISTANT ACTIVATION INTENT
  if (isActivationMatch) {
    return { type: INTENTS.ACTIVATE_ASSISTANT, normalizedText: norm };
  }

  // Social Chitchat & Greetings
  if (
    rawLower === "hi" ||
    rawLower === "hello" ||
    rawLower === "hey" ||
    rawLower.includes("how are you") ||
    rawLower.includes("good morning") ||
    rawLower.includes("good afternoon") ||
    rawLower.includes("good evening")
  ) {
    return { type: INTENTS.GREETING, normalizedText: norm };
  }
  if (
    rawLower.includes("thank you") ||
    rawLower.includes("thanks") ||
    rawLower.includes("appreciate it") ||
    rawLower.includes("great job")
  ) {
    return { type: INTENTS.THANK_YOU, normalizedText: norm };
  }

  // 1b. AFFIRMATIVE & NEGATIVE CONFIRMATIONS
  if (
    rawLower === "yes" ||
    rawLower === "sure" ||
    rawLower === "yeah" ||
    rawLower === "yep" ||
    rawLower === "ok" ||
    rawLower === "okay" ||
    rawLower.startsWith("yes ") ||
    rawLower.startsWith("yeah ") ||
    rawLower.startsWith("sure ") ||
    rawLower.startsWith("yep ") ||
    rawLower.includes("open it") ||
    rawLower.includes("open details") ||
    rawLower.includes("open view") ||
    rawLower.includes("yes open") ||
    rawLower.includes("sure open") ||
    rawLower.includes("apply now") ||
    rawLower.includes("do it") ||
    rawLower.includes("proceed") ||
    rawLower.includes("yes apply") ||
    rawLower.includes("yes please") ||
    rawLower.includes("please apply")
  ) {
    return { type: INTENTS.AFFIRMATIVE_CONFIRM, normalizedText: norm };
  }
  if (
    rawLower === "no" ||
    rawLower === "nope" ||
    rawLower === "dont" ||
    rawLower === "don't" ||
    rawLower === "stop" ||
    rawLower === "nevermind" ||
    rawLower === "cancel" ||
    rawLower === "next" ||
    rawLower === "next job" ||
    rawLower.startsWith("no ") ||
    rawLower.includes("move to next") ||
    rawLower.includes("next job") ||
    rawLower.includes("go to next") ||
    rawLower.includes("skip this job") ||
    rawLower.includes("skip job") ||
    rawLower.includes("skip it") ||
    rawLower.includes("no move to next")
  ) {
    return { type: INTENTS.NEGATIVE_CANCEL, normalizedText: norm };
  }

  // 1b2. THIS-PAGE EXPLANATION INTENT ("Tell me about this page", "Explain this page", "What is on this page")
  if (
    rawLower.includes("this page") ||
    rawLower.includes("this screen") ||
    rawLower.includes("current page") ||
    rawLower.includes("this section") ||
    rawLower.includes("explain this page") ||
    rawLower.includes("tell me about this page") ||
    rawLower.includes("about this page") ||
    rawLower.includes("describe this page") ||
    rawLower.includes("what is on this page") ||
    rawLower.includes("what is this page") ||
    rawLower.includes("what can i do here") ||
    rawLower.includes("read this page") ||
    rawLower.includes("read page") ||
    rawLower.includes("describe screen")
  ) {
    return { type: INTENTS.ACCESSIBILITY_PAGE_EXPLAIN, normalizedText: norm };
  }

  // 1c. GENERAL SITE PAGES QUERY ("What are all the other pages provided in this website?", "What pages are there in this website?", "pages in website")
  const isPagePhrase =
    rawLower.includes("page") ||
    rawLower.includes("pages") ||
    rawLower.includes("section") ||
    rawLower.includes("sections");

  const hasPageQueryWord =
    rawLower.includes("what") ||
    rawLower.includes("which") ||
    rawLower.includes("list") ||
    rawLower.includes("show") ||
    rawLower.includes("all") ||
    rawLower.includes("other") ||
    rawLower.includes("provided") ||
    rawLower.includes("available") ||
    rawLower.includes("exist") ||
    rawLower.includes("website") ||
    rawLower.includes("site") ||
    rawLower.includes("have") ||
    rawLower.includes("visit") ||
    rawLower.includes("there") ||
    rawLower.includes("options") ||
    rawLower.includes("menu") ||
    norm === "pages";

  if (isPagePhrase && hasPageQueryWord) {
    return { type: INTENTS.GENERAL_SITE_PAGES, normalizedText: norm };
  }

  // 1d. GENERAL SITE ABOUT QUERY ("What is EchoHire?", "Tell me about EchoHire", "How does this website work?")
  const isAboutPhrase =
    rawLower.includes("echohire") ||
    rawLower.includes("website") ||
    rawLower.includes("platform") ||
    rawLower.includes("site");

  const hasAboutQueryWord =
    rawLower.includes("what is") ||
    rawLower.includes("about") ||
    rawLower.includes("how does") ||
    rawLower.includes("tell me") ||
    rawLower.includes("explain") ||
    rawLower.includes("work") ||
    rawLower.includes("do");

  if (isAboutPhrase && hasAboutQueryWord) {
    return { type: INTENTS.GENERAL_SITE_ABOUT, normalizedText: norm };
  }

  // 1e. ROLE FEATURES QUERY ("What can a job seeker do?", "What can a recruiter do?", "What can I do?")
  if (
    rawLower.includes("job seeker do") ||
    rawLower.includes("recruiter do") ||
    rawLower.includes("what can a job seeker") ||
    rawLower.includes("what can a recruiter") ||
    rawLower.includes("what can i do here") ||
    rawLower.includes("what can i do on this website") ||
    rawLower.includes("what are my options")
  ) {
    return { type: INTENTS.ROLE_FEATURES_QUERY, normalizedText: norm };
  }

  // 1f. HOW TO QUERIES
  if (rawLower.includes("how do i apply") || rawLower.includes("how to apply")) {
    return { type: INTENTS.HOW_TO_QUERY, topic: "apply", normalizedText: norm };
  }
  if (rawLower.includes("how do i save") || rawLower.includes("how to save")) {
    return { type: INTENTS.HOW_TO_QUERY, topic: "save", normalizedText: norm };
  }
  if (rawLower.includes("how do i update my profile") || rawLower.includes("how to edit profile")) {
    return { type: INTENTS.HOW_TO_QUERY, topic: "profile", normalizedText: norm };
  }
  if (rawLower.includes("how do i create a job") || rawLower.includes("how to post a job") || rawLower.includes("how to create recruiter job")) {
    return { type: INTENTS.HOW_TO_QUERY, topic: "postJob", normalizedText: norm };
  }

  // 1g. RECOMMENDATIONS QUERY
  if (rawLower.includes("recommended for me") || rawLower.includes("recommendations for me") || rawLower.includes("which page shows jobs recommended")) {
    return { type: INTENTS.RECOMMENDATIONS_QUERY, normalizedText: norm };
  }

  // Audio Control Intents
  if (
    rawLower.includes("stop listening") ||
    rawLower.includes("pause listening") ||
    rawLower.includes("turn off voice") ||
    rawLower.includes("disable voice")
  ) {
    return { type: INTENTS.STOP_LISTENING, normalizedText: norm };
  }
  if (rawLower.includes("repeat that") || rawLower.includes("say that again") || norm === "repeat") {
    return { type: INTENTS.AUDIO_CONTROL_REPEAT, normalizedText: norm };
  }
  if (rawLower.includes("stop speaking") || rawLower.includes("stop reading") || norm === "stop") {
    return { type: INTENTS.AUDIO_CONTROL_STOP, normalizedText: norm };
  }
  if (rawLower === "pause" || norm === "pause") {
    return { type: INTENTS.AUDIO_CONTROL_PAUSE, normalizedText: norm };
  }
  if (rawLower === "resume" || norm === "resume") {
    return { type: INTENTS.AUDIO_CONTROL_RESUME, normalizedText: norm };
  }
  if (rawLower.includes("speak faster") || rawLower.includes("talk faster")) {
    return { type: INTENTS.AUDIO_CONTROL_FASTER, normalizedText: norm };
  }
  if (rawLower.includes("speak slower") || rawLower.includes("talk slower")) {
    return { type: INTENTS.AUDIO_CONTROL_SLOWER, normalizedText: norm };
  }

  // 2. VOICE FIELD UPDATE INTENT ("Change my name to Rithika", "Change that to Rithika Senthilkumar")
  const updateParsed = parseFieldUpdate(norm, rawText);
  if (updateParsed) {
    return {
      type: INTENTS.UPDATE_FIELD,
      fieldQuery: updateParsed.fieldQuery,
      newValue: updateParsed.newValue,
      normalizedText: norm,
    };
  }

  // 3. VOICE FIELD READ INTENT ("What is in the name?", "Read my email")
  const readParsed = parseFieldRead(norm, rawText);
  if (readParsed) {
    return {
      type: INTENTS.READ_FIELD,
      fieldQuery: readParsed.fieldQuery,
      normalizedText: norm,
    };
  }

  const hasNavPrefix =
    rawLower.includes("go to") ||
    rawLower.includes("navigate") ||
    rawLower.includes("open") ||
    rawLower.includes("take me") ||
    rawLower.includes("show me");

  // Only fire NAVIGATE_SIGNIN on explicit navigation phrases — NOT bare "sign in", "login" (form submit keywords)
  if (
    hasNavPrefix &&
    (rawLower.includes("sign in") || rawLower.includes("login") || rawLower.includes("signin") || rawLower.includes("log in"))
  ) {
    return { type: INTENTS.NAVIGATE_SIGNIN, target: "login", normalizedText: norm };
  }
  // Only fire NAVIGATE_REGISTER on explicit navigation phrases — NOT bare "sign up", "register", "create account" (those are form submit keywords)
  // First check for specific sub-type registrations (Job Seeker vs Employer)
  if (
    rawLower.includes("job seeker") ||
    rawLower.includes("seeker account") ||
    rawLower.includes("register as job seeker") ||
    rawLower.includes("register as seeker") ||
    rawLower.includes("create job seeker") ||
    rawLower.includes("job seeker registration") ||
    rawLower.includes("sign up as job seeker") ||
    rawLower.includes("sign up as seeker") ||
    rawLower.includes("go to job seeker") ||
    rawLower.includes("navigate to job seeker") ||
    rawLower.includes("open job seeker") ||
    rawLower.includes("for job seeker") ||
    norm === "job seeker" ||
    norm === "seeker" ||
    norm === "jobseeker" ||
    norm === "option 1" ||
    norm === "option one" ||
    norm === "first option"
  ) {
    return { type: INTENTS.NAVIGATE_REGISTER_SEEKER, target: "registerSeeker", normalizedText: norm };
  }
  if (
    !rawLower.includes("dashboard") &&
    (
      rawLower.includes("employer") ||
      rawLower.includes("recruiter") ||
      norm === "employer" ||
      norm === "recruiter" ||
      norm === "option 2" ||
      norm === "option two" ||
      norm === "second option"
    )
  ) {
    return { type: INTENTS.NAVIGATE_REGISTER_EMPLOYER, target: "registerEmployer", normalizedText: norm };
  }
  if (
    (hasNavPrefix && (rawLower.includes("register") || rawLower.includes("create account") || rawLower.includes("sign up") || rawLower.includes("signup"))) ||
    rawLower.includes("create account page") ||
    rawLower.includes("registration page") ||
    rawLower.includes("signup page")
  ) {
    return { type: INTENTS.NAVIGATE_REGISTER, target: "register", normalizedText: norm };
  }
  if (
    rawLower.includes("home") ||
    rawLower.includes("homepage") ||
    rawLower.includes("home page") ||
    norm === "home" ||
    norm === "homepage" ||
    norm === "home page"
  ) {
    return { type: INTENTS.NAVIGATE_HOME, target: "home", normalizedText: norm };
  }
  if (
    rawLower.includes("next job") ||
    rawLower.includes("next position") ||
    rawLower.includes("next recommendation") ||
    rawLower.includes("next listing") ||
    rawLower.includes("go to next job") ||
    rawLower.includes("can i go to next job") ||
    rawLower.includes("open next job") ||
    rawLower.includes("continue to next job") ||
    rawLower.includes("continue process") ||
    rawLower.includes("same process") ||
    norm === "next job" ||
    norm === "next position" ||
    norm === "next recommendation" ||
    norm === "next" ||
    norm === "skip" ||
    rawLower === "next" ||
    rawLower === "skip"
  ) {
    return { type: INTENTS.NEXT_FILTERED_JOB, normalizedText: norm };
  }
  if (
    rawLower.includes("back to find jobs") ||
    rawLower.includes("back to find jobs page") ||
    rawLower.includes("back to find jobs pages") ||
    rawLower.includes("back to findjobs") ||
    rawLower.includes("back to findjobs page") ||
    rawLower.includes("back to findjobs pages") ||
    rawLower.includes("back to jobs") ||
    rawLower.includes("go back to find jobs") ||
    rawLower.includes("go back to findjobs") ||
    rawLower.includes("go back to findjobs page") ||
    rawLower.includes("go back to jobs") ||
    rawLower.includes("return to find jobs") ||
    rawLower.includes("return to findjobs") ||
    rawLower.includes("return to findjobs page") ||
    rawLower.includes("find jobs") ||
    rawLower.includes("findjobs") ||
    rawLower.includes("search jobs") ||
    norm === "jobs" ||
    norm === "back to find jobs page" ||
    norm === "back to find jobs pages" ||
    norm === "back to find jobs" ||
    norm === "back to findjobs" ||
    norm === "back to findjobs page" ||
    norm === "back to jobs" ||
    norm === "back" ||
    norm === "go back" ||
    rawLower === "back" ||
    rawLower === "go back"
  ) {
    return { type: INTENTS.NAVIGATE_JOBS, target: "jobs", normalizedText: norm };
  }
  if (
    rawLower.includes("recommendations") ||
    rawLower.includes("recommendation") ||
    rawLower.includes("recommandations") ||
    rawLower.includes("recommandation") ||
    rawLower.includes("recommend") ||
    norm.includes("recommendations") ||
    norm.includes("recommendation") ||
    norm === "recommendations" ||
    norm === "recommendation" ||
    norm === "back to recommendations page" ||
    norm === "back to recommendations" ||
    norm === "go back to recommendations page" ||
    norm === "go back to recommendations"
  ) {
    return { type: INTENTS.NAVIGATE_RECOMMENDATIONS, target: "recommendations", normalizedText: norm };
  }
  const isSavedListQuery =
    rawLower.includes("list") ||
    rawLower.includes("listing") ||
    rawLower.includes("tell") ||
    rawLower.includes("what are") ||
    rawLower.includes("what is") ||
    rawLower.includes("what") ||
    rawLower.includes("show") ||
    rawLower.includes("read") ||
    rawLower.includes("not listing") ||
    rawLower.includes("explain") ||
    norm.includes("list") ||
    norm.includes("listing") ||
    norm.includes("tell") ||
    norm.includes("what") ||
    norm.includes("show") ||
    norm.includes("read") ||
    norm.includes("explain");

  if (!isSavedListQuery && (rawLower.includes("saved jobs") || rawLower.includes("saved job") || rawLower.includes("saved"))) {
    return { type: INTENTS.NAVIGATE_SAVED_JOBS, target: "savedJobs", normalizedText: norm };
  }
  if (rawLower.includes("applications") || rawLower.includes("my applications")) {
    return { type: INTENTS.NAVIGATE_APPLICATIONS, target: "applications", normalizedText: norm };
  }
  if (rawLower.includes("profile") || rawLower.includes("my profile") || rawLower.includes("resume")) {
    return { type: INTENTS.NAVIGATE_PROFILE, target: "profile", normalizedText: norm };
  }
  if (rawLower.includes("candidates") || rawLower.includes("find candidates")) {
    return { type: INTENTS.NAVIGATE_CANDIDATES, target: "candidates", normalizedText: norm };
  }
  if (rawLower.includes("employer dashboard") || rawLower.includes("recruiter dashboard")) {
    return { type: INTENTS.NAVIGATE_EMPLOYER_DASHBOARD, target: "employerDashboard", normalizedText: norm };
  }
  if (rawLower.includes("admin dashboard") || rawLower.includes("admin")) {
    return { type: INTENTS.NAVIGATE_ADMIN_DASHBOARD, target: "adminDashboard", normalizedText: norm };
  }
  // 5. Voice Job Filter Intents (Reset, Location, Salary, Role/Skill)
  if (
    rawLower.includes("clear filter") ||
    rawLower.includes("clear filters") ||
    rawLower.includes("reset filter") ||
    rawLower.includes("reset filters") ||
    rawLower.includes("show all jobs") ||
    rawLower.includes("reset job filter")
  ) {
    return { type: INTENTS.FILTER_JOBS_RESET, normalizedText: norm };
  }

  // Location Filter Detection ("what are the job in location Chennai", "filter me the job that are located in Chennai", "jobs in Chennai")
  const locationKeywords = ["chennai", "bangalore", "bengaluru", "hyderabad", "pune", "mumbai", "noida", "delhi", "remote"];
  const matchedLoc = locationKeywords.find((loc) => rawLower.includes(loc));

  if (matchedLoc && ordinalIndex < 0) {
    const canonicalLoc =
      matchedLoc === "bengaluru" ? "Bangalore" :
      matchedLoc.charAt(0).toUpperCase() + matchedLoc.slice(1);
    return {
      type: INTENTS.FILTER_JOBS_LOCATION,
      location: canonicalLoc,
      normalizedText: norm,
    };
  }

  // Salary Filter Detection ("filter by salary above 6 lakh", "salary 8 lakh", "high salary jobs", "jobs based on salary")
  if (
    (rawLower.includes("salary") ||
     rawLower.includes("pay") ||
     rawLower.includes("lakh") ||
     rawLower.includes("lpa") ||
     rawLower.includes("compensation")) &&
    ordinalIndex < 0
  ) {
    let salaryAmount = 0;
    const numberMatch = rawLower.match(/(\d+(\.\d+)?)/);
    if (numberMatch) {
      salaryAmount = parseFloat(numberMatch[1]);
      if (salaryAmount < 100) {
        salaryAmount = salaryAmount * 100000;
      }
    } else if (rawLower.includes("high")) {
      salaryAmount = 1000000;
    }

    return {
      type: INTENTS.FILTER_JOBS_SALARY,
      minSalary: salaryAmount,
      rawText,
      normalizedText: norm,
    };
  }

  // Role / Skill Filter Detection ("show frontend developer jobs", "filter by ai engineer", "jobs in python")
  const roleKeywords = ["frontend", "backend", "full stack", "fullstack", "ui/ux", "designer", "ai engineer", "data analyst", "devops", "qa", "tester", "android", "ios", "python", "react", "java", "developer", "software", "engineer"];
  const matchedRole = roleKeywords.find((r) => rawLower.includes(r));

  if (matchedRole && ordinalIndex < 0 && !rawLower.includes("how to")) {
    return {
      type: INTENTS.FILTER_JOBS_ROLE,
      roleTerm: matchedRole,
      normalizedText: norm,
    };
  }

  // 6. Job Selection / Open View Details ("Open view details of this job", "open view details", "view details", "open job", "open the second job")
  const lowerTrim = rawLower.trim();
  const isOpenDetailsPhrase =
    lowerTrim.includes("view details") ||
    lowerTrim.includes("open details") ||
    lowerTrim.includes("open view details") ||
    lowerTrim.includes("can i open view details") ||
    lowerTrim.includes("can you open view details") ||
    lowerTrim.includes("open job details") ||
    lowerTrim.includes("show job details") ||
    lowerTrim.includes("open this job") ||
    lowerTrim.includes("open that job") ||
    lowerTrim.includes("view this job") ||
    lowerTrim.includes("view that job") ||
    lowerTrim.includes("open job") ||
    lowerTrim.includes("view job") ||
    lowerTrim.includes("open view") ||
    lowerTrim.includes("you details") ||
    lowerTrim.includes("your details") ||
    lowerTrim.includes("yes open") ||
    lowerTrim.includes("open you") ||
    lowerTrim === "open details" ||
    lowerTrim === "view details" ||
    lowerTrim === "open view details" ||
    lowerTrim === "open";

  if (
    isOpenDetailsPhrase ||
    (ordinalIndex >= 0 && (norm.includes("open") || norm.includes("select") || norm.includes("view") || norm.includes("show details")))
  ) {
    return { type: INTENTS.JOB_ORDINAL_OPEN, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 6. Location Queries
  if (norm.includes("location") || norm.includes("where is") || norm.includes("where's") || norm.includes("where position")) {
    return { type: INTENTS.JOB_INFO_LOCATION, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 7. Salary Queries
  if (norm.includes("salary") || norm.includes("pay") || norm.includes("compensation") || norm.includes("how much")) {
    return { type: INTENTS.JOB_INFO_SALARY, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 8. Company Queries
  if (norm.includes("company") || norm.includes("who posted") || norm.includes("who is hiring")) {
    return { type: INTENTS.JOB_INFO_COMPANY, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 9. Title / What is Nth Job Queries
  if ((norm.includes("what is") || norm.includes("which is")) && ordinalIndex >= 0 && !norm.includes("location") && !norm.includes("salary") && !norm.includes("match")) {
    return { type: INTENTS.JOB_INFO_TITLE, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 10. Work Mode / Remote Queries
  if (norm.includes("remote") || norm.includes("work mode") || norm.includes("work from home")) {
    return { type: INTENTS.JOB_INFO_REMOTE, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 11. Match Score Queries
  if (
    norm.includes("why was this job recommended") ||
    norm.includes("why is my match score") ||
    norm.includes("explain match") ||
    norm.includes("match score")
  ) {
    return { type: INTENTS.JOB_MATCH_EXPLAIN, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 12. Count Current Jobs Intent
  if (
    norm.includes("how many jobs") ||
    norm.includes("count jobs") ||
    norm.includes("number of available jobs") ||
    norm.includes("number of jobs") ||
    norm === "how many"
  ) {
    return { type: INTENTS.COUNT_CURRENT_JOBS, normalizedText: norm };
  }

  // 13. List Current Jobs Intent
  const isSavedListingQuery =
    (
      rawLower.includes("saved") ||
      rawLower.includes("save job") ||
      rawLower.includes("save jobs") ||
      norm.includes("saved") ||
      norm.includes("save job")
    ) && (
      rawLower.includes("list") ||
      rawLower.includes("listing") ||
      rawLower.includes("tell") ||
      rawLower.includes("what") ||
      rawLower.includes("show") ||
      rawLower.includes("read") ||
      rawLower.includes("not listing") ||
      rawLower.includes("explain") ||
      norm.includes("list") ||
      norm.includes("listing") ||
      norm.includes("tell") ||
      norm.includes("what") ||
      norm.includes("show") ||
      norm.includes("read") ||
      norm.includes("explain")
    );

  if (
    isSavedListingQuery ||
    rawLower.includes("tell me the saved jobs") ||
    rawLower.includes("tell me saved jobs") ||
    rawLower.includes("tell saved jobs") ||
    rawLower.includes("tell the saved jobs") ||
    rawLower.includes("tell the jobs listed") ||
    rawLower.includes("tell me the jobs listed") ||
    norm.includes("the saved jobs") ||
    norm.includes("the saved job") ||
    norm.includes("tell me the jobs listed") ||
    norm.includes("tell me the jobs") ||
    norm.includes("tell me jobs") ||
    norm.includes("tell the jobs") ||
    norm.includes("tell jobs") ||
    norm.includes("tell me about the saved jobs") ||
    norm.includes("tell about the saved jobs") ||
    norm.includes("tell the saved jobs") ||
    norm.includes("tell me the saved jobs") ||
    norm.includes("tell me saved jobs") ||
    norm.includes("tell saved jobs") ||
    norm.includes("jobs listed") ||
    norm.includes("show me the jobs") ||
    norm.includes("show the jobs") ||
    norm.includes("list the jobs") ||
    norm.includes("list jobs") ||
    norm.includes("list the saved jobs") ||
    norm.includes("list saved jobs") ||
    norm.includes("what are the saved jobs") ||
    norm.includes("what are my saved jobs") ||
    norm.includes("saved jobs listed") ||
    norm.includes("what jobs can i see") ||
    norm.includes("what are the available jobs") ||
    norm.includes("read the job listings") ||
    norm.includes("read job listings") ||
    norm.includes("what jobs are on this page") ||
    norm.includes("jobs on this page") ||
    norm.includes("which jobs are displayed") ||
    norm.includes("list the available jobs") ||
    norm.includes("list available jobs") ||
    norm.includes("what positions are available") ||
    norm.includes("all the jobs listed here") ||
    norm.includes("what jobs listed here") ||
    norm === "list jobs" ||
    norm === "show jobs" ||
    norm === "saved jobs" ||
    norm === "saved job" ||
    norm === "the saved jobs" ||
    norm === "the saved job"
  ) {
    return { type: INTENTS.LIST_CURRENT_JOBS, normalizedText: norm };
  }

  // 14. Ordinal Explain Fallback ("Tell me about the first job", "Explain the third job")
  if (ordinalIndex >= 0 && (norm.includes("explain") || norm.includes("about") || norm.includes("summary") || norm.includes("details"))) {
    return { type: INTENTS.JOB_ORDINAL_EXPLAIN, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 15. Page Orientation & Screen Reader Intents
  if (
    norm.includes("explain this page") ||
    norm.includes("explain the page") ||
    norm.includes("explain page") ||
    norm.includes("explain current page") ||
    norm.includes("what is on this page") ||
    norm.includes("what is on the page") ||
    norm.includes("what is in this page") ||
    norm.includes("what is in the page") ||
    norm.includes("what is correctly in the page") ||
    norm.includes("what is this page") ||
    norm.includes("describe this screen") ||
    norm.includes("describe page") ||
    norm.includes("describe this page") ||
    norm.includes("read page") ||
    norm.includes("read this page") ||
    norm.includes("where am i") ||
    norm.includes("what can i do here") ||
    norm === "help"
  ) {
    return { type: INTENTS.ACCESSIBILITY_PAGE_EXPLAIN, normalizedText: norm };
  }

  // 15b. Read Available Buttons Intent
  if (
    norm.includes("what buttons are available") ||
    norm.includes("buttons available") ||
    norm.includes("read buttons") ||
    norm.includes("list buttons") ||
    norm.includes("show buttons") ||
    norm.includes("what buttons do i see")
  ) {
    return { type: INTENTS.READ_BUTTONS, normalizedText: norm };
  }

  // 16. Job Actions (Apply / Save / Unsave)
  if (
    norm.includes("apply for this job") ||
    norm.includes("apply for job") ||
    norm.includes("apply job") ||
    norm.includes("apply now") ||
    norm.includes("submit application") ||
    norm === "apply" ||
    norm === "apply job"
  ) {
    return { type: INTENTS.JOB_ACTION_APPLY, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (
    norm.includes("remove this saved job") ||
    norm.includes("unsave this job") ||
    norm.includes("unsave job") ||
    norm.includes("remove saved") ||
    norm.includes("remove from saved")
  ) {
    return { type: INTENTS.JOB_ACTION_UNSAVE, jobIndex: ordinalIndex, normalizedText: norm };
  }
  const isSaveActionQuery =
    !rawLower.includes("list") &&
    !rawLower.includes("listing") &&
    !rawLower.includes("not listing") &&
    !rawLower.includes("tell") &&
    !rawLower.includes("what") &&
    !rawLower.includes("show") &&
    !rawLower.includes("read") &&
    !rawLower.includes("explain") &&
    !norm.includes("list") &&
    !norm.includes("listing") &&
    !norm.includes("not listing") &&
    !norm.includes("tell") &&
    !norm.includes("what") &&
    !norm.includes("show") &&
    !norm.includes("read") &&
    !norm.includes("explain") &&
    (
      norm.includes("save this job") ||
      norm.includes("save job") ||
      norm.includes("bookmark job") ||
      norm.includes("save position") ||
      norm.includes("add to saved") ||
      norm === "save" ||
      norm === "save job"
    );

  if (isSaveActionQuery) {
    return { type: INTENTS.JOB_ACTION_SAVE, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 17. Job Explanations & Summaries
  if (
    norm.includes("give me a summary") ||
    norm.includes("job summary") ||
    norm === "summary"
  ) {
    return { type: INTENTS.JOB_SUMMARY, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (
    norm.includes("explain this job simply") ||
    norm.includes("explain this job") ||
    norm.includes("explain job")
  ) {
    return { type: INTENTS.JOB_EXPLAIN_SIMPLE, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 18. Skills, Experience, Requirements, Accommodations
  if (norm.includes("accommodation") || norm.includes("accommodations") || norm.includes("accessibility support") || norm.includes("accessibility accommodations")) {
    return { type: INTENTS.JOB_INFO_ACCOMMODATIONS, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (norm.includes("skills") || norm.includes("skill required") || norm.includes("required skills")) {
    return { type: INTENTS.JOB_INFO_SKILLS, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (norm.includes("experience") || norm.includes("years required")) {
    return { type: INTENTS.JOB_INFO_EXP, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (norm.includes("responsibilities") || norm.includes("duty")) {
    return { type: INTENTS.JOB_INFO_RESPONSES, jobIndex: ordinalIndex, normalizedText: norm };
  }
  if (norm.includes("requirements") || norm.includes("qualification")) {
    return { type: INTENTS.JOB_INFO_REQS, jobIndex: ordinalIndex, normalizedText: norm };
  }

  // 19. Form Automation & Guided Commands
  if (
    norm.includes("start guided") ||
    norm.includes("guided edit") ||
    norm.includes("guided editing") ||
    norm.includes("edit my profile") ||
    norm.includes("edit profile") ||
    norm.includes("help me fill") ||
    norm.includes("help fill") ||
    norm === "start form" ||
    norm === "fill form" ||
    norm === "start" ||
    norm === "yes"
  ) {
    return { type: INTENTS.FORM_START_GUIDED, normalizedText: norm };
  }
  if (norm.includes("change my name") || norm.includes("edit my name") || norm.includes("update name")) {
    return { type: INTENTS.PROFILE_EDIT_NAME, fieldQuery: "name", normalizedText: norm };
  }
  if (norm === "next field" || norm.includes("next field") || norm.includes("move to next")) {
    return { type: INTENTS.FORM_NEXT_FIELD, normalizedText: norm };
  }
  if (norm === "previous field" || norm.includes("previous field") || norm === "prev field") {
    return { type: INTENTS.FORM_PREV_FIELD, normalizedText: norm };
  }
  if (norm.includes("skip field") || norm.includes("skip this field") || norm === "skip") {
    return { type: INTENTS.FORM_SKIP_FIELD, normalizedText: norm };
  }
  if (norm.includes("what do i need to enter") || norm.includes("read my answer") || norm === "repeat") {
    return { type: INTENTS.FORM_REPEAT_FIELD, normalizedText: norm };
  }
  if (norm.includes("clear this field") || norm.includes("clear field") || norm === "clear") {
    return { type: INTENTS.FORM_CLEAR_FIELD, normalizedText: norm };
  }
  if (
    norm === "sign in" ||
    norm === "log in" ||
    norm === "login" ||
    norm === "signin" ||
    norm === "register" ||
    norm === "create account" ||
    norm === "sign up" ||
    norm === "signup" ||
    norm === "submit" ||
    norm === "submit application" ||
    norm === "save changes" ||
    norm === "save profile" ||
    norm === "save profile settings" ||
    norm === "save settings" ||
    norm === "save" ||
    norm === "submit form" ||
    norm === "done" ||
    rawLower === "sign in" ||
    rawLower === "log in" ||
    rawLower === "login" ||
    rawLower === "signin" ||
    rawLower === "register" ||
    rawLower === "create account" ||
    rawLower === "sign up" ||
    rawLower === "signup" ||
    rawLower === "submit" ||
    rawLower === "save" ||
    rawLower === "save profile" ||
    rawLower === "save changes"
  ) {
    return { type: INTENTS.FORM_SUBMIT, normalizedText: norm };
  }
  if (norm === "cancel" || norm === "stop form" || norm === "cancel form") {
    return { type: INTENTS.FORM_CANCEL, normalizedText: norm };
  }

  // 21. Search Jobs Queries
  if (norm.includes("find") || norm.includes("search") || norm.includes("developer") || norm.includes("engineer")) {
    const term = norm
      .replace("find", "")
      .replace("search", "")
      .replace("jobs", "")
      .replace("for", "")
      .replace("show", "")
      .trim();

    return { type: INTENTS.SEARCH_JOBS, searchTerm: term, normalizedText: norm };
  }

  return { type: INTENTS.UNKNOWN, normalizedText: norm };
}
