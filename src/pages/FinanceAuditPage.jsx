import { useEffect, useMemo, useState } from "react";
import { loadAuditMetrics } from "../services/auditMetricsService";

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

export default function FinanceAuditPage() {
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
        setError(err?.message || "Failed to load finance audit data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topOutstanding = useMemo(() => {
    if (!metrics) return [];
    return [...metrics.rows]
      .map((row) => ({ ...row, outstanding: Math.max(row.amountDue - row.amountPaid, 0) }))
      .filter((row) => row.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);
  }, [metrics]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Finance Audit</h2>
      <p style={{ marginTop: 8, color: "#4a5570" }}>Track fee collection status and identify students with outstanding balances.</p>
      {loading && <p>Loading finance records...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}
      {!loading && !error && metrics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <MetricCard label="Paid in full" value={metrics.finance.paid} />
            <MetricCard label="Partial payment" value={metrics.finance.partial} />
            <MetricCard label="Unpaid" value={metrics.finance.unpaid} />
            <MetricCard label="Total paid" value={formatMoney(metrics.finance.totalPaid)} />
            <MetricCard label="Outstanding" value={formatMoney(metrics.finance.outstanding)} />
          </div>

          <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Highest outstanding balances</h3>
            {topOutstanding.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No outstanding balances found in the published sheet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeader}>Student</th>
                    <th style={tableHeader}>Code</th>
                    <th style={tableHeader}>Status</th>
                    <th style={tableHeader}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {topOutstanding.map((row) => (
                    <tr key={`${row.studentCode}-${row.studentName}`}>
                      <td style={tableCell}>{row.studentName}</td>
                      <td style={tableCell}>{row.studentCode || "—"}</td>
                      <td style={tableCell}>{row.paymentStatus}</td>
                      <td style={tableCell}>{formatMoney(row.outstanding)}</td>
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

function MetricCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
      <div style={{ fontSize: 12, color: "#4a5570" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const tableHeader = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", fontSize: 13, color: "#4a5570" };
const tableCell = { borderBottom: "1px solid #eee", padding: "10px 6px", fontSize: 14 };
