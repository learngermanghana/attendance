import { useEffect, useMemo, useState } from "react";
import { loadGrammarIssueReports } from "../services/grammarIssueService";

function formatDateTime(value) {
  if (!value) return "Unknown";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

export default function GrammarIssueReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await loadGrammarIssueReports();
        setReports(rows);
      } catch (err) {
        setError(err?.message || "Failed to load grammar issue reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const preview = useMemo(() => reports.slice(0, 100), [reports]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Grammar issue reports</h2>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        This page reads incoming learner grammar issue reports from Firestore collection <code>ai_issue_reports</code>.
      </p>

      {loading && <p>Loading grammar issue reports...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <>
          <p style={{ marginTop: 0 }}>
            {reports.length > 0
              ? `${reports.length} report${reports.length === 1 ? "" : "s"} found.`
              : "No grammar issue reports yet."}
          </p>

          {preview.length > 0 && (
            <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Student</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee" }}>Issue details</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((report) => {
                    const student = report.studentName || report.studentId || report.student_code || "Unknown";
                    const issueText = report.issue || report.description || report.text || report.message || "(No issue text)";

                    return (
                      <tr key={report.id}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f4f4f4", whiteSpace: "nowrap" }}>
                          {formatDateTime(report.createdAt)}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f4f4f4", whiteSpace: "nowrap" }}>
                          {student}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f4f4f4" }}>{issueText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
