import { useEffect, useMemo, useState } from "react";
import { loadAuditMetrics } from "../services/auditMetricsService";

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

export default function ContractsAuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        setMetrics(await loadAuditMetrics());
      } catch (err) {
        setError(err?.message || "Failed to load contracts audit data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingRows = useMemo(() => {
    if (!metrics) return [];
    return metrics.rows.filter((row) => row.contractStatus !== "signed");
  }, [metrics]);

  const endingSoonRows = useMemo(() => {
    if (!metrics) return [];
    return metrics.rows
      .filter((row) => typeof row.contractEndDaysLeft === "number" && row.contractEndDaysLeft >= 0 && row.contractEndDaysLeft <= 30)
      .sort((a, b) => a.contractEndDaysLeft - b.contractEndDaysLeft)
      .slice(0, 15);
  }, [metrics]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Contracts Audit</h2>
      <p style={{ marginTop: 8, color: "#4a5570" }}>Review student contract completion and follow up on missing agreements.</p>
      {loading && <p>Loading contracts records...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}
      {!loading && !error && metrics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <MetricCard label="Signed" value={metrics.contracts.signed} />
            <MetricCard label="Pending" value={metrics.contracts.pending} />
            <MetricCard label="Missing" value={metrics.contracts.missing} />
            <MetricCard label="With start/end dates" value={metrics.contracts.withDates} />
            <MetricCard label="Ending in 30 days" value={metrics.contracts.endingIn30Days} />
            <MetricCard label="Expired" value={metrics.contracts.expired} />
          </div>

          <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Students requiring contract follow-up</h3>
            {pendingRows.length === 0 ? (
              <p style={{ marginBottom: 0 }}>All student contracts are marked as signed.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {pendingRows.map((row) => (
                  <li key={`${row.studentCode}-${row.studentName}`} style={{ marginTop: 6 }}>
                    <strong>{row.studentName}</strong> ({row.studentCode || "no code"}) — {row.contractStatus}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Contracts ending soon (next 30 days)</h3>
            {endingSoonRows.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No contract end dates within the next 30 days.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeader}>Student</th>
                    <th style={tableHeader}>Code</th>
                    <th style={tableHeader}>Contract Start</th>
                    <th style={tableHeader}>Contract End</th>
                    <th style={tableHeader}>Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {endingSoonRows.map((row) => (
                    <tr key={`${row.studentCode}-${row.studentName}-end`}>
                      <td style={tableCell}>{row.studentName}</td>
                      <td style={tableCell}>{row.studentCode || "—"}</td>
                      <td style={tableCell}>{formatDate(row.contractStart)}</td>
                      <td style={tableCell}>{formatDate(row.contractEnd)}</td>
                      <td style={tableCell}>{row.contractEndDaysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const tableHeader = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", fontSize: 13, color: "#4a5570" };
const tableCell = { borderBottom: "1px solid #eee", padding: "10px 6px", fontSize: 14 };

function MetricCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#4a5570" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>{value}</div>
    </div>
  );
}
