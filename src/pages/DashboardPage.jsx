import { Link } from "react-router-dom";

export default function DashboardPage() {
  // Quick starter: put your class names here (later we’ll fetch from Firestore)
  const classes = [
    "A1 Berlin Klasse",
    "A2 Morning",
    "A2–B1 Track",
  ];

  return (
    <div style={{ padding: 16 }}>
      <h2>Classes</h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        {classes.map((c) => (
          <div key={c} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{c}</div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/attendance/${encodeURIComponent(c)}`}>Mark attendance</Link>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Next: fetch class list from Firestore or auto-build from students collection.
      </p>
    </div>
  );
}
