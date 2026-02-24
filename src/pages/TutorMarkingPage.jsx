import { useEffect, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { loadPendingTutorReviews, saveTutorReviewResponse } from "../services/tutorReviewService.js";

function extractText(review, keys) {
  for (const key of keys) {
    const value = review?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function formatTimestamp(value) {
  if (!value) return "—";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

export default function TutorMarkingPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [savingId, setSavingId] = useState("");
  const [statusById, setStatusById] = useState({});
  const [feedbackById, setFeedbackById] = useState({});

  const sortedReviews = useMemo(() => {
    return [...pendingReviews].sort((a, b) => {
      const aMillis = a?.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0;
      const bMillis = b?.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0;
      return bMillis - aMillis;
    });
  }, [pendingReviews]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await loadPendingTutorReviews();
        setPendingReviews(rows);
        setStatusById(Object.fromEntries(rows.map((row) => [row.id, "approved"])));
      } catch (err) {
        error(err?.message || "Failed to load pending tutor reviews.");
      } finally {
        setLoading(false);
      }
    })();
  }, [error]);

  const handleSubmit = async (reviewId) => {
    const reviewStatus = statusById[reviewId] || "approved";
    const tutorFeedback = feedbackById[reviewId] || "";

    try {
      setSavingId(reviewId);
      await saveTutorReviewResponse({ reviewId, reviewStatus, tutorFeedback });
      setPendingReviews((prev) => prev.filter((review) => review.id !== reviewId));
      success("Tutor review response saved.");
    } catch (err) {
      error(err?.message || "Failed to save tutor response.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h2>Tutor Marking Queue</h2>
      <p style={{ marginTop: -8, opacity: 0.8 }}>
        Review pending writing submissions, choose a final status, and save tutor feedback for the student.
      </p>

      {loading && <p>Loading pending tutor reviews...</p>}

      {!loading && sortedReviews.length === 0 && (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <p style={{ margin: 0 }}>No pending reviews found in examTutorReviewQueue.</p>
        </section>
      )}

      {sortedReviews.map((review) => {
        const studentDraft = extractText(review, ["studentDraft", "draftText", "originalDraft"]);
        const aiFeedback = extractText(review, ["aiFeedback", "feedback", "aiReviewFeedback"]);
        const revisedDraft = extractText(review, ["revisedDraft", "improvedDraft", "rewrittenDraft"]);

        return (
          <section key={review.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              <b>Review ID:</b> {review.id} · <b>Student:</b> {review.studentName || review.studentId || "Unknown"} · <b>Updated:</b>{" "}
              {formatTimestamp(review.updatedAt)}
            </div>

            <label>
              Student draft
              <textarea readOnly rows={6} value={studentDraft || "No student draft found."} />
            </label>

            <label>
              AI feedback
              <textarea readOnly rows={5} value={aiFeedback || "No AI feedback found."} />
            </label>

            <label>
              Revised draft
              <textarea readOnly rows={6} value={revisedDraft || "No revised draft found."} />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <label>
                Status
                <select
                  value={statusById[review.id] || "approved"}
                  onChange={(e) => setStatusById((prev) => ({ ...prev, [review.id]: e.target.value }))}
                >
                  <option value="approved">approved</option>
                  <option value="needs_improvement">needs_improvement</option>
                </select>
              </label>

              <label>
                Tutor feedback
                <textarea
                  rows={5}
                  placeholder="Add tutor comments for the student..."
                  value={feedbackById[review.id] || ""}
                  onChange={(e) => setFeedbackById((prev) => ({ ...prev, [review.id]: e.target.value }))}
                />
              </label>
            </div>

            <div>
              <button onClick={() => handleSubmit(review.id)} disabled={savingId === review.id}>
                {savingId === review.id ? "Saving..." : "Save tutor response"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
