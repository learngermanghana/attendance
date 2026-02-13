import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import { getClassSchedule } from "../data/classSchedules";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { listStudentsByClass } from "../services/studentsService";
import {
  listSessionCheckins,
  loadAttendanceFromFirestore,
  saveAttendanceToFirestore,
} from "../services/attendanceService";
import { useToast } from "../context/ToastContext.jsx";

function normalizeScheduleDate(raw) {
  if (!raw) return "";
  const parsed = dayjs(raw, ["dddd, DD MMMM YYYY", "YYYY-MM-DD"], true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

function buildScheduleMap(classId) {
  const schedule = getClassSchedule(classId);
  const map = {};

  schedule.forEach((item, index) => {
    const sessionId = String(index);
    map[sessionId] = {
      title: `${item.week}: ${item.topic}`,
      date: normalizeScheduleDate(item.date),
      students: {},
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
  const { classId: routeClassId } = useParams();
  const classId = decodeURIComponent(routeClassId || "");
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [lesson, setLesson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedSessionId, setSelectedSessionId] = useState("0");

  const sessionIds = useMemo(() => Object.keys(attendanceMap).sort((a, b) => Number(a) - Number(b)), [attendanceMap]);

  const selectedSession = attendanceMap[selectedSessionId] || { title: "", date: "", students: {} };
  const checkinSessionDate = String(selectedSession.date || "").trim() || selectedSessionId;

  const studentRows = useMemo(() => {
    return Object.entries(selectedSession.students || {})
      .map(([studentCode, entry]) => ({
        studentCode,
        name: entry?.name || "",
        present: Boolean(entry?.present),
      }))
      .sort(byStudentName);
  }, [selectedSession]);

  const summary = useMemo(() => {
    const present = studentRows.filter((row) => row.present).length;
    const absent = studentRows.length - present;
    return { present, absent, late: 0, excused: 0 };
  }, [studentRows]);

  const checkinUrl = useMemo(() => {
    const base = window.location.origin;
    const qs = new URLSearchParams({ classId, date: checkinSessionDate, lesson }).toString();
    return `${base}/checkin?${qs}`;
  }, [classId, checkinSessionDate, lesson]);

  const lessons = useMemo(() => {
    const schedule = getClassSchedule(classId);
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
      setSessionOpen(false);

      try {
        const [students, storedAttendance] = await Promise.all([
          listStudentsByClass(classId),
          loadAttendanceFromFirestore(classId),
        ]);

        const studentTemplate = {};
        for (const student of students) {
          const code = resolveStudentCode(student);
          if (!code) continue;
          studentTemplate[code] = {
            name: String(student.name || "").trim(),
            present: false,
          };
        }

        const scheduleAttendanceMap = buildScheduleMap(classId);
        const nextAttendanceMap = { ...scheduleAttendanceMap, ...storedAttendance };

        if (Object.keys(nextAttendanceMap).length === 0) {
          nextAttendanceMap["0"] = {
            title: "Session 1",
            date: dayjs().format("YYYY-MM-DD"),
            students: {},
          };
        }

        for (const sessionId of Object.keys(nextAttendanceMap)) {
          const scheduleSession = scheduleAttendanceMap[sessionId] || {};
          const existingSession = nextAttendanceMap[sessionId] || {};
          const baseStudents = nextAttendanceMap[sessionId]?.students || {};
          nextAttendanceMap[sessionId] = {
            ...existingSession,
            title: String(existingSession.title || "").trim() || scheduleSession.title || `Session ${Number(sessionId) + 1}`,
            date: String(existingSession.date || "").trim() || scheduleSession.date || dayjs().format("YYYY-MM-DD"),
            students: {
              ...studentTemplate,
              ...baseStudents,
            },
          };
        }

        const sortedIds = Object.keys(nextAttendanceMap).sort((a, b) => Number(a) - Number(b));
        const firstSessionId = sortedIds[0] || "0";

        setAttendanceMap(nextAttendanceMap);
        setSelectedSessionId((prev) => (nextAttendanceMap[prev] ? prev : firstSessionId));
      } catch (e) {
        error(e?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    })();
  }, [classId]);

  useEffect(() => {
    if (!classId || !selectedSessionId || !attendanceMap[selectedSessionId]) return;

    (async () => {
      try {
        const checkins = await listSessionCheckins({ classId, date: checkinSessionDate });
        if (checkins.length === 0) return;

        setAttendanceMap((current) => {
          const updated = { ...current };
          const base = updated[selectedSessionId] || { students: {} };
          const studentsCopy = { ...(base.students || {}) };

          for (const c of checkins) {
            const code = String(c.studentCode || c.uid || c.id || "").trim();
            if (!code) continue;
            studentsCopy[code] = {
              name: String(c.name || studentsCopy[code]?.name || "").trim(),
              present: true,
            };
          }

          updated[selectedSessionId] = { ...base, students: studentsCopy };
          return updated;
        });
      } catch {
        // Non-blocking: class page should still render if check-ins fail to load.
      }
    })();
  }, [classId, selectedSessionId, checkinSessionDate]);

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

    const studentName = selectedSession?.students?.[studentCode]?.name || studentCode;
    if (present) {
      success(`${studentName} marked present.`);
    } else {
      info(`${studentName} marked absent.`);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveAttendanceToFirestore(classId, attendanceMap);
      success("Attendance saved.");
    } catch (e) {
      error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  async function openCheckin() {
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
          date: checkinSessionDate,
          lesson,
          windowMinutes: 180,
          action: "open",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to open check-in");

      setSessionOpen(true);
      success("Check-in opened.");
    } catch (e) {
      error(e?.message || "Error opening check-in");
    } finally {
      setSessionBusy(false);
    }
  }

  async function closeCheckin() {
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
          date: checkinSessionDate,
          action: "close",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to close check-in");

      setSessionOpen(false);
      success("Check-in closed.");
    } catch (e) {
      error(e?.message || "Error closing check-in");
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
          <select
            value={selectedSessionId}
            onChange={(e) => {
              const nextSessionId = e.target.value;
              setSelectedSessionId(nextSessionId);
            }}
          >
            {sessionIds.map((sessionId) => (
              <option key={sessionId} value={sessionId}>
                {sessionId}: {attendanceMap[sessionId]?.title || "Untitled"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Check-in date:{" "}
          <input
            type="date"
            value={selectedSession.date || ""}
            onChange={(e) => {
              const nextDate = e.target.value;
              setAttendanceMap((prev) => ({
                ...prev,
                [selectedSessionId]: {
                  ...(prev[selectedSessionId] || {}),
                  date: nextDate,
                },
              }));
            }}
          />
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
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
          <b>Check-in date:</b> {checkinSessionDate}
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
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: row.present ? "#147848" : "#6b7280" }}>
                  {row.present ? "Present" : "Absent"}
                </div>
              </div>

              <button onClick={() => setStudentPresent(row.studentCode, true)} style={{ minWidth: 90, background: row.present ? "#147848" : "white", color: row.present ? "white" : "black", borderColor: row.present ? "#147848" : "#c9d1e4" }}>
                Present
              </button>
              <button onClick={() => setStudentPresent(row.studentCode, false)} style={{ minWidth: 90, background: !row.present ? "#6b7280" : "white", color: !row.present ? "white" : "black", borderColor: !row.present ? "#6b7280" : "#c9d1e4" }}>
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
      </div>
    </div>
  );
}
