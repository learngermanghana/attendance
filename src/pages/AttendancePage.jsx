import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import QRCode from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { listStudentsByClass } from "../services/studentsService";
import { loadAttendanceSession, saveAttendance } from "../services/attendanceService";

const STATUSES = ["present", "absent", "late", "excused"];

export default function AttendancePage() {
  const { classId } = useParams();
  const { user } = useAuth();

  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // QR / Session state
  const [pin, setPin] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);

  const checkinUrl = useMemo(() => {
    const base = window.location.origin;
    const qs = new URLSearchParams({ className: classId, date }).toString();
    return `${base}/checkin?${qs}`;
  }, [classId, date]);

  const defaultsFromStudents = (st) =>
    st.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      status: "present",
    }));

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      setPin("");
      setSessionOpen(false);

      try {
        const st = await listStudentsByClass(classId);
        setStudents(st);

        const session = await loadAttendanceSession({ classId, date });
        if (session?.records?.length) {
          setRecords(session.records);
        } else {
          setRecords(defaultsFromStudents(st));
        }

        // If a session exists and is opened, reflect it (optional)
        if (session?.opened) {
          setSessionOpen(true);
        }
      } catch (e) {
        setMsg(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [classId, date]);

  const updateStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const summary = useMemo(() => {
    const s = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) if (s[r.status] !== undefined) s[r.status] += 1;
    return s;
  }, [records]);

  const onSave = async () => {
    setMsg("");
    setSaving(true);
    try {
      await saveAttendance({
        classId,
        date,
        teacherUid: user.uid,
        records,
      });
      setMsg("✅ Attendance saved");
    } catch (e) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  async function openCheckin() {
    setMsg("");
    setSessionBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(import.meta.env.VITE_OPEN_SESSION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          className: classId,
          date,
          // Change if you want longer/shorter window
          windowMinutes: 180,
          action: "open",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to open check-in");

      setPin(data.pin || "");
      setSessionOpen(true);
      setMsg("✅ Check-in opened. Show QR + PIN to students.");
    } catch (e) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSessionBusy(false);
    }
  }

  async function closeCheckin() {
    setMsg("");
    setSessionBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(import.meta.env.VITE_OPEN_SESSION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          className: classId,
          date,
          action: "close",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to close check-in");

      setSessionOpen(false);
      setMsg("✅ Check-in closed.");
    } catch (e) {
      setMsg("❌ " + (e?.message || "Error"));
    } finally {
      setSessionBusy(false);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h2>Attendance: {classId}</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label>
          Date:{" "}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
          Present: {summary.present} · Absent: {summary.absent} · Late: {summary.late} · Excused: {summary.excused}
        </div>
      </div>

      {/* QR CHECK-IN PANEL */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Student QR Check-in</div>

          <button disabled={sessionBusy || sessionOpen} onClick={openCheckin}>
            {sessionBusy && !sessionOpen ? "Opening..." : "Open Check-in"}
          </button>

          <button disabled={sessionBusy || !sessionOpen} onClick={closeCheckin}>
            {sessionBusy && sessionOpen ? "Closing..." : "Close Check-in"}
          </button>

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
            Status: {sessionOpen ? "OPEN" : "CLOSED"}
          </div>
        </div>

        {sessionOpen && (
          <div style={{ marginTop: 12, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
              <QRCode value={checkinUrl} size={170} />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, wordBreak: "break-all" }}>
                {checkinUrl}
              </div>
            </div>

            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Secret PIN</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>
                {pin || "----"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Students must enter their <b>studentCode</b> + this PIN to mark present.
              </div>
            </div>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div>No students found for this class. Add to <b>students</b> with classId = {classId}.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {records.map((r) => (
            <div
              key={r.studentId}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.studentName}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{r.studentId}</div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(r.studentId, s)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: r.status === s ? "#111" : "white",
                      color: r.status === s ? "white" : "black",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <button disabled={saving || records.length === 0} onClick={onSave}>
          {saving ? "Saving..." : "Save Attendance"}
        </button>
        {msg && <div style={{ fontSize: 13 }}>{msg}</div>}
      </div>
    </div>
  );
}
