/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { formContext } from "../assistant/FormContextService";
import { conversationMemory } from "../assistant/ConversationContext";
import { voiceManager } from "../assistant/voiceInput";
import { echoTTS } from "../assistant/textToSpeech";

const AssistantContext = createContext();

export function AssistantProvider({ children }) {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGlobalListening, setIsGlobalListening] = useState(false);
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(() => {
    return localStorage.getItem("echohire_voice_enabled") !== "false";
  });
  const [voiceStatus, setVoiceStatus] = useState("Initializing...");
  const [micPermission, setMicPermission] = useState("Unknown");
  const [lastError, setLastError] = useState("None");

  // Keep voiceManager instance properties synced with React state
  useEffect(() => {
    voiceManager.isAssistantOpen = isAssistantOpen;
  }, [isAssistantOpen]);

  // On App Mount: Automatically initialize single global voice activation system
  useEffect(() => {
    async function autoStartVoice() {
      const savedPref = localStorage.getItem("echohire_voice_enabled");
      if (savedPref === "false") {
        setVoiceActivationEnabled(false);
        setVoiceStatus("Voice Inactive");
        return;
      }

      setVoiceActivationEnabled(true);
      voiceManager.voiceActivationEnabled = true;
      voiceManager.onActivateCallback = handleAssistantActivation;

      await voiceManager.initAutoVoiceActivation();

      setMicPermission(voiceManager.micPermission);
      if (voiceManager.micPermission === "Granted") {
        setVoiceStatus("Voice Active");
      } else if (voiceManager.micPermission === "Denied") {
        setVoiceStatus("Microphone Permission Required");
      } else {
        setVoiceStatus("Voice Active");
      }
    }

    autoStartVoice();
  }, []);

  // Periodic check to sync voiceStatus & listening indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(voiceManager.isListening);
      setIsGlobalListening(voiceManager.isListening);
      if (voiceManager.micPermission !== micPermission) {
        setMicPermission(voiceManager.micPermission);
      }
      if (echoTTS.isSpeaking) {
        setVoiceStatus("Voice Paused");
      } else if (voiceManager.isListening) {
        setVoiceStatus("Voice Active");
      } else if (voiceManager.micPermission === "Denied") {
        setVoiceStatus("Microphone Permission Required");
      } else if (!voiceActivationEnabled) {
        setVoiceStatus("Voice Inactive");
      }
    }, 400);

    return () => clearInterval(interval);
  }, [micPermission, voiceActivationEnabled]);

  // Reusable Field Registration Methods
  const registerField = (config) => {
    formContext.registerField(config);
  };

  const unregisterField = (fieldId) => {
    formContext.unregisterField(fieldId);
  };

  const openAssistant = () => {
    console.log("Assistant opening");
    setIsAssistantOpen(true);
    voiceManager.isAssistantOpen = true;
  };

  const handleAssistantActivation = () => {
    console.log("Assistant opening");

    setIsAssistantOpen(true);
    voiceManager.isAssistantOpen = true;
    setVoiceStatus("Voice Active");

    const welcomeMsg = "Echo Assistant is ready. How can I help you?";
    echoTTS.speak(welcomeMsg);

    setTimeout(() => {
      const panelEl = document.querySelector(".ai-chat-card") || document.getElementById("echo-assistant-title");
      if (panelEl) {
        panelEl.focus();
      }
    }, 200);
  };

  const closeAssistant = () => {
    console.log("Assistant closing");
    setIsAssistantOpen(false);
    voiceManager.isAssistantOpen = false;
    if (echoTTS && echoTTS.isSpeaking) {
      echoTTS.stop();
    }
  };

  const toggleAssistant = () => {
    if (isAssistantOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  };

  const enableVoiceActivation = async () => {
    try {
      localStorage.setItem("echohire_voice_enabled", "true");
      setVoiceActivationEnabled(true);
      voiceManager.voiceActivationEnabled = true;
      voiceManager.onActivateCallback = handleAssistantActivation;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicPermission("Granted");
        voiceManager.micPermission = "Granted";

        const msg = "Voice Active";
        setVoiceStatus(msg);
        echoTTS.speak("Voice activation enabled. You can now speak your commands hands-free.");
        voiceManager.safelyStartRecognition();
        return true;
      }
    } catch (err) {
      console.warn("Enable voice activation permission error:", err);
      setMicPermission("Denied");
      voiceManager.micPermission = "Denied";
      const permMsg = "Microphone permission is required to activate the assistant using voice.";
      setVoiceStatus("Microphone Permission Required");
      echoTTS.speak(permMsg);
      return false;
    }
  };

  const disableVoiceActivation = () => {
    localStorage.setItem("echohire_voice_enabled", "false");
    setVoiceActivationEnabled(false);
    voiceManager.voiceActivationEnabled = false;
    voiceManager.stopListening();
    const msg = "Voice Inactive";
    setVoiceStatus(msg);
    console.log("Voice activation enabled: false");
  };

  useEffect(() => {
    voiceManager.voiceActivationEnabled = voiceActivationEnabled;
    if (voiceActivationEnabled) {
      voiceManager.onActivateCallback = handleAssistantActivation;
      voiceManager.safelyStartRecognition();
    }
  }, [voiceActivationEnabled]);

  return (
    <AssistantContext.Provider
      value={{
        isAssistantOpen,
        setIsAssistantOpen,
        openAssistant,
        handleAssistantActivation,
        closeAssistant,
        toggleAssistant,
        isListening,
        setIsListening,
        isGlobalListening,
        setIsGlobalListening,
        voiceActivationEnabled,
        setVoiceActivationEnabled,
        enableVoiceActivation,
        disableVoiceActivation,
        voiceStatus,
        setVoiceStatus,
        micPermission,
        setMicPermission,
        lastError,
        setLastError,
        registerField,
        unregisterField,
        formContext,
        conversationMemory,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  return useContext(AssistantContext);
}
