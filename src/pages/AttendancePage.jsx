import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { classSchedules } from "../data/classSchedules";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { listStudentsByClass } from "../services/studentsService";
import { listSessionCheckins, loadAttendanceSession, saveAttendance } from "../services/attendanceService";

const STATUSES = ["present", "absent", "late", "excused"];

export default function AttendancePage() {
  const { classId } = useParams();
  const { user } = useAuth();

  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [lesson, setLesson] = useState("");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);

  const checkinUrl = useMemo(() => {
    const base = window.location.origin;
    const qs = new URLSearchParams({ classId, date, lesson }).toString();
    return `${base}/checkin?${qs}`;
  }, [classId, date, lesson]);

  const defaultsFromStudents = (st) =>
    st.map((s) => ({
      studentId: s.uid || s.id,
      studentName: s.name,
      status: "present",
    }));

  const lessons = useMemo(() => {
    const schedule = classSchedules[classId] || [];
    return schedule.map((item) => ({
      value: `${item.day} - ${item.topic}`,
      label: `${item.day}: ${item.topic}`,
    }));
  }, [classId]);


  useEffect(() => {
    if (!lesson && lessons.length > 0) {
      setLesson(lessons[0].value);
    }
  }, [lesson, lessons]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      setSessionOpen(false);

      try {
        const st = await listStudentsByClass(classId);
        setStudents(st);

        const [session, checkins] = await Promise.all([
          loadAttendanceSession({ classId, date }),
          listSessionCheckins({ classId, date }),
        ]);

        let nextRecords = session?.records?.length ? session.records : defaultsFromStudents(st);

        if (session?.lesson) {
          setLesson(session.lesson);
        }

        if (checkins.length > 0) {
          const checkedInIds = new Set(checkins.map((c) => c.uid || c.id));
          nextRecords = nextRecords.map((r) =>
            checkedInIds.has(r.studentId) ? { ...r, status: "present" } : r
          );
        }

        setRecords(nextRecords);

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
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
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
        lesson,
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
          classId,
          date,
          lesson,
          windowMinutes: 180,
          action: "open",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to open check-in");

      setSessionOpen(true);
      setMsg("✅ Check-in opened. Students can scan QR and validate with email + phone number.");
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
          classId,
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
      {lesson && <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.85 }}>Lesson: {lesson}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label>
          Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label>
          Lesson:{" "}
          <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
            <option value="">Select lesson</option>
            {lessons.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
          Present: {summary.present} · Absent: {summary.absent} · Late: {summary.late} · Excused: {summary.excused}
        </div>
      </div>

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
              <QRCodeCanvas value={checkinUrl} size={170} />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, wordBreak: "break-all" }}>{checkinUrl}</div>
            </div>

            <div style={{ minWidth: 240 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Validation required</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Email + Phone Number</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Students must enter their registered <b>email</b> and <b>phone number</b> to mark present.
              </div>
            </div>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div>No students found for this class. Add students with classId = {classId}.</div>
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
