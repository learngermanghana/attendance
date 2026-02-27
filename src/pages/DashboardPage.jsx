import { useEffect, useMemo, useState } from "react";
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
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const totalClasses = classes.length;
    const namedClasses = classes.filter((klass) => Boolean(klass?.name)).length;

    return [
      { label: "Total classes", value: totalClasses },
      { label: "Named classes", value: namedClasses },
      { label: "Needs setup", value: Math.max(totalClasses - namedClasses, 0) },
    ];
  }, [classes]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/attendance">Go to attendance</Link>
          <Link to="/communication">Send broadcast</Link>
        </div>
      </div>

      {loading && <p>Loading dashboard metrics...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          {metrics.map((metric) => (
            <div key={metric.label} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#4a5570" }}>{metric.label}</div>
              <div style={{ fontWeight: 800, fontSize: 26, marginTop: 6 }}>{metric.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
