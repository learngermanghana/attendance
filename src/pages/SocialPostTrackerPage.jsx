import { useEffect, useMemo, useState } from "react";
import { loadSocialMediaData, saveSocialMediaEntry } from "../services/socialMediaService";

const FORM_FIELDS = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "brand", label: "Brand", placeholder: "Falowen", required: true },
  { key: "platform", label: "Platform", placeholder: "Instagram", required: true },
  { key: "contentType", label: "Content Type", placeholder: "Reel / Story / Post" },
  { key: "topic", label: "Topic", placeholder: "Classroom tips" },
  { key: "format", label: "Format", placeholder: "Video / Carousel" },
  { key: "account", label: "Account", placeholder: "@falowen_english" },
  { key: "time", label: "Time", type: "time" },
  { key: "likes", label: "Likes", type: "number", min: 0 },
  { key: "comments", label: "Comments", type: "number", min: 0 },
  { key: "shares", label: "Shares", type: "number", min: 0 },
  { key: "reach", label: "Reach", type: "number", min: 0 },
];

const INITIAL_FORM = FORM_FIELDS.reduce((accumulator, field) => {
  accumulator[field.key] = "";
  return accumulator;
}, {});

function MetricCard({ label, value }) {
  return (
    <div style={{ border: "1px solid #dce2ef", borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 13, color: "#57627a" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function SocialPostTrackerPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [savedRows, setSavedRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState("");
  const [sheetMetrics, setSheetMetrics] = useState(null);

  const canSubmit = useMemo(() => {
    return Boolean(form.date && form.brand && form.platform && !saving);
  }, [form, saving]);

  async function refreshMetrics() {
    setSheetLoading(true);
    setSheetError("");

    try {
      const data = await loadSocialMediaData();
      setSheetMetrics(data.metrics || null);
    } catch (metricsError) {
      setSheetError(metricsError?.message || "Failed to load sheet metrics.");
    } finally {
      setSheetLoading(false);
    }
  }

  useEffect(() => {
    refreshMetrics();
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.date || !form.brand || !form.platform) {
      setError("Please fill in Date, Brand, and Platform before saving.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        likes: form.likes ? Number(form.likes) : "",
        comments: form.comments ? Number(form.comments) : "",
        shares: form.shares ? Number(form.shares) : "",
        reach: form.reach ? Number(form.reach) : "",
      };

      await saveSocialMediaEntry(payload);
      setSavedRows((current) => [payload, ...current]);
      setMessage("Saved! The row was sent to Google Sheets webhook.");
      resetForm();
      await refreshMetrics();
    } catch (submissionError) {
      setError(submissionError?.message || "Failed to save row.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000 }}>
      <h1 style={{ marginTop: 0 }}>Social Media Tracker</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Add a post entry and press <strong>Save to Google Sheet</strong>.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {FORM_FIELDS.map((field) => (
            <label key={field.key} style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <span>{field.label}</span>
              <input
                type={field.type || "text"}
                value={form[field.key]}
                placeholder={field.placeholder || ""}
                required={Boolean(field.required)}
                min={field.min}
                onChange={(event) => updateField(field.key, event.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #cdd3df",
                  fontSize: 14,
                }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              border: "none",
              padding: "10px 14px",
              borderRadius: 8,
              background: canSubmit ? "#1f5eff" : "#9fb5ff",
              color: "#fff",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving..." : "Save to Google Sheet"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            style={{ border: "1px solid #cdd3df", padding: "10px 14px", borderRadius: 8, background: "#fff" }}
          >
            Clear form
          </button>
        </div>
      </form>

      {message && <p style={{ color: "#067d32", marginTop: 12 }}>✅ {message}</p>}
      {error && <p style={{ color: "#a00000", marginTop: 12 }}>❌ {error}</p>}

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ marginBottom: 8 }}>Metrics from sheet</h2>
          <button
            type="button"
            onClick={refreshMetrics}
            disabled={sheetLoading}
            style={{ border: "1px solid #cdd3df", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            {sheetLoading ? "Refreshing..." : "Refresh metrics"}
          </button>
        </div>

        {sheetLoading && <p style={{ color: "#666" }}>Loading metrics...</p>}
        {sheetError && <p style={{ color: "#a00000" }}>❌ {sheetError}</p>}

        {!sheetLoading && !sheetError && sheetMetrics && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <MetricCard label="Total Posts" value={sheetMetrics.totalPosts || 0} />
              <MetricCard label="Follower Snapshots" value={sheetMetrics.totalFollowerSnapshots || 0} />
              <MetricCard label="Calendar Items" value={sheetMetrics.totalCalendarItems || 0} />
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Latest snapshot by platform</h3>
              {sheetMetrics.latestSnapshotByPlatform?.length ? (
                <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
                    <thead>
                      <tr style={{ background: "#f7f9ff" }}>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Platform</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Followers</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetMetrics.latestSnapshotByPlatform.map((row, index) => (
                        <tr key={`${row.platform || "unknown"}-${index}`}>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.platform || "—"}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.followers || "—"}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.date || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#666" }}>No platform snapshot rows yet.</p>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Recent posts</h3>
              {sheetMetrics.recentPosts?.length ? (
                <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: "#f7f9ff" }}>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Date</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Brand</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Platform</th>
                        <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetMetrics.recentPosts.map((row, index) => (
                        <tr key={`${row.date || "unknown"}-${row.platform || "unknown"}-${index}`}>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.date || "—"}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.brand || "—"}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.platform || "—"}</td>
                          <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.topic || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "#666" }}>No recent post rows yet.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Saved in this session</h2>
        {savedRows.length === 0 ? (
          <p style={{ color: "#666" }}>No rows saved yet.</p>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f7f9ff" }}>
                  {FORM_FIELDS.map((field) => (
                    <th key={field.key} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {savedRows.map((row, index) => (
                  <tr key={`${row.date}-${row.platform}-${index}`}>
                    {FORM_FIELDS.map((field) => (
                      <td key={field.key} style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        {row[field.key] || "—"}
                      </td>
                    ))}
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
