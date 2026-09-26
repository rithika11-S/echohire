/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const AccessibilityContext = createContext();

export function AccessibilityProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("echohire_theme");
    // Ensure default theme is "default" and clear old cached yellow/dark settings
    if (!saved || saved === "high-contrast-yellow" || saved === "yellow" || saved === "dark" || saved === "normal") {
      localStorage.setItem("echohire_theme", "default");
      return "default";
    }
    return saved;
  });
  const [fontScale, setFontScale] = useState(() => localStorage.getItem("echohire_fontScale") || "normal");
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem("echohire_speechRate")) || 1);
  const [speechPitch, setSpeechPitch] = useState(() => parseFloat(localStorage.getItem("echohire_speechPitch")) || 1);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("echohire_isMuted") === "true");
  const [autoRead, setAutoRead] = useState(() => localStorage.getItem("echohire_autoRead") !== "false");
  const [pageIntroEnabled, setPageIntroEnabled] = useState(() => localStorage.getItem("echohire_pageIntroEnabled") !== "false");
  const [announcement, setAnnouncement] = useState("");
  const [isListening, setIsListening] = useState(false);

  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    localStorage.setItem("echohire_theme", theme);
    document.body.className = `theme-${theme} font-${fontScale}`;
  }, [theme, fontScale]);

  useEffect(() => {
    localStorage.setItem("echohire_fontScale", fontScale);
    document.body.className = `theme-${theme} font-${fontScale}`;
  }, [fontScale, theme]);

  useEffect(() => {
    localStorage.setItem("echohire_speechRate", speechRate);
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem("echohire_speechPitch", speechPitch);
  }, [speechPitch]);

  useEffect(() => {
    localStorage.setItem("echohire_isMuted", isMuted);
    if (isMuted && synthRef.current) {
      synthRef.current.cancel();
    }
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem("echohire_autoRead", autoRead);
  }, [autoRead]);

  const speak = useCallback((text, force = false) => {
    if (!text || (isMuted && !force)) return;
    if (!synthRef.current) return;

    synthRef.current.cancel(); // Stop overlapping audio
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    synthRef.current.speak(utterance);
  }, [isMuted, speechRate, speechPitch]);

  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const announce = (message) => {
    setAnnouncement(message);
    if (autoRead) {
      speak(message);
    }
    // Clear announcement after a delay to allow re-announcements of same text
    setTimeout(() => setAnnouncement(""), 3000);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (!next) {
        speak("Audio feedback unmuted", true);
      }
      return next;
    });
  };

  const cycleFontScale = () => {
    setFontScale((prev) => {
      let next = "normal";
      if (prev === "normal") next = "large";
      else if (prev === "large") next = "extra-large";
      speak(`Font size set to ${next}`, true);
      return next;
    });
  };

  const cycleTheme = () => {
    setTheme((prev) => {
      let next = "normal";
      if (prev === "normal") next = "high-contrast-dark";
      else if (prev === "high-contrast-dark") next = "high-contrast-yellow";
      speak(`Contrast theme set to ${next.replace(/-/g, " ")}`, true);
      return next;
    });
  };

  const startVoiceInput = (onResultCallback, onErrorCallback) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      announce("Voice recognition is not supported in this browser.");
      if (onErrorCallback) onErrorCallback("Not supported");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      speak("Listening... Speak now.");

      recognition.start();

      recognition.onresult = (event) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript;
        speak(`Recorded: ${transcript}`);
        if (onResultCallback) onResultCallback(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        announce(`Voice input error: ${event.error}`);
        if (onErrorCallback) onErrorCallback(event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (err) {
      setIsListening(false);
      announce("Unable to start voice recognition.");
      if (onErrorCallback) onErrorCallback(err);
    }
  };

  // Global accessibility listeners for keyboard focus & hover auto-reading
  useEffect(() => {
    if (!autoRead || isMuted) return;

    function handleFocusOrHover(e) {
      if (!e.target) return;
      const el = e.target;

      let text = "";
      if (el.getAttribute("aria-label")) {
        text = el.getAttribute("aria-label");
      } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        text = `${el.placeholder || el.name || "Input field"}. ${el.value ? `Current value: ${el.value}` : "Empty"}`;
      } else if (el.tagName === "SELECT") {
        text = `${el.getAttribute("aria-label") || el.name || "Select dropdown"}. Selected option: ${el.options[el.selectedIndex]?.text || ""}`;
      } else if (el.tagName === "BUTTON" || el.tagName === "A") {
        text = el.innerText || el.ariaLabel || "Interactive button";
      } else if (el.getAttribute("role") === "heading" || ["H1", "H2", "H3", "H4"].includes(el.tagName)) {
        text = `Heading: ${el.innerText}`;
      } else if (el.classList.contains("job-card") || el.classList.contains("nav-item")) {
        text = el.innerText;
      }

      if (text) {
        speak(text);
      }
    }

    document.addEventListener("focusin", handleFocusOrHover);

    return () => {
      document.removeEventListener("focusin", handleFocusOrHover);
    };
  }, [autoRead, isMuted, speak]);

  useEffect(() => {
    localStorage.setItem("echohire_pageIntroEnabled", pageIntroEnabled);
  }, [pageIntroEnabled]);

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        fontScale,
        setFontScale,
        cycleFontScale,
        speechRate,
        setSpeechRate,
        speechPitch,
        setSpeechPitch,
        isMuted,
        toggleMute,
        autoRead,
        setAutoRead,
        pageIntroEnabled,
        setPageIntroEnabled,
        speak,
        stopSpeech,
        announce,
        startVoiceInput,
        isListening,
      }}
    >
      {children}
      {/* ARIA Live Region for screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
