/**
 * Global Voice Activation Helpers for Echo Assistant.
 * Provides activation phrase matching and normalization using single global voiceManager instance.
 */

import { normalizeVoiceCommand } from "./normalizeVoiceCommand";
import { voiceManager } from "./voiceInput";

export const ACTIVATION_COMMANDS = [
  "open ai assistant",
  "open the ai assistant",
  "open voice assistant",
  "open the voice assistant",
  "open echo assistant",
  "open echo",
  "hey echo",
  "activate assistant",
  "start assistant",
  "start voice assistant",
  "open a i assistant",
  "open ai assistance",
  "open voice assistance",
  "open echo assistance",
];

export function isActivationCommand(transcriptText) {
  if (!transcriptText) return false;
  const normalized = normalizeVoiceCommand(transcriptText);

  return ACTIVATION_COMMANDS.some((cmd) => normalized.includes(cmd)) ||
    normalized === "echo" ||
    normalized.includes("hey echo") ||
    (normalized.includes("open") && normalized.includes("assistant"));
}

export function useGlobalVoiceActivation({ onActivate }) {
  if (onActivate) {
    voiceManager.onActivateCallback = onActivate;
  }
  return { isListeningForActivation: voiceManager.isListening };
}

