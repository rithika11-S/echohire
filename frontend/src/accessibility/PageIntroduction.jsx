import { useState, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { getPageIntroText, pageDescriptions } from "./pageDescriptions";
import { Info, Volume2, X } from "lucide-react";

export default function PageIntroduction({ routeKey, meta = {} }) {
  const [showOverviewCard, setShowOverviewCard] = useState(false);
  const { speak, announce } = useAccessibility();

  const config = pageDescriptions[routeKey] || pageDescriptions.notFound;
  const introText = getPageIntroText(routeKey, meta);

  // Keyboard shortcut Alt + Shift + I to trigger Page Overview narration
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        announce(introText);
        speak(introText, true);
        setShowOverviewCard(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [introText, announce, speak]);

  const handleReadAloud = () => {
    announce(introText);
    speak(introText, true);
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      {/* Visible Page Overview Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          className="btn-header-access"
          onClick={() => {
            const nextState = !showOverviewCard;
            setShowOverviewCard(nextState);
            if (nextState) {
              announce(introText);
            }
          }}
          aria-expanded={showOverviewCard}
          aria-label={`Page Overview for ${config.title}. Click or press Alt Shift I for page guidance.`}
          style={{ fontSize: "13px", padding: "4px 10px", background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <Info size={14} color="#2563EB" />
          <span>Page Overview</span>
        </button>
      </div>

      {/* Expandable Subtle Page Overview Card */}
      {showOverviewCard && (
        <div
          tabIndex={0}
          role="region"
          aria-label={`Overview section for ${config.title}`}
          style={{
            marginTop: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-sm)",
            position: "relative",
          }}
        >
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowOverviewCard(false)}
            aria-label="Close page overview panel"
            style={{ position: "absolute", right: "12px", top: "12px" }}
          >
            <X size={16} />
          </button>

          <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Info size={16} color="#2563EB" />
            <span>{config.title} — Guidance & Overview</span>
          </h3>

          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 12px 0" }}>
            {introText}
          </p>

          <button
            type="button"
            className="btn-audio-listen"
            onClick={handleReadAloud}
            aria-label="Listen to page introduction aloud"
            style={{ fontSize: "13px" }}
          >
            <Volume2 size={14} />
            <span>Read Overview Aloud</span>
          </button>
        </div>
      )}
    </div>
  );
}
