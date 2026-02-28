import { useEffect, useMemo, useState } from "react";
import { loadAuditMetrics } from "../services/auditMetricsService";

function formatMoney(value) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(value || 0);
}

export default function ExpensesAuditPage() {
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
        setError(err?.message || "Failed to load expense audit data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nonZeroExpenses = useMemo(() => {
    if (!metrics) return [];
    return metrics.rows.filter((row) => row.expenseAmount > 0).sort((a, b) => b.expenseAmount - a.expenseAmount);
  }, [metrics]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Expense Audit</h2>
      <p style={{ marginTop: 8, color: "#4a5570" }}>Track recorded student-related expenses and their approval status.</p>
      {loading && <p>Loading expense records...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}
      {!loading && !error && metrics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <MetricCard label="Approved" value={metrics.expenses.approved} />
            <MetricCard label="Pending" value={metrics.expenses.pending} />
            <MetricCard label="Total expense" value={formatMoney(metrics.expenses.totalExpense)} />
          </div>

          <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Recorded expenses</h3>
            {nonZeroExpenses.length === 0 ? (
              <p style={{ marginBottom: 0 }}>No expense amounts are currently available in the sheet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {nonZeroExpenses.map((row) => (
                  <li key={`${row.studentCode}-${row.studentName}`} style={{ marginTop: 6 }}>
                    <strong>{row.studentName}</strong> — {formatMoney(row.expenseAmount)} ({row.expenseStatus})
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
