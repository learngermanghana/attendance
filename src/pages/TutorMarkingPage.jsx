import { useEffect, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteTutorReview, loadPendingTutorReviews, saveTutorReviewResponse } from "../services/tutorReviewService.js";

const AUTOSAVE_KEY = "tutorMarkingDrafts.v1";
const FEEDBACK_SNIPPETS = [
  {
    key: "template_enquiry_opening",
    label: "Template 1: Enquiry opening",
    text: "Use this opening for enquiries: \"Ich schreibe Ihnen, weil ich eine Anfrage stellen möchte.\"",
  },
  {
    key: "template_cancellation_opening",
    label: "Template 2: Appointment cancellation opening",
    text: "Use this opening to cancel an appointment: \"Ich schreibe Ihnen, weil ich den Termin absagen möchte.\"",
  },
  {
    key: "template_enquiry_body",
    label: "Template 3: Enquiry body (always ask price/payment)",
    text: "For enquiries (hotel/school booking), include: \"Wie viel kostet das?\" \"Wie kann ich bezahlen? Mit Kreditkarte oder bar?\"",
  },
  {
    key: "weil_rule",
    label: "Template 4: Weil rule",
    text: "With \"weil\", put the conjugated verb at the end: \"..., weil ich eine Anfrage stellen möchte.\"",
  },
  {
    key: "statement_rule",
    label: "Template 5: Statement word order",
    text: "Statement rule: Subject + Verb + Time + Other details. Example: \"Ich lerne morgen in der Schule Deutsch.\"",
  },
  {
    key: "modal_verb_rule",
    label: "Template 6: Modal verb rule (fill-in)",
    text: "Modal verb rule: Subject + modal verb + object/details + infinitive (at the end). Fill-in: \"Ich [modal verb] [object] [infinitive].\" Example: \"Ich möchte den Kurs buchen.\"",
  },
  {
    key: "w_question_rule",
    label: "Template 7: W-question rule (fill-in)",
    text: "W-question rule: Question word + Verb + Subject + ... ? Fill-in: \"[W-word] [verb] [subject] ... ?\" Example: \"Wann beginnt der Kurs?\"",
  },
  {
    key: "yes_no_question_rule",
    label: "Template 8: Yes/No question rule (fill-in)",
    text: "Yes/No question rule: Verb + Subject + ... ? Fill-in: \"[Verb] [subject] ... ?\" Example: \"Haben Sie morgen Zeit?\"",
  },
  {
    key: "course_start_question",
    label: "Template 9: Ask when the course starts",
    text: "Use: \"Wann fängt der Kurs an?\"",
  },
  {
    key: "polite_info_request",
    label: "Template 10: Polite information request",
    text: "Use: \"Könnten Sie Informationen über + [topic] geben?\" Example: \"Könnten Sie Informationen über die Adresse geben?\"",
  },
];

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

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getNewReplies(review) {
  const lastTutorActionMillis = toMillis(review?.reviewedAt);
  const replies = Array.isArray(review?.studentReplies) ? review.studentReplies : [];
  return replies.filter((reply) => toMillis(reply?.createdAt) > lastTutorActionMillis);
}

