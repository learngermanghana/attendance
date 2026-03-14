import { useEffect, useMemo, useState } from "react";
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

function formatDisplayTimeLabel(timeText, fallbackDateTime) {
  if (timeText) return timeText;
  if (fallbackDateTime instanceof Date && !Number.isNaN(fallbackDateTime.getTime())) {
    return fallbackDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "soon";
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
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const scheduleInfo = useMemo(() => {
    const sessionIndex = Number.parseInt(String(sessionId || ""), 10);
    if (!Number.isInteger(sessionIndex)) return null;

    const schedule = getClassSchedule(classId);
    const zeroBasedIndex = sessionIndex > 0 ? sessionIndex - 1 : sessionIndex;
    const item = schedule[zeroBasedIndex] || schedule[sessionIndex];
    if (!item) return null;

    return {
      dateLabel: item.date || String(date || ""),
      sessionDisplayLabel: `${item.day || ""} - ${item.topic || ""}`.trim().replace(/^\s*-\s*/, ""),
    };
  }, [classId, sessionId, date]);

  const hasDateFromUrl = Boolean(String(date || "").trim());
  const hasSessionLabelFromUrl = Boolean(String(sessionLabel || "").trim());
  const dateLabel = hasDateFromUrl ? String(date).trim() : (scheduleInfo?.dateLabel || "");
  const sessionDisplayLabel = hasSessionLabelFromUrl
    ? String(sessionLabel).trim()
    : (scheduleInfo?.sessionDisplayLabel || "");

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
    const now = new Date(nowMs);
    const startAt = parseDateTime(dateLabel, startTime);
    const endAt = parseDateTime(dateLabel, endTime);

    if (endAt && now > endAt) {
      const endLabel = formatDisplayTimeLabel(endTime, endAt);
      return {
        kind: "ended",
        title: "Class has ended.",
        detail: `Class ended at ${endLabel}. If you still haven't checked in, please do it now for late attendance recording.`,
      };
    }

    if (startAt && now < startAt) {
      const startLabel = formatDisplayTimeLabel(startTime, startAt);
      return {
        kind: "before",
        title: `Hello! Class starts at ${startLabel}.`,
        detail: "Kindly check in for your attendance to be recorded while you wait for the meeting to start.",
      };
    }

    return {
      kind: "active",
      title: "Class is in progress.",
      detail: "Please check in now if you haven't submitted yet.",
    };
  }, [dateLabel, nowMs, startTime, endTime]);

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
            <div className="checkin-display-content">
              <div className="checkin-display-qr-wrap">
                <QRCodeCanvas value={checkinUrl} size={240} includeMargin />
              </div>
              <div className="checkin-display-meta checkin-display-read-first">
                <div className="checkin-display-read-first-title">Read before check-in</div>
                <span><b>Class:</b> {classId}</span>
                <span><b>Date:</b> {dateLabel || "-"}</span>
                <span><b>Session:</b> {sessionDisplayLabel || "-"}</span>
                <span><b>Assignment:</b> {assignmentId || "-"}</span>
                <span><b>Class time:</b> {startTime || "--:--"} to {endTime || "--:--"}</span>
                <span><b>Expected students:</b> {expectedCount || "-"}</span>
              </div>
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
