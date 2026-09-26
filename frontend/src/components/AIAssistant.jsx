import { useState, useEffect, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { getPageIntroText } from "../accessibility/pageDescriptions";
import { Mic, X, Send, Trash2, Bot, Sparkles } from "lucide-react";

export default function AIAssistant({
  jobs,
  applications,
  setPage,
  onSelectJob,
  currentRouteKey = "home",
  currentMeta = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I am your EchoHire Voice Assistant. Ask me to find jobs, explain this page, check applications, or navigate pages.",
    },
  ]);

  const { speak, startVoiceInput, isListening, announce } = useAccessibility();
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const processAICommand = (userQuery) => {
    const q = userQuery.toLowerCase().trim();
    let reply = "";

    // 1. Page Orientation Queries ("What is this page?", "Where am I?", "Explain this page")
    if (
      q.includes("what is this page") ||
      q.includes("where am i") ||
      q.includes("explain this page") ||
      q.includes("what can i do here") ||
      q.includes("read page introduction") ||
      q.includes("page intro")
    ) {
      reply = getPageIntroText(currentRouteKey, currentMeta);
    } else if (q.includes("candidate") || q.includes("shortlisted") || q.includes("applicant")) {
      reply = "Opening Candidate Search & Applicants management.";
      setPage("Candidates");
    } else if (q.includes("post a job") || q.includes("create job") || q.includes("new job")) {
      reply = "Opening Employer Job Posting Portal.";
      setPage("EmployerDashboard");
    } else if (q.includes("employer") || q.includes("recruiter dashboard")) {
      reply = "Navigating to Employer & Recruiter Dashboard.";
      setPage("EmployerDashboard");
    } else if (q.includes("admin") || q.includes("management")) {
      reply = "Navigating to Platform Admin Dashboard.";
      setPage("AdminDashboard");
    } else if (q.includes("application") || q.includes("status")) {
      if (applications.length === 0) {
        reply = "You haven't submitted any job applications yet.";
      } else {
        const statuses = applications
          .map((a) => `${a.jobTitle} at ${a.company}: ${a.status}`)
          .join(". ");
        reply = `You have submitted ${applications.length} applications. Status details: ${statuses}`;
        setPage("Applications");
      }
    } else if (q.includes("profile") || q.includes("resume")) {
      reply = "Opening your profile page.";
      setPage("SeekerProfile");
    } else if (q.includes("recommend") || q.includes("match")) {
      reply = "Opening personalized job recommendations.";
      setPage("Recommendations");
    } else if (q.includes("saved") || q.includes("bookmark")) {
      reply = "Opening your saved jobs.";
      setPage("SavedJobs");
    } else if (q.includes("search") || q.includes("find job")) {
      reply = "Opening job search page.";
      setPage("Jobs");
    } else if (q.includes("react") || q.includes("python") || q.includes("designer") || q.includes("developer")) {
      const matchWord = q.replace("find", "").replace("jobs", "").replace("show", "").trim();
      const matches = (jobs || []).filter(
        (j) =>
          j &&
          ((j.title && j.title.toLowerCase().includes(matchWord)) ||
            (j.skills && Array.isArray(j.skills) && j.skills.some((s) => s && String(s).toLowerCase().includes(matchWord))))
      );
      if (matches.length > 0) {
        reply = `Found ${matches.length} jobs related to ${matchWord}: ${matches.map((m) => m.title + " at " + m.company).join(", ")}.`;
        setPage("Jobs");
        if (onSelectJob) onSelectJob(matches[0]);
      } else {
        reply = `No specific jobs found for ${matchWord}, showing all open jobs.`;
        setPage("Jobs");
      }
    } else {
      reply = `I can help you navigate. Try saying: 'Find developer jobs', 'Show my applications', 'Post a job', or 'Find candidates'.`;
    }

    setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    speak(reply, true);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setQuery("");
    processAICommand(userText);
  };

  const handleVoiceAssistantInput = () => {
    startVoiceInput((spokenText) => {
      setMessages((prev) => [...prev, { sender: "user", text: spokenText }]);
      processAICommand(spokenText);
    });
  };

  return (
    <div className="ai-assistant-wrapper">
      {/* Floating Pill Button */}
      {!isOpen && (
        <button
          className="ai-float-btn"
          onClick={() => {
            setIsOpen(true);
            announce("EchoHire Voice Assistant opened");
            speak("Voice Assistant opened. Ready to listen.", true);
          }}
          aria-label="Open EchoHire Voice Assistant"
        >
          <Mic size={18} />
          <span>Voice Assistant</span>
        </button>
      )}

      {/* Voice Assistant Panel */}
      {isOpen && (
        <div
          className="ai-chat-card"
          role="dialog"
          aria-labelledby="ai-widget-title"
          aria-modal="false"
        >
          <div className="ai-chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={20} color="#FFFFFF" />
              <div>
                <h3 id="ai-widget-title" style={{ margin: 0, fontSize: "15px", color: "#FFFFFF" }}>
                  EchoHire Voice Assistant
                </h3>
                <span style={{ fontSize: "12px", opacity: 0.9, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Sparkles size={11} />
                  <span>{isListening ? "Listening..." : "Ready to listen"}</span>
                </span>
              </div>
            </div>
            <button
              className="btn-icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close Voice Assistant dialog"
              style={{ color: "#ffffff" }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="ai-chat-messages" tabIndex={0} aria-label="Voice conversation feed">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <div style={{ padding: "8px 12px", background: "var(--bg-card)", borderTop: "1px solid var(--border-color)", display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleVoiceAssistantInput}
              aria-label="Start voice recognition"
              style={{ flex: 1, padding: "8px", fontSize: "14px" }}
            >
              <Mic size={15} />
              <span>{isListening ? "Listening..." : "Start Voice Input"}</span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setMessages([])}
              aria-label="Clear chat messages"
              style={{ padding: "8px 12px" }}
            >
              <Trash2 size={15} />
            </button>
          </div>

          <form onSubmit={handleSend} className="ai-chat-input-row">
            <input
              type="text"
              placeholder="Or type command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Type command for Voice Assistant"
              className="ai-input"
            />
            <button type="submit" className="primary-btn" style={{ minHeight: "36px", padding: "6px 14px" }} aria-label="Send text command">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
