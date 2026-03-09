import { useEffect, useState } from "react";
import { loadSocialMediaData } from "../services/socialMediaService";

export default function SocialMediaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const loaded = await loadSocialMediaData();
        setData(loaded);
      } catch (err) {
        setError(err?.message || "Failed to load social media metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = data?.metrics;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Social Media Tracker</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Live metrics from Post_Tracker, Followers_Growth, and Content_Calendar.
      </p>

      {loading && <p>Loading social media metrics...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && metrics && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 13, color: "#666" }}>Total posts logged</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalPosts}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 13, color: "#666" }}>Follower snapshots</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalFollowerSnapshots}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 13, color: "#666" }}>Content calendar items</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalCalendarItems}</div>
            </div>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 13, color: "#666" }}>Latest total followers</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalFollowersLatest}</div>
            </div>
          </section>

          <section style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Recent posts</h2>
              {metrics.recentPosts.length === 0 ? (
                <p style={{ marginBottom: 0 }}>No posts logged yet.</p>
              ) : (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {metrics.recentPosts.map((row, index) => (
                    <li key={`${row.date || "date"}-${row.topiccaption || row.topic || index}`} style={{ marginTop: 4 }}>
                      <strong>{row.brand || "Unknown brand"}</strong> on {row.platform || "Unknown platform"}: {row.topiccaption || row.topic || "Untitled post"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Latest follower snapshots by platform</h2>
              {metrics.latestSnapshotByPlatform.length === 0 ? (
                <p style={{ marginBottom: 0 }}>No follower snapshots yet.</p>
              ) : (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {metrics.latestSnapshotByPlatform.map((row, index) => (
                    <li key={`${row.platform || "platform"}-${index}`} style={{ marginTop: 4 }}>
                      <strong>{row.platform || "Unknown platform"}</strong> ({row.brand || "Unknown brand"}): {row.followers || "0"} followers
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Upcoming planned content</h2>
              {metrics.upcomingContent.length === 0 ? (
                <p style={{ marginBottom: 0 }}>No planned calendar content.</p>
              ) : (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {metrics.upcomingContent.map((row, index) => (
                    <li key={`${row.scheduleddate || "date"}-${index}`} style={{ marginTop: 4 }}>
                      <strong>{row.brand || "Unknown brand"}</strong> - {row.contenttype || "Content"} on {row.platform || "Unknown platform"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
