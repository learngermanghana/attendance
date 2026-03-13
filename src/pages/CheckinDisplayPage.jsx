import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { getClassSchedule } from "../data/classSchedules";
import "./CheckinDisplayPage.css";

export default function CheckinDisplayPage() {
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const sessionId = sp.get("sessionId") || sp.get("session") || "";
  const date = sp.get("date") || "";
  const sessionLabel = sp.get("sessionLabel") || sp.get("lesson") || "";
  const assignmentId = sp.get("assignmentId") || sp.get("assignment_id") || "";
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
      expectedStudents: String(expectedStudents || ""),
      expectedCount: String(expectedCount || ""),
    }).toString();
    return `${base}/checkin?${qs}`;
  }, [classId, sessionId, dateLabel, sessionDisplayLabel, assignmentId, expectedStudents, expectedCount]);

  const hasRequiredParams = Boolean(classId && String(sessionId || "").trim());

  return (
    <div className="checkin-display-page">
      <div className="checkin-display-card">
        <h1>Student Self Check-in</h1>
        <p>Scan the QR code to open the check-in form.</p>

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
