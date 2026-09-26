/**
 * Email Parser & Normalizer Service for Echo Assistant.
 * Parses spoken email transcripts, converts spoken words to symbols and digits,
 * removes improper spaces, formats for screen reading, and validates email structure.
 */

const NUMBER_MAP = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/**
 * Normalizes spoken email input into a standard email format.
 * Examples:
 *  "rithika one one zero five at gmail dot com" -> "rithika1105@gmail.com"
 *  "rithika dot senthil at gmail dot com" -> "rithika.senthil@gmail.com"
 *  "rithika underscore s at gmail dot com" -> "rithika_s@gmail.com"
 */
export function parseSpokenEmail(rawInput) {
  if (!rawInput) return "";

  let text = rawInput.toLowerCase().trim();

  // 1. Replace spoken symbol words with actual characters
  text = text.replace(/\b(at the rate|at)\b/gi, "@");
  text = text.replace(/\b(dot|point|period)\b/gi, ".");
  text = text.replace(/\b(underscore|under score)\b/gi, "_");
  text = text.replace(/\b(dash|hyphen|minus)\b/gi, "-");
  text = text.replace(/\b(plus)\b/gi, "+");

  // 2. Convert spoken number words to digits
  Object.keys(NUMBER_MAP).forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, "gi");
    text = text.replace(reg, NUMBER_MAP[word]);
  });

  // 3. Remove all spaces, especially around @ and .
  text = text.replace(/\s+/g, "");

  // Clean trailing punctuation
  text = text.replace(/[^a-z0-9@._+\-]/gi, "");

  return text;
}

/**
 * Validates parsed email address.
 * Checks for exactly one @, valid local & domain parts, no spaces, and a valid TLD.
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  if (email.includes(" ")) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;

  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return false;

  return true;
}

/**
 * Formats an email address for clear screen reading / speech synthesis.
 * Example:
 *  "rithika1105@gmail.com" -> "Rithika 1 1 0 5, at, gmail, dot com"
 */
export function formatEmailForSpeech(email) {
  if (!email || !email.includes("@")) return email || "";

  const [local, domain] = email.split("@");
  
  // Spell out numbers individually in local part for extreme clarity
  let readableLocal = local.replace(/\d/g, (d) => ` ${d} `);
  readableLocal = readableLocal.replace(/\./g, " dot ").replace(/_/g, " underscore ").replace(/-/g, " dash ");
  readableLocal = readableLocal.replace(/\s+/g, " ").trim();

  const domainReadable = domain.replace(/\./g, " dot ");

  return `${readableLocal}, at, ${domainReadable}`;
}
