import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { getClassSchedule } from "../data/classSchedules";
import "./CheckinDisplayPage.css";

const ATTENDANCE_UTC_OFFSET_HOURS = 1;
const ATTENDANCE_TIME_ZONE = "Africa/Lagos";
const ATTENDANCE_TIME_ZONE_LABEL = "WAT (UTC+01:00)";

function parseSessionDate(dateValue) {
  const raw = String(dateValue || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number.parseInt(isoMatch[1], 10),
      month: Number.parseInt(isoMatch[2], 10),
      day: Number.parseInt(isoMatch[3], 10),
    };
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return {
      year: direct.getFullYear(),
      month: direct.getMonth() + 1,
      day: direct.getDate(),
    };
  }

  const withoutWeekday = raw.replace(/^[A-Za-z]+,\s*/, "");
  const fallback = new Date(withoutWeekday);
  if (!Number.isNaN(fallback.getTime())) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
    };
  }

  return null;
}

function formatDisplayTimeLabel(timeText, fallbackDateTimeMs) {
  if (timeText) return timeText;
  if (Number.isFinite(fallbackDateTimeMs)) {
    return new Date(fallbackDateTimeMs).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ATTENDANCE_TIME_ZONE,
    });
  }
  return "soon";
}

function parseDateTime(dateValue, timeValue) {
  const date = parseSessionDate(dateValue);
  const time = String(timeValue || "").trim();
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10));
  return Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hours - ATTENDANCE_UTC_OFFSET_HOURS,
    minutes,
    0,
    0
  );
}

function formatLiveClockLabel(timestamp) {
  if (!Number.isFinite(timestamp)) return "--:--:--";
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: ATTENDANCE_TIME_ZONE,
  });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "-";
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    const startAt = parseDateTime(dateLabel, startTime);
    const endAt = parseDateTime(dateLabel, endTime);

    if (endAt && nowMs > endAt) {
      const endLabel = formatDisplayTimeLabel(endTime, endAt);
      return {
        kind: "ended",
        title: "Class has ended.",
        detail: `Class ended at ${endLabel} ${ATTENDANCE_TIME_ZONE_LABEL}. If you still haven't checked in, please do it now for late attendance recording.`,
      };
    }

    if (startAt && nowMs < startAt) {
      const startLabel = formatDisplayTimeLabel(startTime, startAt);
      return {
        kind: "before",
        title: `Hello! Class starts at ${startLabel} ${ATTENDANCE_TIME_ZONE_LABEL}.`,
        detail: "Kindly check in for your attendance to be recorded while you wait for the meeting to start.",
      };
    }

    return {
      kind: "active",
      title: "Class is in progress.",
      detail: "Please check in now if you haven't submitted yet.",
    };
  }, [dateLabel, nowMs, startTime, endTime]);

  const preClassCountdown = useMemo(() => {
    const startAt = parseDateTime(dateLabel, startTime);
    if (!startAt || nowMs >= startAt) return null;
    return {
      remainingLabel: formatDuration(startAt - nowMs),
      startTimeLabel: formatDisplayTimeLabel(startTime, startAt),
    };
  }, [dateLabel, nowMs, startTime]);

  const hasRequiredParams = Boolean(classId && String(sessionId || "").trim());

  return (
    <div className="checkin-display-page">
      <div className="checkin-display-card">
        <h1>Student Self Check-in</h1>
        <p>Scan the QR code to open the check-in form.</p>
        <div className="checkin-display-live-clock" role="status" aria-live="polite">
          Current time: <b>{formatLiveClockLabel(nowMs)}</b> {ATTENDANCE_TIME_ZONE_LABEL}
        </div>
        {preClassCountdown && (
          <div className="checkin-display-live-countdown" role="status" aria-live="polite">
            <div className="checkin-display-live-countdown-title">Class starts in</div>
            <div className="checkin-display-live-countdown-timer">{preClassCountdown.remainingLabel}</div>
            <div className="checkin-display-live-countdown-note">
              Countdown to {preClassCountdown.startTimeLabel} {ATTENDANCE_TIME_ZONE_LABEL}
            </div>
          </div>
        )}
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
                <span><b>Class time:</b> {startTime || "--:--"} to {endTime || "--:--"} {ATTENDANCE_TIME_ZONE_LABEL}</span>
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