function getWordCount(text) {
  const normalized = String(text || "").trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

function getReadingTimeText(text) {
  const words = getWordCount(text);
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${words} words · ~${mins} min read`;
}

function getActionableHint(feedback) {
  const normalized = String(feedback || "").trim();
  if (!normalized) return "Add at least one actionable suggestion for the student.";
  if (normalized.length < 50) return "Try adding specific next steps (what to change + where).";
  if (!/[.!?]/.test(normalized)) return "Use complete sentences so students can follow your guidance clearly.";
  return "Looks good — your feedback includes actionable guidance.";
}

function getReviewHistory(review) {
  if (Array.isArray(review?.reviewHistory) && review.reviewHistory.length) {
    return review.reviewHistory;
  }

  const fallback = [];
  if (review?.reviewedAt || review?.reviewStatus || review?.tutorFeedback) {
    fallback.push({
      reviewedAt: review.reviewedAt,
      reviewStatus: review.reviewStatus,
      tutorFeedback: review.tutorFeedback,
      reviewerName: review.reviewerName || "Tutor",
    });
  }
  return fallback;
}

function loadAutosavedDrafts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Ignore malformed local cache.
  }
  return {};
}

export default function TutorMarkingPage() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [recentlyResponded, setRecentlyResponded] = useState([]);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [saveStateById, setSaveStateById] = useState({});
  const [statusById, setStatusById] = useState({});
  const [feedbackById, setFeedbackById] = useState({});
  const [activeReviewId, setActiveReviewId] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");

  const sortedReviews = useMemo(() => {
    return [...pendingReviews].sort((a, b) => toMillis(b?.updatedAt) - toMillis(a?.updatedAt));
  }, [pendingReviews]);

  const filteredReviews = useMemo(() => {
    const now = Date.now();
    return sortedReviews.filter((review) => {
      const reviewSource = review?.source || "unknown";
      if (sourceFilter !== "all" && reviewSource !== sourceFilter) return false;

      const ageMillis = now - toMillis(review?.updatedAt);
      if (ageFilter === "older_24h" && ageMillis < 24 * 60 * 60 * 1000) return false;

      const replies = Array.isArray(review?.studentReplies) ? review.studentReplies : [];
      const hasNewReplies = getNewReplies(review).length > 0;
      if (followUpFilter === "has_followup" && replies.length === 0) return false;
      if (followUpFilter === "no_followup" && replies.length > 0) return false;
      if (followUpFilter === "unread_followup" && !hasNewReplies) return false;

      return true;
    });
  }, [sortedReviews, sourceFilter, ageFilter, followUpFilter]);

  const sourceOptions = useMemo(() => {
    const allSources = new Set(sortedReviews.map((r) => r?.source || "unknown"));
    return ["all", ...Array.from(allSources)];
  }, [sortedReviews]);

  const activeIndex = filteredReviews.findIndex((review) => review.id === activeReviewId);
  const activeReview = activeIndex >= 0 ? filteredReviews[activeIndex] : filteredReviews[0] || null;

  const queueStats = useMemo(() => {
    if (sortedReviews.length === 0) {
      return { pending: 0, oldestHours: 0, unassigned: 0, assigned: 0 };
    }
    const now = Date.now();
    const oldestMillis = Math.min(...sortedReviews.map((review) => toMillis(review?.updatedAt) || now));
    const oldestHours = Math.max(0, Math.floor((now - oldestMillis) / (1000 * 60 * 60)));
    const assigned = sortedReviews.filter((review) => !!review?.assignedTutorId || !!review?.assignedTutorName).length;
    return {
      pending: sortedReviews.length,
      oldestHours,
      assigned,
      unassigned: sortedReviews.length - assigned,
    };
  }, [sortedReviews]);

  const waitingOnTutorCount = useMemo(
    () => sortedReviews.filter((review) => getNewReplies(review).length > 0).length,
    [sortedReviews],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await loadPendingTutorReviews();
        const drafts = loadAutosavedDrafts();
        setPendingReviews(rows);
        setStatusById(Object.fromEntries(rows.map((row) => [row.id, "approved"])));
        const seededFeedback = {};
        rows.forEach((row) => {
          if (typeof drafts[row.id] === "string") {
            seededFeedback[row.id] = drafts[row.id];
          }
        });
        setFeedbackById(seededFeedback);
        if (rows[0]?.id) {
          setActiveReviewId(rows[0].id);
        }
      } catch (err) {
        error(err?.message || "Failed to load pending tutor reviews.");
      } finally {
        setLoading(false);
      }
    })();
  }, [error]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const hasUnsavedDraft = Object.values(feedbackById).some((value) => String(value || "").trim().length > 0);
      if (!hasUnsavedDraft) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [feedbackById]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(feedbackById));
      } catch {
        // Ignore localStorage quota issues.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [feedbackById]);

  useEffect(() => {
    if (!activeReview && filteredReviews[0]?.id) {
      setActiveReviewId(filteredReviews[0].id);
    }
  }, [activeReview, filteredReviews]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!filteredReviews.length) return;
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key.toLowerCase() === "j" && activeIndex < filteredReviews.length - 1) {
        event.preventDefault();
        setActiveReviewId(filteredReviews[activeIndex + 1].id);
      }
      if (event.key.toLowerCase() === "k" && activeIndex > 0) {
        event.preventDefault();
        setActiveReviewId(filteredReviews[activeIndex - 1].id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, filteredReviews]);

  const handleSubmit = async (reviewId, options = { moveNext: false }) => {
    const reviewStatus = statusById[reviewId] || "approved";
    const tutorFeedback = feedbackById[reviewId] || "";

    try {
      setSavingId(reviewId);
      setSaveStateById((prev) => ({ ...prev, [reviewId]: "saving" }));
      await saveTutorReviewResponse({
        reviewId,
        reviewStatus,
        tutorFeedback,
        reviewedByUid: user?.uid,
        reviewedByName: user?.displayName || user?.email || "Tutor",
      });
      setPendingReviews((prev) => prev.filter((review) => review.id !== reviewId));
      setRecentlyResponded((prev) => {
        const existing = prev.filter((item) => item.id !== reviewId);
        return [
          {
            id: reviewId,
            studentName: activeReview?.studentName || activeReview?.studentId || "Unknown",
            reviewStatus,
            respondedAt: new Date(),
          },
          ...existing,
        ].slice(0, 6);
      });
      setFeedbackById((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      setSaveStateById((prev) => ({ ...prev, [reviewId]: "saved" }));
      success("Tutor review response saved.");

      if (options.moveNext) {
        const currentIndex = filteredReviews.findIndex((review) => review.id === reviewId);
        const nextReview = filteredReviews[currentIndex + 1] || filteredReviews[currentIndex - 1] || null;
        setActiveReviewId(nextReview?.id || "");
      }
    } catch (err) {
      setSaveStateById((prev) => ({ ...prev, [reviewId]: "failed" }));
      error(err?.message || "Failed to save tutor response.");
    } finally {
      setSavingId("");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm("Delete this queue item? This cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingId(reviewId);
      await deleteTutorReview(reviewId);
      setPendingReviews((prev) => prev.filter((review) => review.id !== reviewId));
      setFeedbackById((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      success("Queue item deleted.");

      const currentIndex = filteredReviews.findIndex((review) => review.id === reviewId);
      const nextReview = filteredReviews[currentIndex + 1] || filteredReviews[currentIndex - 1] || null;
      setActiveReviewId(nextReview?.id || "");
    } catch (err) {
      error(err?.message || "Failed to delete queue item.");
    } finally {
      setDeletingId("");
    }
  };

  const handleInsertSnippet = (reviewId, snippetText) => {
    setFeedbackById((prev) => {
      const current = prev[reviewId] || "";
      const spacer = current.trim() ? "\n\n" : "";
      return { ...prev, [reviewId]: `${current}${spacer}${snippetText}` };
    });
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h2>Tutor Marking Queue</h2>
      <p style={{ marginTop: -8, opacity: 0.8 }}>
        Review actionable tutor threads (pending status, new student follow-ups, or campus-writing reflection requests),
        then save your tutor response.
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
        <b>Queue overview</b>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <span>Pending: <b>{queueStats.pending}</b></span>
          <span>Waiting on tutor: <b>{waitingOnTutorCount}</b></span>
          <span>Oldest item age: <b>{queueStats.oldestHours}h</b></span>
          <span>Assigned: <b>{queueStats.assigned}</b></span>
          <span>Unassigned: <b>{queueStats.unassigned}</b></span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <label>
            Source
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} style={{ marginLeft: 6 }}>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label>
            Age
            <select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)} style={{ marginLeft: 6 }}>
              <option value="all">all</option>
              <option value="older_24h">&gt;24h</option>
            </select>
          </label>

          <label>
            Follow-up
            <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)} style={{ marginLeft: 6 }}>
              <option value="all">all</option>
              <option value="has_followup">has student follow-up</option>
              <option value="no_followup">no student follow-up</option>
              <option value="unread_followup">new unread follow-up</option>
            </select>
          </label>
        </div>
      </section>

      {loading && <p>Loading pending tutor reviews...</p>}

      {!loading && filteredReviews.length === 0 && (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <p style={{ margin: 0 }}>No actionable reviews found for the current filter set.</p>
        </section>
      )}

      {recentlyResponded.length > 0 && (
        <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 6 }}>
          <b>Recently responded</b>
          {recentlyResponded.map((item) => (
            <div key={`responded-${item.id}`} style={{ fontSize: 13, opacity: 0.9 }}>
              {item.studentName} · {item.reviewStatus} · {formatTimestamp(item.respondedAt)}
            </div>
          ))}
        </section>
      )}

      {!loading && activeReview && (() => {
        const review = activeReview;
        const studentDraft = extractText(review, ["studentDraft", "draftText", "originalDraft"]);
        const aiFeedback = extractText(review, ["aiFeedback", "feedback", "aiReviewFeedback"]);
        const revisedDraft = extractText(review, ["revisedDraft", "improvedDraft", "rewrittenDraft"]);
        const reflection = extractText(review, ["reflection"]);
        const studentReplies = Array.isArray(review.studentReplies) ? [...review.studentReplies] : [];
        const unreadReplyCount = getNewReplies(review).length;
        const currentStatus = statusById[review.id] || "approved";
        const currentFeedback = feedbackById[review.id] || "";
        const canMovePrev = activeIndex > 0;
        const canMoveNext = activeIndex < filteredReviews.length - 1;
        const history = getReviewHistory(review);

        studentReplies.sort((a, b) => toMillis(b?.createdAt) - toMillis(a?.createdAt));

        return (
          <section key={review.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ position: "sticky", top: 8, background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 10, zIndex: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  <b>Review ID:</b> {review.id} · <b>Student:</b> {review.studentName || review.studentId || "Unknown"} · <b>Updated:</b>{" "}
                  {formatTimestamp(review.updatedAt)} · <b>Source:</b> {review.source || "—"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setActiveReviewId(filteredReviews[activeIndex - 1]?.id)} disabled={!canMovePrev}>Previous (K)</button>
                  <button onClick={() => setActiveReviewId(filteredReviews[activeIndex + 1]?.id)} disabled={!canMoveNext}>Next (J)</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#1e3a8a", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 999, padding: "2px 8px" }}>Queue item {activeIndex + 1} / {filteredReviews.length}</span>
                {unreadReplyCount > 0 && (
                  <span style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                    awaiting tutor response · {unreadReplyCount} new reply{unreadReplyCount > 1 ? "ies" : ""}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div role="radiogroup" aria-label="Review status" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { value: "approved", label: "Approved" },
                    { value: "needs_improvement", label: "Needs improvement" },
                  ].map((option) => {
                    const selected = currentStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setStatusById((prev) => ({ ...prev, [review.id]: option.value }))}
                        style={{
                          borderRadius: 999,
                          border: selected
                            ? option.value === "approved"
                              ? "2px solid #15803d"
                              : "2px solid #b45309"
                            : "1px solid #94a3b8",
                          background: selected
                            ? option.value === "approved"
                              ? "#dcfce7"
                              : "#fef3c7"
                            : "#f8fafc",
                          color: selected
                            ? option.value === "approved"
                              ? "#166534"
                              : "#92400e"
                            : "#0f172a",
                          fontWeight: selected ? 700 : 500,
                          padding: "6px 12px",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {currentStatus === "needs_improvement" && (
                  <p style={{ margin: 0, fontSize: 13, color: "#854d0e" }}>
                    Support prompt: please include at least one actionable suggestion so the student knows exactly what to revise.
                  </p>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => handleSubmit(review.id)}
                    disabled={savingId === review.id || deletingId === review.id}
                    style={{ background: "#1d4ed8", color: "#fff", border: "1px solid #1e40af" }}
                  >
                    {savingId === review.id ? "Saving..." : "Save tutor response"}
                  </button>
                  <button
                    onClick={() => handleSubmit(review.id, { moveNext: true })}
                    disabled={savingId === review.id || deletingId === review.id}
                    style={{ background: "#4338ca", color: "#fff", border: "1px solid #3730a3" }}
                  >
                    {savingId === review.id ? "Saving..." : "Save + Next"}
                  </button>
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    disabled={savingId === review.id || deletingId === review.id}
                    style={{ background: "#dc2626", color: "#fff", border: "1px solid #991b1b" }}
                  >
                    {deletingId === review.id ? "Deleting..." : "Delete submission"}
                  </button>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>
                    {saveStateById[review.id] === "saving" && "Saving..."}
                    {saveStateById[review.id] === "saved" && "Saved"}
                    {saveStateById[review.id] === "failed" && "Save failed — Retry"}
                    {!saveStateById[review.id] && "Autosave draft enabled"}
                  </span>
                </div>
                {savingId === review.id && (
                  <p style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
                    Marking response and closing this thread from the waiting list...
                  </p>
                )}
              </div>
            </div>

            <label>
              Student draft <span style={{ opacity: 0.7, fontSize: 12 }}>({getReadingTimeText(studentDraft)})</span>
              <textarea readOnly rows={8} value={studentDraft || "No student draft found."} />
            </label>

            <label>
              AI feedback
              <textarea readOnly rows={5} value={aiFeedback || "No AI feedback found."} />
            </label>

            <label>
              Revised draft <span style={{ opacity: 0.7, fontSize: 12 }}>({getReadingTimeText(revisedDraft)})</span>
              <textarea readOnly rows={8} value={revisedDraft || "No revised draft found."} />
            </label>

            <label>
              Reflection / question
              <textarea readOnly rows={4} value={reflection || "No reflection question found."} />
            </label>

            <div style={{ display: "grid", gap: 6 }}>
              <b>Student follow-up replies ({studentReplies.length})</b>
              {studentReplies.length === 0 && <p style={{ margin: 0, opacity: 0.75 }}>No student replies yet.</p>}
              {studentReplies.map((reply, index) => {
                const isUnread = toMillis(reply?.createdAt) > toMillis(review?.reviewedAt);
                const hiddenByDefault = index > 1;
                return (
                  <details key={`${review.id}-reply-${index}`} open={!hiddenByDefault}>
                    <summary style={{ cursor: "pointer" }}>
                      {(reply?.studentName || "Student")} ({reply?.studentCode || "—"}) · {formatTimestamp(reply?.createdAt)} {isUnread ? "· NEW" : ""}
                    </summary>
                    <article style={{ border: "1px solid #eee", borderRadius: 6, padding: 8, marginTop: 6, background: isUnread ? "#fffbeb" : "transparent" }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{reply?.message || "(empty message)"}</div>
                    </article>
                  </details>
                );
              })}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label>
                Tutor feedback
                <textarea
                  rows={6}
                  placeholder="Add tutor comments for the student..."
                  aria-label="Tutor feedback"
                  value={currentFeedback}
                  onChange={(e) => {
                    setFeedbackById((prev) => ({ ...prev, [review.id]: e.target.value }));
                    setSaveStateById((prev) => ({ ...prev, [review.id]: "" }));
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {FEEDBACK_SNIPPETS.map((snippet) => (
                  <button key={snippet.key} onClick={() => handleInsertSnippet(review.id, snippet.text)}>
                    + {snippet.label}
                  </button>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{getActionableHint(currentFeedback)}</p>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
              <b>Review history</b>
              {history.length === 0 && <p style={{ margin: 0, opacity: 0.75 }}>No prior history available for this thread.</p>}
              {history.map((item, idx) => (
                <div key={`${review.id}-hist-${idx}`} style={{ borderLeft: "2px solid #ddd", paddingLeft: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {formatTimestamp(item?.reviewedAt)} · {item?.reviewerName || "Tutor"} · {item?.reviewStatus || "status unavailable"}
                  </div>
                  {item?.tutorFeedback && <div style={{ marginTop: 3, whiteSpace: "pre-wrap" }}>{item.tutorFeedback}</div>}
                </div>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
