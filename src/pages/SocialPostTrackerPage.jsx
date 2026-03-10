import { useEffect, useMemo, useState } from "react";
import { loadSocialMediaData } from "../services/socialMediaService";

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

export default function SocialPostTrackerPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      try {
        const socialMediaData = await loadSocialMediaData();
        setRows(socialMediaData.postTrackerRows || []);
      } catch (err) {
        setError(err?.message || "Failed to load Post_Tracker data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime();
      const bTime = new Date(b.date || 0).getTime();
      return bTime - aTime;
    });
  }, [rows]);

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
