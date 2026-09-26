/**
 * Text-to-Speech Audio Manager for Echo Assistant.
 * Provides accessible audio feedback controls: Play, Pause, Resume, Stop, Repeat.
 * Ensures zero overlapping speech and prevents voice feedback loops by informing voice recognition when speaking.
 */

import { voiceManager } from "./voiceInput.js";

class EchoTTSService {
  constructor() {
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.lastSpokenText = "";
    this.isSpeaking = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.currentUtterance = null;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(statusText) {
    for (const callback of this.subscribers) {
      callback({
        isSpeaking: this.isSpeaking,
        isPaused: this.isPaused,
        status: statusText,
        rate: this.rate,
      });
    }
  }

  setSpeechOptions({ rate = 1.0, pitch = 1.0, volume = 1.0 }) {
    this.rate = rate;
    this.pitch = pitch;
    this.volume = volume;
  }

  speakFaster() {
    this.rate = Math.min(2.0, this.rate + 0.25);
    const msg = `Speech rate set to ${this.rate.toFixed(2)}x`;
    console.log(msg);
    this.speak(msg);
  }

  speakSlower() {
    this.rate = Math.max(0.5, this.rate - 0.25);
    const msg = `Speech rate set to ${this.rate.toFixed(2)}x`;
    console.log(msg);
    this.speak(msg);
  }

  speak(text, onEndCallback = null) {
    if (!text || !this.synth) return;

    // 1. Immediately halt any active microphone recognition to prevent loop
    if (voiceManager) {
      voiceManager.stopListening();
    }

    // 2. Stop any existing audio immediately to prevent overlapping speech
    this.stop();

    this.lastSpokenText = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.isPlaying = true;
      this.isPaused = false;
      console.log("TTS start speaking:", text);

      // Double check mic is stopped
      if (voiceManager) {
        voiceManager.stopListening();
      }

      this.notifySubscribers("Echo Assistant is speaking...");
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      console.log("TTS finished speaking");
      console.log("Assistant speaking: false");

      this.notifySubscribers("Ready for your next command.");
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      console.warn("TTS speech error:", e);
      this.isSpeaking = false;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      console.log("Assistant speaking: false");
      this.notifySubscribers("Ready for your next command.");
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isSpeaking = false;
      this.isPlaying = false;
      this.isPaused = true;
      this.notifySubscribers("Speech paused.");
    }
  }

  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isSpeaking = true;
      this.isPlaying = true;
      this.isPaused = false;
      this.notifySubscribers("Echo Assistant is speaking...");
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.notifySubscribers("Ready for your next command.");
    }
  }

  repeat() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText);
    }
  }
}

export const echoTTS = new EchoTTSService();
