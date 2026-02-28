import { useEffect, useMemo, useState } from "react";
import { loadExpenseRows, saveExpenseRow } from "../services/expensesSheetService";

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesAuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ type: "", item: "", amount: "", date: today() });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  async function refreshRows() {
    setLoading(true);
    setError("");
    try {
      setRows(await loadExpenseRows());
    } catch (err) {
      setError(err?.message || "Failed to load expenses data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshRows();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += row.amount;
        acc.count += 1;
        return acc;
      },
      { total: 0, count: 0 }
    );
  }, [rows]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const receipt = await saveExpenseRow(form);
      setSaveMessage(receipt.message || "Saved.");
      setForm({ type: "", item: "", amount: "", date: today() });
      await refreshRows();
    } catch (err) {
      setSaveError(err?.message || "Failed to save expense row");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Expense Audit</h2>
      <p style={{ marginTop: 8, color: "#4a5570" }}>Read and save expense entries synced with your Google Sheet.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard label="Rows" value={totals.count} />
        <MetricCard label="Total amount" value={formatMoney(totals.total)} />
      </div>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Add expense</h3>
        <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Type</span>
            <input name="type" value={form.type} onChange={onChange} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Item</span>
            <input name="item" value={form.item} onChange={onChange} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Amount</span>
            <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Date</span>
            <input name="date" type="date" value={form.date} onChange={onChange} required />
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="submit" disabled={saving} style={{ minHeight: 36 }}>
              {saving ? "Saving..." : "Save to sheet"}
            </button>
          </div>
        </form>
        {saveMessage && <p style={{ marginBottom: 0, color: "#0a6" }}>✅ {saveMessage}</p>}
        {saveError && <p style={{ marginBottom: 0, color: "#a00000" }}>❌ {saveError}</p>}
      </section>

      <section style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Sheet entries</h3>
        {loading && <p>Loading expense records...</p>}
        {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}
        {!loading && !error && rows.length === 0 && <p style={{ marginBottom: 0 }}>No expenses found in the sheet.</p>}
        {!loading && !error && rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Item</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Date</TableHeader>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.type}-${row.item}-${row.date}-${index}`}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell>{formatMoney(row.amount)}</TableCell>
                    <TableCell>{row.date}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

function TableHeader({ children }) {
  return <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>{children}</th>;
}

function TableCell({ children }) {
  return <td style={{ borderBottom: "1px solid #eee", padding: "8px 6px" }}>{children}</td>;
}
