/**
 * Robust Single Global Speech Recognition Controller for Echo Assistant.
 * Uses ONE reusable SpeechRecognition instance, explicit getUserMedia microphone permission requests,
 * continuous hands-free auto-restart loop, detailed error handling, and required debugging logs.
 * Suppresses microphone capture while text-to-speech is active.
 */

import { echoTTS } from "./textToSpeech.js";
import { normalizeVoiceCommand } from "./normalizeVoiceCommand.js";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

console.log("SpeechRecognition available:", SpeechRecognition);

class EchoVoiceRecognitionManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isProcessing = false;
    this.isRecognitionStarting = false;
    this.voiceActivationEnabled = false;
    this.isAssistantOpen = false;
    this.micPermission = "Unknown"; // "Granted" | "Denied" | "Unknown"
    this.lastError = "None";
    this.statusText = "Idle";

    this.onActivateCallback = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
    this.autoRestartTimer = null;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = "en-US";
        this.recognition.maxAlternatives = 1;

        this.bindEvents();
        this.bindTTSSubscription();
      } catch (err) {
        console.error("Failed to initialize SpeechRecognition instance:", err);
      }
    }
  }

  bindTTSSubscription() {
    if (typeof window === "undefined" || !echoTTS) return;

    // Listen to SpeechSynthesis state changes to automatically restart mic after TTS completes
    echoTTS.subscribe(({ isSpeaking }) => {
      if (!isSpeaking) {
        this.isProcessing = false;

        if (this.voiceActivationEnabled && !this.isListening) {
          if (this.autoRestartTimer) clearTimeout(this.autoRestartTimer);
          this.autoRestartTimer = setTimeout(() => {
            this.safelyStartRecognition();
          }, 400);
        }
      } else {
        // If speaking starts, stop active mic recognition immediately
        this.stopListening();
      }
    });
  }

  async requestMicPermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micPermission = "Granted";
        stream.getTracks().forEach((track) => track.stop());
        return { success: true, permission: "Granted" };
      }
    } catch (err) {
      console.warn("Microphone getUserMedia permission error:", err);
      this.micPermission = "Denied";
      this.lastError = "not-allowed";
      const permMsg = "Microphone permission is required to activate the assistant using voice.";
      return { success: false, permission: "Denied", message: permMsg };
    }
  }

  async initAutoVoiceActivation() {
    if (typeof window === "undefined" || !SpeechRecognition || !this.recognition) return;

    const savedPref = localStorage.getItem("echohire_voice_enabled");
    if (savedPref === "false") {
      this.voiceActivationEnabled = false;
      this.statusText = "Voice Inactive";
      return;
    }

    // Default to true
    this.voiceActivationEnabled = true;
    localStorage.setItem("echohire_voice_enabled", "true");

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micPermission = "Granted";
        stream.getTracks().forEach((track) => track.stop());
        this.safelyStartRecognition();
      }
    } catch (err) {
      console.warn("Auto voice activation permission check:", err);
      this.micPermission = "Denied";
      this.statusText = "Microphone Permission Required";
    }
  }

  safelyStartRecognition() {
    if (
      !this.voiceActivationEnabled ||
      this.isListening ||
      this.isRecognitionStarting ||
      (echoTTS && echoTTS.isSpeaking) ||
      this.isProcessing
    ) {
      return;
    }

    if (!this.recognition) return;

    this.isRecognitionStarting = true;

    try {
      this.recognition.start();
    } catch (err) {
      this.isRecognitionStarting = false;
      if (err.name === "InvalidStateError") {
        this.isListening = true;
      } else {
        console.warn("Error starting SpeechRecognition:", err.message);
      }
    }
  }

  bindEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      // If assistant started speaking right as mic started, stop immediately
      if (echoTTS && echoTTS.isSpeaking) {
        try {
          this.recognition.stop();
        } catch (e) {}
        this.isListening = false;
        this.isRecognitionStarting = false;
        return;
      }

      this.isListening = true;
      this.isRecognitionStarting = false;
      this.statusText = "Listening...";
      this.lastError = "None";

      console.log("Assistant panel open:", this.isAssistantOpen);
      console.log("Voice activation enabled:", this.voiceActivationEnabled);
      console.log("Recognition started");

      if (this.onStatusCallback) {
        this.onStatusCallback({
          status: "Listening...",
          isListening: true,
          permission: this.micPermission,
          lastError: "None",
        });
      }
    };

    this.recognition.onresult = (event) => {
      this.isListening = false;
      this.isProcessing = true;
      const transcript = event.results[0][0]?.transcript || "";
      const normalizedCommand = normalizeVoiceCommand(transcript);

      console.log("Raw transcript:", transcript);
      console.log("Normalized transcript:", normalizedCommand);

      const isOpenAssistantCommand =
        (
          (normalizedCommand.includes("open") ||
           normalizedCommand.includes("start") ||
           normalizedCommand.includes("activate")) &&
          (normalizedCommand.includes("assistant") ||
           normalizedCommand.includes("echo"))
        ) ||
        normalizedCommand.includes("hey echo");

      console.log("Open assistant command detected:", isOpenAssistantCommand);

      if (isOpenAssistantCommand) {
        this.isProcessing = false;
        if (this.onActivateCallback) {
          this.onActivateCallback();
        }
        return;
      }

      if (this.onResultCallback && transcript) {
        this.statusText = `You said: "${transcript}"`;
        if (this.onStatusCallback) {
          this.onStatusCallback({
            status: this.statusText,
            isListening: false,
            permission: this.micPermission,
            lastError: "None",
          });
        }
        this.onResultCallback(transcript);
        this.isProcessing = false;
      } else {
        this.isProcessing = false;
      }
    };

    this.recognition.onspeechend = () => {
      try {
        this.recognition.stop();
      } catch (e) {}
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.isRecognitionStarting = false;
      console.log("Recognition ended normally");

      if (this.onStatusCallback) {
        this.onStatusCallback({
          status: this.statusText === "Listening..." ? "Idle" : this.statusText,
          isListening: false,
          permission: this.micPermission,
          lastError: this.lastError,
        });
      }

      // Silent auto-restart loop
      if (
        this.voiceActivationEnabled &&
        !(echoTTS && echoTTS.isSpeaking) &&
        !this.isProcessing &&
        !this.isRecognitionStarting
      ) {
        if (this.autoRestartTimer) clearTimeout(this.autoRestartTimer);
        this.autoRestartTimer = setTimeout(() => {
          this.safelyStartRecognition();
        }, 500);
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      this.isRecognitionStarting = false;
      const errName = event.error || "unknown";
      this.lastError = errName;
      console.log("Speech recognition error:", errName);

      if (errName === "no-speech") {
        // Do not speak an error. Simply continue listening via onend.
        return;
      }

      if (errName === "aborted") {
        // This may happen when intentionally stopping or closing panel.
        // Do not announce it as an error.
        return;
      }

      if (errName === "not-allowed") {
        this.micPermission = "Denied";
        const permMsg = "Microphone permission is required for voice activation.";
        if (this.onStatusCallback) {
          this.onStatusCallback({
            status: "Permission Denied",
            isListening: false,
            permission: "Denied",
            lastError: "not-allowed",
          });
        }
        if (this.onErrorCallback) {
          this.onErrorCallback(permMsg, "not-allowed");
        }
        return;
      }

      this.statusText = `Error: ${errName}`;

      if (this.onStatusCallback) {
        this.onStatusCallback({
          status: `Error: ${errName}`,
          isListening: false,
          permission: this.micPermission,
          lastError: errName,
        });
      }
    };
  }

  async startListening(callbacks = {}) {
    if (callbacks.onResult) this.onResultCallback = callbacks.onResult;
    if (callbacks.onError) this.onErrorCallback = callbacks.onError;
    if (callbacks.onStatus) this.onStatusCallback = callbacks.onStatus;
    if (callbacks.onActivate) this.onActivateCallback = callbacks.onActivate;

    if (!SpeechRecognition || !this.recognition) {
      const notSupportedMsg =
        "Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your command.";
      if (callbacks.onError) callbacks.onError(notSupportedMsg, "not-supported");
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micPermission = "Granted";
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn("Microphone getUserMedia permission error:", err);
      this.micPermission = "Denied";
      this.lastError = "not-allowed";
      const permMsg = "Microphone permission was denied.";
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: "Permission Denied",
          isListening: false,
          permission: "Denied",
          lastError: "not-allowed",
        });
      }
      if (callbacks.onError) callbacks.onError(permMsg, "not-allowed");
      return;
    }

    this.safelyStartRecognition();
  }

  stopListening() {
    this.isListening = false;
    this.isRecognitionStarting = false;
    if (this.autoRestartTimer) {
      clearTimeout(this.autoRestartTimer);
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }
}

export const voiceManager = new EchoVoiceRecognitionManager();
export const isBrowserSpeechSupported = Boolean(SpeechRecognition);
