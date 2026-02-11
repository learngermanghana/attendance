import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listClasses } from "../services/classesService";

export default function DashboardPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listClasses();
        setClasses(data);
      } catch (err) {
        setError(err?.message || "Failed to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><h2 style={{ margin: 0 }}>Classes</h2><Link to="/marking">Open marking console</Link></div>

      {loading && <p>Loading classes...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && classes.length === 0 && (
        <p>No classes found. Add documents in the <b>classes</b> collection or set classId/className on students.</p>
      )}

      <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        {classes.map((klass) => (
          <div key={klass.classId} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{klass.name}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>classId: {klass.classId}</div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/attendance/${encodeURIComponent(klass.classId)}`}>Mark attendance</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
