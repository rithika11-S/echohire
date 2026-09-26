/**
 * Reusable Voice Command Normalization Helper for Echo Assistant.
 * Normalizes transcripts by converting to lowercase, removing punctuation,
 * replacing "a i" with "ai", treating "assistance" as "assistant",
 * collapsing multiple spaces to a single space, and trimming whitespace.
 */
export function normalizeVoiceCommand(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\bfindjobs\b/g, "find jobs")
    .replace(/\bfindjob\b/g, "find job")
    .replace(/\brecommandations\b/g, "recommendations")
    .replace(/\brecommandation\b/g, "recommendation")
    .replace(/\ba\s+i\b/g, "ai")
    .replace(/\bassistance\b/g, "assistant")
    .replace(/\s+/g, " ")
    .trim();
}

