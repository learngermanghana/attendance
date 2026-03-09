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
