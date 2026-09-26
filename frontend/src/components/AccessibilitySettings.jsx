import { useAccessibility } from "../context/AccessibilityContext";
import { X, SlidersHorizontal, Volume2, Square } from "lucide-react";

export default function AccessibilitySettings({ isOpen, onClose }) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    pageIntroEnabled,
    setPageIntroEnabled,
    speak,
    stopSpeaking,
    announce,
  } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="acc-settings-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SlidersHorizontal size={20} color="#2563EB" />
            <h2 id="acc-settings-title" style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
              Accessibility Settings
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close accessibility settings dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Display & Contrast Controls */}
          <div className="form-group">
            <h3 style={{ fontSize: "16px", fontWeight: "700", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", color: "var(--text-primary)" }}>
              Display & Contrast
            </h3>

            <label htmlFor="theme-select" className="filter-label" style={{ marginTop: "10px" }}>
              Visual Contrast Mode
            </label>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                announce(`Theme changed to ${e.target.value}`);
              }}
              className="select-input"
            >
              <option value="default">Standard Professional (Light)</option>
              <option value="soft-blue">Soft Blue Light</option>
              <option value="high-contrast-dark">High Contrast Dark (Black & White)</option>
              <option value="high-contrast-yellow">High Contrast Yellow on Black (Low Vision)</option>
            </select>

            <label htmlFor="font-size-select" className="filter-label" style={{ marginTop: "12px" }}>
              Text Size Hierarchy
            </label>
            <select
              id="font-size-select"
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                announce(`Font size changed to ${e.target.value}`);
              }}
              className="select-input"
            >
              <option value="normal">Normal (16px base)</option>
              <option value="large">Large (18px base)</option>
              <option value="extra-large">Extra Large (20px base)</option>
            </select>
          </div>

          {/* Page Introduction Guidance */}
          <div className="form-group">
            <h3 style={{ fontSize: "16px", fontWeight: "700", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", color: "var(--text-primary)" }}>
              Automatic Page Introductions & Orientation
            </h3>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
              <div>
                <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Announce Page Orientations</strong>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                  Automatically orient screen readers and voice users upon page navigation.
                </p>
              </div>
              <select
                value={pageIntroEnabled ? "on" : "off"}
                onChange={(e) => {
                  const val = e.target.value === "on";
                  setPageIntroEnabled(val);
                  announce(`Automatic page introductions turned ${val ? "on" : "off"}`);
                }}
                className="select-input"
                style={{ width: "110px" }}
                aria-label="Toggle automatic page introductions"
              >
                <option value="on">On (Default)</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          {/* Audio Narrator Settings */}
          <div className="form-group">
            <h3 style={{ fontSize: "16px", fontWeight: "700", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", color: "var(--text-primary)" }}>
              Text-to-Speech Audio Narrator
            </h3>

            <label htmlFor="speech-rate" className="filter-label" style={{ marginTop: "10px" }}>
              Speech Rate: {speechRate}x
            </label>
            <input
              type="range"
              id="speech-rate"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              aria-label={`Adjust speech rate slider, current value ${speechRate}`}
              style={{ width: "100%", accentColor: "var(--accent-blue)" }}
            />

            <label htmlFor="speech-pitch" className="filter-label" style={{ marginTop: "12px" }}>
              Speech Pitch: {speechPitch}
            </label>
            <input
              type="range"
              id="speech-pitch"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speechPitch}
              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
              aria-label={`Adjust speech pitch slider, current value ${speechPitch}`}
              style={{ width: "100%", accentColor: "var(--accent-blue)" }}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                type="button"
                className="btn-audio-listen"
                onClick={() => speak("This is a test of the EchoHire Text-to-Speech voice narrator.")}
                aria-label="Test current voice speech settings"
              >
                <Volume2 size={15} />
                <span>Test Voice</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={stopSpeaking}
                aria-label="Stop audio narration playback"
              >
                <Square size={14} />
                <span>Stop Audio</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose} aria-label="Save and close accessibility preferences">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
