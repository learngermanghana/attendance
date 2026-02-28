import { useEffect, useMemo, useState } from "react";
import { loadAuditMetrics } from "../services/auditMetricsService";

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
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#4a5570" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>{value}</div>
    </div>
  );
}
