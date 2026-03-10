import { useEffect, useMemo, useState } from "react";
import { loadPostTrackerRows } from "../services/socialMediaService";

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "brand", label: "Brand" },
  { key: "platform", label: "Platform" },
  { key: "contenttype", label: "Content Type" },
  { key: "topic", label: "Topic" },
  { key: "format", label: "Format" },
  { key: "account", label: "Account" },
  { key: "time", label: "Time" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "reach", label: "Reach" },
];

function rowHasVisibleData(row) {
  return COLUMNS.some((column) => String(row[column.key] || "").trim().length > 0);
}

function parseDateValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return 0;

  const direct = new Date(trimmed).getTime();
  if (!Number.isNaN(direct)) return direct;

  const parts = trimmed.split(/[/-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map((part) => Number(part));
    if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(y)) {
      return new Date(y, m - 1, d).getTime();
    }
  }

  return 0;
}

export default function SocialPostTrackerPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const postTrackerRows = await loadPostTrackerRows();
        setRows(postTrackerRows || []);
      } catch (err) {
        setError(err?.message || "Failed to load Post_Tracker data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleRows = useMemo(() => rows.filter(rowHasVisibleData), [rows]);

  const sortedRows = useMemo(() => {
    return [...visibleRows].sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
  }, [visibleRows]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Post Tracker</h1>
      <p style={{ marginTop: 0, color: "#555" }}>Live data from the published Google Sheet tab: Post_Tracker.</p>

      {loading && <p>Loading Post_Tracker data...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <>
          <p style={{ marginBottom: 12 }}>
            Showing <strong>{sortedRows.length}</strong> post{sortedRows.length === 1 ? "" : "s"}.
          </p>

          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f6f7fb" }}>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", whiteSpace: "nowrap" }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => {
                  const rowKey = `${row.date || "unknown"}-${row.platform || "unknown"}-${index}`;
                  return (
                    <tr key={rowKey}>
                      {COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          style={{ padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" }}
                        >
                          {row[column.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
