import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadSubmissions } from "../services/markingService";
import { loadPendingTutorReviews } from "../services/tutorReviewService";

export default function DashboardPage() {
  const [incomingAssignments, setIncomingAssignments] = useState([]);
  const [pendingTutorReviewsCount, setPendingTutorReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [submissionRows, tutorReviewRows] = await Promise.all([
          loadSubmissions(),
          loadPendingTutorReviews(),
        ]);

        setIncomingAssignments(submissionRows);
        setPendingTutorReviewsCount(tutorReviewRows.length);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const incomingAssignmentPreview = useMemo(
    () => incomingAssignments.slice(0, 5),
    [incomingAssignments],
  );

  return (
    <div style={{ padding: 16 }}>
      {loading && <p>Loading dashboard metrics...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <>
          <section style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Incoming assignments</div>
              <p style={{ margin: "8px 0 0" }}>
                {incomingAssignments.length > 0
                  ? `${incomingAssignments.length} assignment${incomingAssignments.length === 1 ? "" : "s"} awaiting admin review.`
                  : "No incoming assignments to review right now."}
              </p>
              {incomingAssignmentPreview.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {incomingAssignmentPreview.map((submission) => {
                    const studentName = submission.studentName || submission.studentCode || "Unknown student";
                    const title = submission.assignment || "Untitled assignment";

                    return (
                      <li key={submission.path || submission.id} style={{ marginTop: 4 }}>
                        <strong>{studentName}</strong>: {title}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/marking">Open marking queue</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Tutor review requests</div>
              <p style={{ margin: "8px 0 0" }}>
                {pendingTutorReviewsCount > 0
                  ? `${pendingTutorReviewsCount} tutor review message${pendingTutorReviewsCount === 1 ? "" : "s"} pending final review.`
                  : "No tutor review messages pending at the moment."}
              </p>
              <div style={{ marginTop: 8 }}>
                <Link to="/campus/tutor-marking">Open tutor marking</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Audit workspace</div>
              <p style={{ margin: "8px 0 0" }}>Audit pages have been retired.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
