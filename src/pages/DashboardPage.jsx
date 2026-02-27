import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listClasses } from "../services/classesService";
import { loadSubmissions } from "../services/markingService";
import { loadPendingTutorReviews } from "../services/tutorReviewService";

export default function DashboardPage() {
  const [classes, setClasses] = useState([]);
  const [incomingAssignmentsCount, setIncomingAssignmentsCount] = useState(0);
  const [pendingTutorReviewsCount, setPendingTutorReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [classRows, submissionRows, tutorReviewRows] = await Promise.all([
          listClasses(),
          loadSubmissions(),
          loadPendingTutorReviews(),
        ]);

        setClasses(classRows);
        setIncomingAssignmentsCount(submissionRows.length);
        setPendingTutorReviewsCount(tutorReviewRows.length);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const totalClasses = classes.length;
    const namedClasses = classes.filter((klass) => Boolean(klass?.name)).length;

    return [
      { label: "Total classes", value: totalClasses },
      { label: "Named classes", value: namedClasses },
      { label: "Needs setup", value: Math.max(totalClasses - namedClasses, 0) },
    ];
  }, [classes]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/attendance">Go to attendance</Link>
          <Link to="/communication">Send broadcast</Link>
        </div>
      </div>

      {loading && <p>Loading dashboard metrics...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            {metrics.map((metric) => (
              <div key={metric.label} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#4a5570" }}>{metric.label}</div>
                <div style={{ fontWeight: 800, fontSize: 26, marginTop: 6 }}>{metric.value}</div>
              </div>
            ))}
          </div>

          <section style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Incoming assignments</div>
              <p style={{ margin: "8px 0 0" }}>
                {incomingAssignmentsCount > 0
                  ? `${incomingAssignmentsCount} assignment${incomingAssignmentsCount === 1 ? "" : "s"} awaiting admin review.`
                  : "No incoming assignments to review right now."}
              </p>
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
          </section>
        </>
      )}
    </div>
  );
}
