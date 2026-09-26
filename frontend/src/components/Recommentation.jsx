import { useEffect, useMemo, useRef } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { Sparkles, MapPin, IndianRupee, Volume2, ExternalLink } from "lucide-react";
import { getJobId } from "../utils/jobUtils";
import { conversationMemory } from "../assistant/ConversationContext";
import { echoTTS } from "../assistant/textToSpeech";

export default function Recommentation({ jobs, onSelectJob }) {
  const { speak } = useAccessibility();
  const isInitialMount = useRef(true);

  // Simulated AI match algorithm based on accessibility accommodation tags
  const recommendedJobs = useMemo(() => {
    return (jobs || []).filter(Boolean).map((job) => {
      let matchScore = 85;
      if (job.accommodations && Array.isArray(job.accommodations)) {
        if (job.accommodations.includes("Screen Reader Compatible")) matchScore += 5;
        if (job.accommodations.includes("Voice-Guided Workflows")) matchScore += 5;
      }
      if (job.type === "Remote" || job.workMode === "Remote") matchScore += 4;
      return { ...job, matchScore: Math.min(matchScore, 99) };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs]);

  useEffect(() => {
    if (!isInitialMount.current) return;
    isInitialMount.current = false;

    // If we are returning to recommendations from a details view, let EchoAssistant or actionHandlers handle next job
    if (conversationMemory.isNavigatingSequence && conversationMemory.sequenceType === "recommendations") {
      console.log("[Recommentation] Returning to recommendations with active sequence");
      return;
    }

    if (recommendedJobs.length > 0) {
      conversationMemory.setRecommendationSequence(recommendedJobs, 0);
      const firstJob = recommendedJobs[0];
      conversationMemory.setReferencedJob(firstJob, 0);
      conversationMemory.setProposedAction("OPEN_JOB_DETAILS", {
        job: firstJob,
        list: recommendedJobs,
        index: 0,
        sequenceType: "recommendations",
      });

      const introText = conversationMemory.formatJobExplanation(firstJob, 0, recommendedJobs.length, false, "recommendations");
      echoTTS.speak(introText);
      conversationMemory.addExchange("recommendations", introText);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("echohire_assistant_message", {
            detail: { sender: "ai", text: introText },
          })
        );
      }
    }
  }, [recommendedJobs]);

  return (
    <div className="recommendations-page" role="region" aria-labelledby="recommend-heading">
      <div style={{ marginBottom: "28px" }}>
        <h1 id="recommend-heading" tabIndex={0} style={{ fontSize: "36px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          AI Job Recommendations
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          Personalized opportunities based on your skills, experience, and accessibility preferences.
        </p>
      </div>

      <div className="job-cards-container">
        {recommendedJobs.map((job, idx) => {
          const jobId = getJobId(job);
          return (
            <article
              key={jobId || job.title}
              className="job-card-accessible"
              tabIndex={0}
              aria-label={`Recommended Job: ${job.title} at ${job.company}, AI match score ${job.matchScore} percent`}
            >
              <div>
                <div className="job-card-header">
                  <div>
                    <h2 className="job-title" style={{ fontSize: "20px" }}>{job.title}</h2>
                    <div className="job-company-name">{job.company}</div>
                  </div>
                  <span className="badge-match">
                    <Sparkles size={13} />
                    <span>{job.matchScore}% Match</span>
                  </span>
                </div>

                <div className="job-card-details">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} color="#475569" />
                    <span><strong>Location:</strong> {job.location}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <IndianRupee size={15} color="#475569" />
                    <span><strong>Salary:</strong> {job.salary}</span>
                  </div>
                  {job.accommodations && (
                    <div className="badge-row" style={{ marginTop: "8px" }}>
                      {job.accommodations.map((acc, accIdx) => (
                        <span key={accIdx} className="badge-access">
                          {acc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="job-card-actions">
                <button
                  className="primary-btn"
                  onClick={() => {
                    if (jobId && onSelectJob) {
                      conversationMemory.sequenceType = "recommendations";
                      conversationMemory.setReferencedJob(job, idx);
                      onSelectJob(job);
                    }
                  }}
                >
                  <ExternalLink size={15} />
                  <span>View Details</span>
                </button>
                <button
                  className="btn-audio-listen"
                  onClick={() => speak(`Recommended job: ${job.title} at ${job.company} with ${job.matchScore} percent accessibility match score.`)}
                >
                  <Volume2 size={15} />
                  <span>Read Aloud</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
