import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { listAttendanceSessions, listSessionCheckins } from "../services/attendanceService";

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
}

export default function ReportsPage() {
  const [classId, setClassId] = useState("");
  const [dateFrom, setDateFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const metrics = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === "present") acc.present += 1;
        if (row.status === "absent") acc.absent += 1;
        if (row.status === "late") acc.late += 1;
        if (row.status === "excused") acc.excused += 1;
        if (row.method === "qr") acc.qr += 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, excused: 0, qr: 0 }
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const loadReport = async () => {
    setLoading(true);
    setMsg("");
    try {
      const sessions = await listAttendanceSessions({ classId, dateFrom, dateTo });
      const allRows = [];

      for (const session of sessions) {
        const baseRecords = Array.isArray(session.records) ? session.records : [];
        const studentMapRecords =
          session.students && typeof session.students === "object"
            ? Object.entries(session.students).map(([studentCode, entry]) => ({
                studentId: studentCode,
                studentName: entry?.name || "",
                status: entry?.present ? "present" : "absent",
              }))
            : [];
        const mergedBase = baseRecords.length > 0 ? baseRecords : studentMapRecords;

        const byStudent = new Map(
          baseRecords.map((r) => [r.studentId, { ...r, method: "manual", classId: session.classId, date: session.date, lesson: session.lesson || "" }])
        );

        const checkins = await listSessionCheckins({ classId: session.classId, date: session.date });
        for (const c of checkins) {
          const id = c.uid || c.id;
          byStudent.set(id, {
            studentId: id,
            studentName: c.name || byStudent.get(id)?.studentName || "",
            status: "present",
            method: "qr",
            classId: session.classId,
            date: session.date,
            lesson: c.lesson || session.lesson || "",
          });
        }

        allRows.push(...byStudent.values());
      }

      setRows(
        allRows.sort((a, b) => {
          if (a.date === b.date) return String(a.studentName).localeCompare(String(b.studentName));
          return String(a.date).localeCompare(String(b.date));
        })
      );
      setMsg(`Loaded ${allRows.length} attendance rows from ${sessions.length} sessions.`);
    } catch (err) {
      setMsg(`❌ ${err?.message || "Failed to load report"}`);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const csv = toCsv(filteredRows);
    if (!csv) {
      setMsg("No data to export.");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Reports</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input placeholder="Class ID (optional)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <label>
          From <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
        </select>
        <button onClick={loadReport} disabled={loading}>
          {loading ? "Loading..." : "Run report"}
        </button>
        <button onClick={exportCsv} disabled={filteredRows.length === 0}>
          Export CSV
        </button>
      </div>

      <div style={{ fontSize: 13, marginBottom: 8 }}>
        Total: {metrics.total} · Present: {metrics.present} · Absent: {metrics.absent} · Late: {metrics.late} · Excused: {metrics.excused} · QR Check-ins: {metrics.qr}
      </div>
      {msg && <div style={{ fontSize: 13, marginBottom: 8 }}>{msg}</div>}

      <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Date</th>
              <th style={{ textAlign: "left", padding: 8 }}>Class</th>
              <th style={{ textAlign: "left", padding: 8 }}>Student</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", padding: 8 }}>Method</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={`${row.classId}-${row.date}-${row.studentId}-${idx}`}>
                <td style={{ padding: 8, borderTop: "1px solid #eee" }}>{row.date}</td>
                <td style={{ padding: 8, borderTop: "1px solid #eee" }}>{row.classId}</td>
                <td style={{ padding: 8, borderTop: "1px solid #eee" }}>{row.studentName || row.studentId}</td>
                <td style={{ padding: 8, borderTop: "1px solid #eee" }}>{row.status}</td>
                <td style={{ padding: 8, borderTop: "1px solid #eee" }}>{row.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
