import { useEffect, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { Trash2, MapPin, ExternalLink, CheckCircle } from "lucide-react";
import { getJobId } from "../utils/jobUtils";
import { conversationMemory } from "../assistant/ConversationContext";
import { echoTTS } from "../assistant/textToSpeech";

export default function SavedJobs({
  savedJobs = [],
  onSelectJob,
  onRemoveSaved,
  appliedJobIds = [],
  onApplyJob,
}) {
  const { announce } = useAccessibility();
  const hasAnnouncedRef = useRef(false);

  useEffect(() => {
    // If speech was already performed during voice navigation, skip duplicate mount speech
    if (conversationMemory.sequenceAlreadySpokenOnNav) {
      console.log("[SavedJobs] Sequence speech already triggered by navigation");
      conversationMemory.sequenceAlreadySpokenOnNav = false;
      hasAnnouncedRef.current = true;
      return;
    }

    // If returning from details view with active sequence, let EchoAssistant handle sequential review
    if (
      conversationMemory.isNavigatingSequence &&
      conversationMemory.sequenceType === "savedJobs" &&
      conversationMemory.filteredSequenceIndex > 0
    ) {
      console.log("[SavedJobs] Active sequence in progress on return");
      return;
    }

    if (hasAnnouncedRef.current) return;

    if (savedJobs && savedJobs.length > 0) {
      hasAnnouncedRef.current = true;
      conversationMemory.setSavedJobsSequence(savedJobs, 0);
      const firstJob = savedJobs[0];
      conversationMemory.setReferencedJob(firstJob, 0);

      const firstJobId = getJobId(firstJob);
      const isApplied =
        (appliedJobIds || []).includes(firstJobId) ||
        (appliedJobIds || []).includes(firstJob.id) ||
        (appliedJobIds || []).includes(firstJob._id) ||
        (appliedJobIds || []).includes(String(firstJob.id || "").replace(/^job-/, "")) ||
        (appliedJobIds || []).includes(`job-${String(firstJob.id || "").replace(/^job-/, "")}`);

      if (isApplied) {
        if (savedJobs.length > 1) {
          conversationMemory.setProposedAction("NEXT_SAVED_JOB", {
            job: firstJob,
            list: savedJobs,
            index: 0,
            sequenceType: "savedJobs",
          });
        } else {
          conversationMemory.clearProposedAction();
        }
      } else {
        conversationMemory.setProposedAction("APPLY_JOB", {
          job: firstJob,
          list: savedJobs,
          index: 0,
          sequenceType: "savedJobs",
        });
      }

      const introText = conversationMemory.formatJobExplanation(
        firstJob,
        0,
        savedJobs.length,
        false,
        "savedJobs",
        isApplied
      );
      echoTTS.speak(introText);
      conversationMemory.addExchange("savedJobs", introText);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("echohire_assistant_message", {
            detail: { sender: "ai", text: introText },
          })
        );
      }
    } else if (savedJobs && savedJobs.length === 0) {
      hasAnnouncedRef.current = true;
      const emptyMsg = "You are on the Saved Jobs page. You currently have no saved jobs. You can say 'Find jobs' to explore open positions.";
      echoTTS.speak(emptyMsg);
      conversationMemory.addExchange("savedJobs", emptyMsg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("echohire_assistant_message", {
            detail: { sender: "ai", text: emptyMsg },
          })
        );
      }
    }
  }, [savedJobs, appliedJobIds]);

  return (
    <section className="saved-jobs-section" aria-labelledby="saved-heading">
      <div style={{ marginBottom: "24px" }}>
        <h1 id="saved-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Saved Job Positions
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Quickly access and apply to jobs you have bookmarked for future reference.
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="empty-state-card" tabIndex={0} role="region" aria-label="No saved jobs found">
          <h2>You have no saved jobs</h2>
          <p style={{ color: "var(--text-secondary)" }}>Explore available job listings and click "Save Job" to bookmark positions here.</p>
        </div>
      ) : (
        <div className="job-cards-container">
          {savedJobs.map((job, idx) => {
            const jobId = getJobId(job) || String(idx);
            const isApplied =
              appliedJobIds.includes(jobId) ||
              appliedJobIds.includes(job.id) ||
              appliedJobIds.includes(job._id) ||
              appliedJobIds.includes(String(job.id || "").replace(/^job-/, "")) ||
              appliedJobIds.includes(`job-${String(job.id || "").replace(/^job-/, "")}`);

            return (
              <article
                key={jobId}
                className="job-card-accessible"
                tabIndex={0}
                aria-label={`Saved Job: ${job.title} at ${job.company}`}
              >
                <div className="job-card-header">
                  <div>
                    <h2
                      className="job-title"
                      style={{ cursor: onSelectJob ? "pointer" : "default" }}
                      onClick={() => {
                        if (onSelectJob) onSelectJob(job);
                      }}
                    >
                      {job.title}
                    </h2>
                    <div className="job-company-name">{job.company}</div>
                  </div>
                  <button
                    type="button"
                    className="btn-danger-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onRemoveSaved) {
                        onRemoveSaved(job);
                      }
                      announce(`Removed ${job.title} from saved jobs`);
                    }}
                    aria-label={`Remove ${job.title} from saved jobs`}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>

                <div className="job-card-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} color="#475569" />
                    <span><strong>Location:</strong> {job.location}</span>
                  </div>
                  <div style={{ fontSize: "14px", marginTop: "4px" }}>
                    <strong>Required Skills:</strong> {job.skills ? (Array.isArray(job.skills) ? job.skills.join(", ") : job.skills) : "Not specified"}
                  </div>
                </div>

                <div className="job-card-actions">
                  <button
                    className={`primary-btn ${isApplied ? "applied" : ""}`}
                    onClick={() => {
                      if (!isApplied) {
                        onApplyJob(job);
                      } else {
                        announce("You have already applied for this job.");
                      }
                    }}
                    disabled={isApplied}
                    aria-label={isApplied ? "Already applied" : "Apply now"}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle size={15} />
                        <span>Applied</span>
                      </>
                    ) : (
                      <span>Apply Now</span>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
