import { useAccessibility } from "../context/AccessibilityContext";
import { X, Bell, CheckCircle2, Sparkles } from "lucide-react";

export default function NotificationsModal({ isOpen, onClose, notifications, onMarkAllRead }) {
  const { speak } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="notif-modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={20} color="#2563EB" />
            <h2 id="notif-modal-title" style={{ fontSize: "20px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
              Application Notifications
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close notifications modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notifications.length === 0 ? (
            <div className="empty-state-card" style={{ margin: "16px 0", padding: "32px 16px" }}>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No notifications at this time.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  background: notif.read ? "var(--bg-primary)" : "var(--accent-light)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 16px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ color: "var(--accent-blue)", marginTop: "2px" }}>
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: notif.read ? "500" : "700", color: "var(--text-primary)" }}>
                    {notif.message}
                  </p>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                    {notif.timestamp || "Recently"}
                  </span>
                </div>
                <button
                  className="btn-audio-listen"
                  onClick={() => speak(notif.message)}
                  style={{ padding: "4px 8px", fontSize: "12px", minHeight: "32px" }}
                  aria-label="Read notification aloud"
                >
                  Listen
                </button>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          {notifications.length > 0 && (
            <button className="secondary-btn" onClick={onMarkAllRead} style={{ fontSize: "13px" }}>
              <CheckCircle2 size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
          <button className="primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
