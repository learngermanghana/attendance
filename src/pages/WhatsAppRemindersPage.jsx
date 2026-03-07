import { useEffect, useState } from "react";
import { formatDate, loadWhatsappReminderDashboard } from "../services/whatsappRemindersService";

const cardStyle = { border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "#fff" };

function DaysBadge({ value, soonThreshold = 3 }) {
  if (value == null) return <span>-</span>;

  let color = "#1f6feb";
  if (value < 0) color = "#a00000";
  else if (value <= soonThreshold) color = "#b35900";

  return <span style={{ color, fontWeight: 700 }}>{value}</span>;
}

export default function WhatsAppRemindersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unpaidStudents, setUnpaidStudents] = useState([]);
  const [contractEndingSoon, setContractEndingSoon] = useState([]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const data = await loadWhatsappReminderDashboard();
      setUnpaidStudents(data.unpaidStudents);
      setContractEndingSoon(data.contractEndingSoon);
    } catch (err) {
      setError(err?.message || "Failed to load reminder dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>WhatsApp Reminders</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Track students with outstanding balances and contracts ending soon.
          </p>
        </div>
        <button type="button" onClick={loadDashboard} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Students who still owe payment</h3>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Payment due date is calculated as contract start + 30 days.
        </p>

        {loading && <p>Loading unpaid students...</p>}
        {!loading && unpaidStudents.length === 0 && <p>No unpaid students found.</p>}

        {!loading && unpaidStudents.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  {[
                    "Name",
                    "Phone",
                    "Class",
                    "Paid",
                    "Balance",
                    "Contract Start",
                    "Contract End",
                    "Days to Payment Due",
                    "WhatsApp Message",
                  ].map((header) => (
                    <th key={header} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unpaidStudents.map((student) => (
                  <tr key={`${student.name}-${student.phone}-${student.contractStart?.toISOString() || "n/a"}`}>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.name}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.phone || "-"}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.className || student.location || "-"}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.paid || "-"}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.balance}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{formatDate(student.contractStart)}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{formatDate(student.contractEnd)}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                      <DaysBadge value={student.daysUntilPaymentDue} />
                    </td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0", maxWidth: 400 }}>{student.whatsappMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Contracts ending soon (next 10 days)</h3>

        {loading && <p>Loading contract expiry alerts...</p>}
        {!loading && contractEndingSoon.length === 0 && <p>No contracts ending in the next 10 days.</p>}

        {!loading && contractEndingSoon.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  {["Name", "Phone", "Class", "Contract End", "Days Left", "Balance"].map((header) => (
                    <th key={header} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractEndingSoon.map((student) => (
                  <tr key={`${student.name}-${student.phone}-contract`}> 
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.name}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.phone || "-"}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.className || student.location || "-"}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{formatDate(student.contractEnd)}</td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                      <DaysBadge value={student.daysUntilContractEnd} soonThreshold={7} />
                    </td>
                    <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{student.balance}</td>
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
