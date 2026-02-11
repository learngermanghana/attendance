import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { classSchedules } from "../data/classSchedules";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { listStudentsByClass } from "../services/studentsService";
import {
  listSessionCheckins,
  loadAttendanceFromFirestore,
  saveAttendanceToFirestore,
} from "../services/attendanceService";

function normalizeScheduleDate(raw) {
  if (!raw) return "";
  const parsed = dayjs(raw, ["dddd, DD MMMM YYYY", "YYYY-MM-DD"], true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

function buildScheduleMap(classId) {
  const schedule = classSchedules[classId] || [];
  const map = {};

  schedule.forEach((item, index) => {
    const sessionId = String(index);
    map[sessionId] = {
      title: `${item.week}: ${item.topic}`,
      date: normalizeScheduleDate(item.date),
    };
  });

  return map;
}

function resolveStudentCode(student) {
  return String(student.studentCode || student.studentcode || student.uid || student.id || "").trim();
}

function byStudentName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

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

  const sessionIds = useMemo(() => {
    return Object.keys(attendanceMap).sort((a, b) => Number(a) - Number(b));
  }, [attendanceMap]);

  const selectedSession = attendanceMap[selectedSessionId] || { title: "", date: "", students: {} };

  const studentRows = useMemo(() => {
    return Object.entries(selectedSession.students || {})
      .map(([studentCode, entry]) => ({
        studentCode,
        name: entry?.name || "",
        present: Boolean(entry?.present),
      }))
      .sort(byStudentName);
  }, [selectedSession]);

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
        const [students, storedAttendance] = await Promise.all([
          listStudentsByClass(classId),
          loadAttendanceFromFirestore(classId),
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

        const sortedIds = [...mergedSessionIds].sort((a, b) => Number(a) - Number(b));
        const firstSessionId = sortedIds[0] || "0";

        setAttendanceMap(nextAttendanceMap);
        setSelectedSessionId((prev) => (nextAttendanceMap[prev] ? prev : firstSessionId));

        if (nextAttendanceMap[firstSessionId]?.date) {
          const checkins = await listSessionCheckins({ classId, date: firstSessionId });
          if (checkins.length > 0) {
            setAttendanceMap((current) => {
              const updated = { ...current };
              const base = updated[firstSessionId] || { students: {} };
              const studentsCopy = { ...(base.students || {}) };
              for (const c of checkins) {
                const code = String(c.studentCode || c.uid || c.id || "").trim();
                if (!code) continue;
                studentsCopy[code] = {
                  name: String(c.name || studentsCopy[code]?.name || "").trim(),
                  present: true,
                };
              }
              updated[firstSessionId] = { ...base, students: studentsCopy };
              return updated;
            });
          }
        }
      } catch (e) {
        setMsg(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [classId]);

  const setStudentPresent = (studentCode, present) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [selectedSessionId]: {
        ...(prev[selectedSessionId] || {}),
        students: {
          ...((prev[selectedSessionId] || {}).students || {}),
          [studentCode]: {
            ...(((prev[selectedSessionId] || {}).students || {})[studentCode] || {}),
            present,
          },
        },
      },
    }));
  };

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
      setMsg("✅ Check-in opened.");
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
          date: selectedSessionId,
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

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label>
          Session:{" "}
          <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
            {sessionIds.map((sessionId) => (
              <option key={sessionId} value={sessionId}>
                {sessionId}: {attendanceMap[sessionId]?.title || "Untitled"}
              </option>
            ))}
          </select>
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

      <div style={{ marginBottom: 12 }}>
        <b>Title:</b> {selectedSession.title || "-"}
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

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>Status: {sessionOpen ? "OPEN" : "CLOSED"}</div>
        </div>

        {sessionOpen && (
          <div style={{ marginTop: 12, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ padding: 10, border: "1px solid #eee", borderRadius: 10 }}>
              <QRCodeCanvas value={checkinUrl} size={170} />
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, wordBreak: "break-all" }}>{checkinUrl}</div>
            </div>
          </div>
        )}
      </div>

      {studentRows.length === 0 ? (
        <div>No students found for this class.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {studentRows.map((row) => (
            <div
              key={row.studentCode}
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
                <div style={{ fontWeight: 700 }}>{row.name || row.studentCode}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{row.studentCode}</div>
              </div>

              <button onClick={() => setStudentPresent(row.studentCode, true)} style={{ background: row.present ? "#111" : "white", color: row.present ? "white" : "black" }}>
                Present
              </button>
              <button onClick={() => setStudentPresent(row.studentCode, false)} style={{ background: !row.present ? "#111" : "white", color: !row.present ? "white" : "black" }}>
                Absent
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
        <button disabled={saving || sessionIds.length === 0} onClick={onSave}>
          {saving ? "Saving..." : "Save Attendance"}
        </button>
        {msg && <div style={{ fontSize: 13 }}>{msg}</div>}
      </div>
    </div>
  );
}
