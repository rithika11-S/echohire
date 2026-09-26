import { useEffect } from "react";
import { useAssistant } from "../context/AssistantContext";
import { voiceManager } from "./voiceInput";

export default function GlobalVoiceActivation() {
  const {
    isAssistantOpen,
    handleAssistantActivation,
    voiceActivationEnabled,
    setIsGlobalListening,
  } = useAssistant();

  useEffect(() => {
    voiceManager.isAssistantOpen = isAssistantOpen;
  }, [isAssistantOpen]);

  useEffect(() => {
    voiceManager.voiceActivationEnabled = voiceActivationEnabled;

    if (voiceActivationEnabled) {
      voiceManager.onActivateCallback = handleAssistantActivation;
      voiceManager.safelyStartRecognition();
    }
  }, [voiceActivationEnabled, isAssistantOpen, handleAssistantActivation]);

  useEffect(() => {
    const checkListening = setInterval(() => {
      setIsGlobalListening(voiceManager.isListening);
    }, 500);
    return () => clearInterval(checkListening);
  }, [setIsGlobalListening]);

  return null;
}
