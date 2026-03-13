import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { getClassSchedule } from "../data/classSchedules";
import "./CheckinDisplayPage.css";

function parseSessionDate(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withoutWeekday = raw.replace(/^[A-Za-z]+,\s*/, "");
  const fallback = new Date(withoutWeekday);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return null;
}

function parseDateTime(dateValue, timeValue) {
  const date = parseSessionDate(dateValue);
  const time = String(timeValue || "").trim();
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10));
  const parsed = new Date(date);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

export default function CheckinDisplayPage() {
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const sessionId = sp.get("sessionId") || sp.get("session") || "";
  const date = sp.get("date") || "";
  const sessionLabel = sp.get("sessionLabel") || sp.get("lesson") || "";
  const assignmentId = sp.get("assignmentId") || sp.get("assignment_id") || "";
  const startTime = sp.get("startTime") || "";
  const endTime = sp.get("endTime") || "";
  const expectedStudents = sp.get("expectedStudents") || "";
  const expectedCount = sp.get("expectedCount") || "";

  const scheduleInfo = useMemo(() => {
    const sessionIndex = Number.parseInt(String(sessionId || ""), 10);
    if (!Number.isInteger(sessionIndex) || sessionIndex < 0) return null;

    const schedule = getClassSchedule(classId);
    const item = schedule[sessionIndex];
    if (!item) return null;

    return {
      dateLabel: item.date || String(date || ""),
      sessionDisplayLabel: `${item.day || ""} - ${item.topic || ""}`.trim().replace(/^\s*-\s*/, ""),
    };
  }, [classId, sessionId, date]);

  const dateLabel = scheduleInfo?.dateLabel || date || "";
  const sessionDisplayLabel = sessionLabel || scheduleInfo?.sessionDisplayLabel || "";

  const checkinUrl = useMemo(() => {
    const base = window.location.origin;
    const qs = new URLSearchParams({
      classId,
      sessionId: String(sessionId || ""),
      date: dateLabel,
      sessionLabel: sessionDisplayLabel,
      assignmentId: String(assignmentId || ""),
      startTime: String(startTime || ""),
      endTime: String(endTime || ""),
      expectedStudents: String(expectedStudents || ""),
      expectedCount: String(expectedCount || ""),
    }).toString();
    return `${base}/checkin?${qs}`;
  }, [classId, sessionId, dateLabel, sessionDisplayLabel, assignmentId, startTime, endTime, expectedStudents, expectedCount]);

  const statusInfo = useMemo(() => {
    const now = new Date();
    const startAt = parseDateTime(dateLabel, startTime);
    const endAt = parseDateTime(dateLabel, endTime);

    if (endAt && now > endAt) {
      return {
        kind: "ended",
        title: "Class has ended.",
        detail: "If you still haven't checked in, please do it now.",
      };
    }

    if (startAt && now < startAt) {
      return {
        kind: "before",
        title: "Class starts at this time.",
        detail: "Please check in before the meeting starts.",
      };
    }

    return {
      kind: "active",
      title: "Class is in progress.",
      detail: "Please check in now if you haven't submitted yet.",
    };
  }, [dateLabel, startTime, endTime]);

  const hasRequiredParams = Boolean(classId && String(sessionId || "").trim());

  return (
    <div className="checkin-display-page">
      <div className="checkin-display-card">
        <h1>Student Self Check-in</h1>
        <p>Scan the QR code to open the check-in form.</p>
        <div className={`checkin-display-alert checkin-display-alert-${statusInfo.kind}`}>
          <div className="checkin-display-alert-title">{statusInfo.title}</div>
          <div>{statusInfo.detail}</div>
        </div>

        {hasRequiredParams ? (
          <>
            <div className="checkin-display-qr-wrap">
              <QRCodeCanvas value={checkinUrl} size={320} includeMargin />
            </div>
            <div className="checkin-display-meta">
              <span><b>Class:</b> {classId}</span>
              <span><b>Date:</b> {dateLabel || "-"}</span>
              <span><b>Session:</b> {sessionDisplayLabel || "-"}</span>
              <span><b>Assignment:</b> {assignmentId || "-"}</span>
              <span><b>Class time:</b> {startTime || "--:--"} to {endTime || "--:--"}</span>
              <span><b>Expected students:</b> {expectedCount || "-"}</span>
            </div>
            <div className="checkin-display-link">{checkinUrl}</div>
          </>
        ) : (
          <div className="checkin-display-warning">
            Missing class/session details. Please reopen this display page from the Attendance screen.
          </div>
        )}
      </div>
    </div>
  );
}
