import { useState, useEffect, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { useAssistant } from "../context/AssistantContext";
import { useAuth } from "../context/AuthContext";
import { buildPageContext } from "./pageContext";
import { detectIntent } from "./intentDetector";
import { handleAssistantAction } from "./actionHandlers";
import { echoTTS } from "./textToSpeech";
import { voiceManager, isBrowserSpeechSupported } from "./voiceInput";
import { GuidedApplicationManager } from "./guidedApplication";
import { getSuggestedCommands } from "./suggestedCommands";
import { readCurrentPage } from "./pageScreenReader";
import { conversationMemory } from "./ConversationContext";
import { getJobId } from "../utils/jobUtils";
import {
  Mic,
  X,
  Send,
  Trash2,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";

export default function EchoAssistant({
  currentPath = "/",
  jobs = [],
  selectedJob = null,
  applications = [],
  savedJobIds = [],
  currentUser = null,
  users = [],
  navigate,
  onSelectJob,
  onSaveJob,
  onUnsaveJob,
  onApplySubmit,
}) {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    closeAssistant,
    enableVoiceActivation: enableVoiceActCtx,
    disableVoiceActivation: disableVoiceActCtx,
    voiceActivationEnabled,
  } = useAssistant();
  const { updateProfile } = useAuth();
  const [query, setQuery] = useState("");

  // Voice debug & status state
  const [isMicListening, setIsMicListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Idle");
  const [micPermission, setMicPermission] = useState("Unknown");
  const [lastError, setLastError] = useState("None");

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I am Echo Assistant, your context-aware accessibility assistant. You can ask me to explain this page, read or edit form fields, summarize a job, or navigate.",
    },
  ]);

  const { speechRate, speechPitch, isMuted, announce } = useAccessibility();
  const chatBottomRef = useRef(null);
  const guidedAppManagerRef = useRef(new GuidedApplicationManager());

  // Subscribe to EchoTTS state to manage speaking status and prevent feedback loops
  useEffect(() => {
    const unsubscribe = echoTTS.subscribe(({ isSpeaking: speaking, status }) => {
      setIsSpeaking(speaking);
      if (status) {
        setVoiceStatus(status);
      }
    });
    return unsubscribe;
  }, []);

  // Keep TTS speech rate & pitch in sync with accessibility preferences
  useEffect(() => {
    echoTTS.setSpeechOptions({
      rate: speechRate || 1.0,
      pitch: speechPitch || 1.0,
      volume: isMuted ? 0 : 1.0,
    });
  }, [speechRate, speechPitch, isMuted]);

  // Build current unified page context
  const pageContext = buildPageContext({
    currentPath,
    jobs,
    selectedJob,
    applications,
    savedJobIds,
    currentUser,
    users,
  });

  // Auto-scroll chat feed
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Context-aware automatic introduction when opening job detail view
  const prevJobIdRef = useRef(null);
  useEffect(() => {
    if (selectedJob && selectedJob.id !== prevJobIdRef.current) {
      prevJobIdRef.current = selectedJob.id;
      const jobIntro = `You are viewing the ${selectedJob.title} position at ${selectedJob.company}. This is a ${selectedJob.workMode || "Remote"} position located in ${selectedJob.location}. ${pageContext.getJobMatchExplanation(selectedJob)} You can ask me to explain this job, read requirements, save the job, or help you apply.`;

      setMessages((prev) => [...prev, { sender: "ai", text: jobIntro }]);
      if (isAssistantOpen) {
        echoTTS.speak(jobIntro);
      }
    }
  }, [selectedJob, pageContext, isAssistantOpen]);

  // Listen for custom assistant messages (e.g. from UI filter change)
  useEffect(() => {
    const handleCustomMsg = (e) => {
      if (e.detail && e.detail.text) {
        setMessages((prev) => [...prev, { sender: e.detail.sender || "ai", text: e.detail.text }]);
      }
    };
    window.addEventListener("echohire_assistant_message", handleCustomMsg);
    return () => window.removeEventListener("echohire_assistant_message", handleCustomMsg);
  }, []);

  // Automatic Screen Reader: Read current page ONCE after route navigation completes and DOM renders
  const lastReadPathRef = useRef(null);
  useEffect(() => {
    if (!currentPath) return;

    if (lastReadPathRef.current !== currentPath) {
      console.log("Current route:", currentPath);
      console.log("Page changed");
      console.log("Waiting for page render");

      const previousPath = lastReadPathRef.current;
      lastReadPathRef.current = currentPath;

      // Wait for React to finish rendering the new route's DOM components
      const timer = setTimeout(() => {
        // Handle returning to /jobs, /recommendations, or /saved-jobs when sequential review is active
        const isJobsSequence = conversationMemory.isNavigatingSequence && currentPath === "/jobs" && conversationMemory.sequenceType === "filter";
        const isRecsSequence = conversationMemory.isNavigatingSequence && currentPath === "/recommendations" && conversationMemory.sequenceType === "recommendations";
        const isSavedJobsSequence = conversationMemory.isNavigatingSequence && (currentPath === "/saved-jobs" || currentPath === "SavedJobs") && conversationMemory.sequenceType === "savedJobs";

        if (isJobsSequence || isRecsSequence || isSavedJobsSequence) {
          console.log(`[EchoAssistant] Sequential ${conversationMemory.sequenceType} review active on ${currentPath}`);
          if (conversationMemory.sequenceAlreadySpokenOnNav) {
            console.log("[EchoAssistant] Sequential speech already executed by voice action");
            conversationMemory.sequenceAlreadySpokenOnNav = false;
            return;
          }

          // Triggered when user navigated via UI button or browser back
          const nextIndex = conversationMemory.filteredSequenceIndex + 1;
          const sequence = conversationMemory.filteredSequence;

          if (nextIndex < sequence.length) {
            conversationMemory.filteredSequenceIndex = nextIndex;
            const nextJob = sequence[nextIndex];
            conversationMemory.setReferencedJob(nextJob, nextIndex);

            if (conversationMemory.sequenceType === "savedJobs") {
              const appliedIds = pageContext.appliedJobIds || [];
              const nextJobId = getJobId(nextJob);
              const isApplied =
                appliedIds.includes(nextJobId) ||
                appliedIds.includes(nextJob.id) ||
                appliedIds.includes(nextJob._id) ||
                appliedIds.includes(String(nextJob.id || "").replace(/^job-/, "")) ||
                appliedIds.includes(`job-${String(nextJob.id || "").replace(/^job-/, "")}`);

              if (isApplied) {
                if (nextIndex < sequence.length - 1) {
                  conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
                    job: nextJob,
                    list: sequence,
                    index: nextIndex,
                    sequenceType: "savedJobs",
                  });
                } else {
                  conversationMemory.clearProposedAction();
                }
              } else {
                conversationMemory.setProposedAction("APPLY_JOB", {
                  job: nextJob,
                  list: sequence,
                  index: nextIndex,
                  sequenceType: "savedJobs",
                });
              }

              const reply = conversationMemory.formatJobExplanation(
                nextJob,
                nextIndex,
                sequence.length,
                true,
                "savedJobs",
                isApplied
              );
              setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
              echoTTS.speak(reply);
              return;
            }

            conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
              job: nextJob,
              list: sequence,
              index: nextIndex,
              sequenceType: conversationMemory.sequenceType,
            });

            const reply = conversationMemory.formatJobExplanation(nextJob, nextIndex, sequence.length, true, conversationMemory.sequenceType);
            setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
            echoTTS.speak(reply);
          } else {
            const isRec = conversationMemory.sequenceType === "recommendations";
            const isSaved = conversationMemory.sequenceType === "savedJobs";
            conversationMemory.clearFilteredSequence();
            const reply = isSaved
              ? "Returned to Saved Jobs. You have reviewed all your saved positions. Let me know if you would like to explore any job again or find more jobs."
              : isRec
              ? `Returned to AI Recommendations. You have reviewed all ${sequence.length} recommended positions. Let me know if you would like to explore any job again or search for new jobs.`
              : `Returned to Find Jobs page with your active filters intact. You have reviewed all ${sequence.length} filtered positions. Let me know if you would like to adjust your filters, search for new jobs, or hear any job summary again.`;
            setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
            echoTTS.speak(reply);
          }
          return;
        }

        // On initial navigation to /saved-jobs, SavedJobs component handles initial announcement
        if (currentPath === "/saved-jobs" || currentPath === "SavedJobs") {
          return;
        }

        console.log("Reading current page");
        const pageDescription = readCurrentPage(currentPath, pageContext);

        if (previousPath !== null) {
          setMessages((prev) => [...prev, { sender: "ai", text: pageDescription }]);
          console.log("Starting text-to-speech");
          echoTTS.speak(pageDescription);
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [currentPath, pageContext]);

  // Process natural language user command
  const executeUserQuery = (userText) => {
    if (!userText || !userText.trim()) return;

    const trimmed = userText.trim();
    // Add user message to conversation log
    setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);

    // Detect Intent
    const intent = detectIntent(trimmed);

    // Execute Action via Action Handler
    const result = handleAssistantAction({
      intent,
      userQuery: trimmed,
      context: pageContext,
      navigate,
      onSelectJob,
      onSaveJob,
      onUnsaveJob,
      guidedAppManager: guidedAppManagerRef.current,
      currentUser,
      onApplySubmit,
      openAssistantPanel: () => setIsAssistantOpen(true),
      updateProfileState: updateProfile,
    });

    if (result && result.reply) {
      setMessages((prev) => [...prev, { sender: "ai", text: result.reply }]);
    }

    if (result && result.stopListening) {
      if (disableVoiceActCtx) disableVoiceActCtx();
    }
  };

  // Handle Form Text Submission
  const handleSendForm = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const textToSubmit = query;
    setQuery("");
    executeUserQuery(textToSubmit);
  };

  // Automatically register voice callbacks globally for EchoAssistant
  useEffect(() => {
    voiceManager.onResultCallback = (transcriptText) => {
      setIsMicListening(false);
      setVoiceStatus(`You said: "${transcriptText}"`);
      executeUserQuery(transcriptText);
    };

    voiceManager.onStatusCallback = ({ status, isListening, permission, lastError: errName }) => {
      setVoiceStatus(status);
      setIsMicListening(isListening);
      if (permission) setMicPermission(permission);
      if (errName) setLastError(errName);
    };

    voiceManager.onErrorCallback = (userMessage, errName) => {
      setIsMicListening(false);
      setLastError(errName || "error");
      if (errName !== "aborted" && errName !== "no-speech" && userMessage) {
        setMessages((prev) => [...prev, { sender: "ai", text: userMessage }]);
        echoTTS.speak(userMessage);
      }
    };

    if (voiceActivationEnabled) {
      voiceManager.safelyStartRecognition();
    }
  }, [voiceActivationEnabled]);

  // Explicit microphone permission request handler
  const handleEnableVoiceActivation = async () => {
    if (enableVoiceActCtx) {
      await enableVoiceActCtx();
      setMicPermission("Granted");
      setVoiceStatus("Voice Activation Enabled");
    }
  };

  // Handle Microphone Voice Input (Suppressed while assistant is speaking)
  const handleStartMic = async () => {
    if (isSpeaking) {
      console.log("Mic start click ignored: Echo Assistant is speaking...");
      return;
    }

    echoTTS.stop();

    if (!voiceActivationEnabled) {
      await handleEnableVoiceActivation();
    } else {
      voiceManager.safelyStartRecognition();
    }
  };

  // Suggested commands for active context
  const suggestedChips = getSuggestedCommands(pageContext.pageKey, pageContext.isJobDetailOpen);

  return (
    <div className="ai-assistant-wrapper">
      {/* Floating Pill Button for Echo Assistant */}
      {!isAssistantOpen && (
        <button
          className="ai-float-btn"
          onClick={() => {
            setIsAssistantOpen(true);
            announce("Echo Assistant accessibility assistant opened");
            echoTTS.speak("Echo Assistant opened. Ready for text or voice commands.");
          }}
          aria-label="Open Echo Assistant accessibility assistant"
          title="Echo Assistant — Your accessibility assistant"
          style={{
            outlineOffset: "2px",
            border: "2px solid #2563EB",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          }}
        >
          <Sparkles size={18} color="#FFFFFF" />
          <span style={{ fontWeight: "700" }}>Echo Assistant</span>
        </button>
      )}

      {/* Echo Assistant Clean Panel */}
      {isAssistantOpen && (
        <div
          className="ai-chat-card"
          role="dialog"
          aria-labelledby="echo-assistant-title"
          aria-modal="false"
          style={{ width: "380px", maxWidth: "92vw" }}
        >
          {/* Header */}
          <div className="ai-chat-header" style={{ background: "#0F172A", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={18} color="#FFFFFF" />
              </div>
              <div>
                <h3 id="echo-assistant-title" style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#FFFFFF" }}>
                  Echo Assistant
                </h3>
                <span style={{ fontSize: "12px", color: "#94A3B8", display: "block" }}>
                  Your accessibility assistant
                </span>
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => {
                closeAssistant();
              }}
              aria-label="Close Echo Assistant"
              style={{ color: "#FFFFFF" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Conversation Feed */}
          <div
            className="ai-chat-messages"
            tabIndex={0}
            aria-live="polite"
            aria-atomic="true"
            aria-label="Echo Assistant conversation feed"
            style={{ maxHeight: "260px", overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}
                tabIndex={0}
              >
                {msg.text}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Accessible Audio Playback Control Toolbar */}
          <div
            style={{
              padding: "8px 12px",
              background: "var(--bg-primary)",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                className="btn-icon"
                onClick={() => echoTTS.repeat()}
                aria-label="Repeat last response"
                title="Repeat Audio"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={() => echoTTS.pause()}
                aria-label="Pause audio reading"
                title="Pause Audio"
              >
                <Pause size={15} />
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={() => echoTTS.resume()}
                aria-label="Resume audio reading"
                title="Resume Audio"
              >
                <Play size={15} />
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={() => echoTTS.stop()}
                aria-label="Stop audio reading"
                title="Stop Audio"
              >
                <Square size={14} />
              </button>
            </div>

            <button
              type="button"
              className="btn-icon"
              onClick={() => setMessages([])}
              aria-label="Clear conversation history"
              title="Clear Feed"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Context-Aware Suggested Command Chips */}
          <div
            style={{
              padding: "10px 12px",
              background: "var(--bg-card)",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {suggestedChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executeUserQuery(chip)}
                tabIndex={0}
                aria-label={`Ask command: ${chip}`}
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  background: "var(--accent-light)",
                  color: "var(--accent-blue)",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Voice Input Microphone Bar & Debug Panel */}
          <div style={{ padding: "10px 12px", background: "var(--bg-card)", borderTop: "1px solid var(--border-color)" }}>
            {!voiceActivationEnabled && micPermission !== "Granted" && (
              <button
                type="button"
                className="secondary-btn"
                onClick={handleEnableVoiceActivation}
                style={{
                  width: "100%",
                  marginBottom: "8px",
                  fontSize: "13px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderColor: "#2563EB",
                  color: "#2563EB",
                  fontWeight: "700",
                }}
              >
                <Sparkles size={14} color="#2563EB" />
                <span>Enable Hands-Free Voice Activation</span>
              </button>
            )}

            <button
              type="button"
              className={`primary-btn ${isMicListening ? "listening" : ""} ${isSpeaking ? "disabled" : ""}`}
              onClick={handleStartMic}
              disabled={isSpeaking}
              aria-label={
                isSpeaking
                  ? "Echo Assistant is speaking"
                  : voiceActivationEnabled
                  ? "Hands-free voice recognition active"
                  : "Enable hands-free voice activation"
              }
              style={{
                width: "100%",
                minHeight: "40px",
                fontSize: "14px",
                opacity: isSpeaking ? 0.75 : 1,
                cursor: isSpeaking ? "not-allowed" : "pointer",
                background: voiceActivationEnabled && !isSpeaking ? "#15803D" : undefined,
                borderColor: voiceActivationEnabled && !isSpeaking ? "#22C55E" : undefined,
              }}
            >
              {isSpeaking ? (
                <>
                  <Volume2 size={16} className="animate-pulse" />
                  <span>Echo Assistant is speaking...</span>
                </>
              ) : voiceActivationEnabled ? (
                <>
                  <Mic size={16} className={isMicListening ? "animate-pulse" : ""} color="#86EFAC" />
                  <span>{isMicListening ? "Listening Hands-Free (Speak now)..." : "Hands-Free Active (Speak anytime)"}</span>
                </>
              ) : (
                <>
                  <Mic size={16} />
                  <span>Start Voice Command</span>
                </>
              )}
            </button>

            {/* Development Voice Debug Status Panel */}
            <div
              style={{
                fontSize: "11px",
                background: "var(--bg-primary)",
                border: "1px dashed var(--border-color)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                marginTop: "8px",
                color: "var(--text-secondary)",
                lineHeight: "1.4",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>Voice Debug:</strong>
              <div>Browser Support: {isBrowserSpeechSupported ? "Yes" : "No"}</div>
              <div>Microphone: {micPermission}</div>
              <div>Status: {isSpeaking ? "Speaking" : isMicListening ? "Listening" : voiceStatus}</div>
              <div>Last Error: {lastError}</div>
            </div>
          </div>

          {/* Text Input Row */}
          <form onSubmit={handleSendForm} className="ai-chat-input-row">
            <input
              type="text"
              placeholder="Ask Echo Assistant or type command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Type command for Echo Assistant"
              className="ai-input"
              autoComplete="off"
            />
            <button
              type="submit"
              className="primary-btn"
              style={{ minHeight: "36px", padding: "6px 14px" }}
              aria-label="Send command"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
