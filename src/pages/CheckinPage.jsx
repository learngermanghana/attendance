import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { findScheduleItemBySessionId } from "../data/classSchedules";
import { getTeachingSlideByAssignmentId } from "../data/teachingSlides";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "../context/ToastContext.jsx";
import "./CheckinPage.css";

const ATTENDANCE_TIME_ZONE = "Africa/Lagos";
const ATTENDANCE_TIME_ZONE_LABEL = "WAT (UTC+01:00)";

function resolveStatusApiUrl() {
  const checkinUrl = String(import.meta.env.VITE_CHECKIN_API_URL || "").trim();
  if (!checkinUrl) return "";
  return checkinUrl.replace(/\/checkin\/?$/, "/checkinStatus");
}

function resolvePublicAppBaseUrl() {
  const envBaseUrl = String(import.meta.env.VITE_PUBLIC_APP_BASE_URL || "").trim();
  const fallbackBaseUrl = String(window.location.origin || "").trim();
  const baseUrl = envBaseUrl || fallbackBaseUrl;
  return baseUrl.replace(/\/+$/, "");
}

function formatClock(timestamp) {
  if (!timestamp) return "-";
  const d = new Date(Number(timestamp));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: ATTENDANCE_TIME_ZONE });
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

function resolveFallbackStartTimestamp(dateValue, startTimeValue) {
  const safeDate = String(dateValue || "").trim();
  const safeStartTime = String(startTimeValue || "").trim();
  if (!safeDate || !safeStartTime) return null;

  const [yearRaw, monthRaw, dayRaw] = safeDate.split("-");
  const [hoursRaw, minutesRaw] = safeStartTime.split(":");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hoursRaw);
  const minute = Number(minutesRaw);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const asUtc = Date.UTC(year, month - 1, day, hour - 1, minute, 0, 0);
  return Number.isFinite(asUtc) ? asUtc : null;
}

function formatInterval(openFrom, openTo) {
  if (!openFrom && !openTo) return "-";
  return `${formatClock(openFrom)} to ${formatClock(openTo)} ${ATTENDANCE_TIME_ZONE_LABEL}`;
}

function formatStartTimeLabel(startTime, checkinStatus) {
  if (startTime) return startTime;
  if (checkinStatus?.openFrom) return formatClock(checkinStatus.openFrom);
  return "soon";
}

function formatEndTimeLabel(endTime, checkinStatus) {
  if (endTime) return endTime;
  if (checkinStatus?.openTo) return formatClock(checkinStatus.openTo);
  return "just now";
}

function parseExpectedNames(raw) {
  return String(raw || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 15);
}

export default function CheckinPage() {
  const { success, error } = useToast();
  const [sp] = useSearchParams();
  const classId = sp.get("classId") || sp.get("className") || "";
  const sessionId = sp.get("sessionId") || sp.get("session") || "";
  const date = sp.get("date") || "";
  const sessionLabel = sp.get("sessionLabel") || sp.get("lesson") || "";
  const assignmentId = sp.get("assignmentId") || "";
  const startTime = sp.get("startTime") || "";
  const endTime = sp.get("endTime") || "";
  const expectedStudentsRaw = sp.get("expectedStudents") || "";
  const expectedCount = Number(sp.get("expectedCount") || 0) || 0;

  const scheduleInfo = useMemo(() => {
    const item = findScheduleItemBySessionId(classId, sessionId);
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

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);
  const [savedSessionId, setSavedSessionId] = useState("");

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [serverTimeMs, setServerTimeMs] = useState(() => Date.now());

  const expectedStudents = useMemo(() => parseExpectedNames(expectedStudentsRaw), [expectedStudentsRaw]);

  const normalizedPhonePreview = useMemo(() => {
    const digits = String(phoneNumber || "").replace(/\D+/g, "");
    if (!digits) return "";
    return digits.length > 9 ? digits.slice(-9) : digits;
  }, [phoneNumber]);

  const selfCheckinUrl = useMemo(() => window.location.href, []);
  const matchingSlide = useMemo(() => getTeachingSlideByAssignmentId(assignmentId), [assignmentId]);
  const publicAppBaseUrl = useMemo(resolvePublicAppBaseUrl, []);
  const slideDownloadUrl = useMemo(() => {
    if (!matchingSlide?.course || !matchingSlide?.id) return "";
    const path = `/teaching-slides/public/${matchingSlide.course}/print#print-${matchingSlide.id}`;
    return `${publicAppBaseUrl}${path}`;
  }, [matchingSlide, publicAppBaseUrl]);

  const assignmentStoragePath = useMemo(() => {
    if (!classId || !(savedSessionId || sessionId)) return "-";
    return `attendance/${classId}/sessions/${savedSessionId || sessionId}/checkins`;
  }, [classId, sessionId, savedSessionId]);

  const validationError = useMemo(() => {
    if (!email.trim()) return "Email is required.";
    if (!phoneNumber.trim()) return "Phone number is required.";
    return "";
  }, [email, phoneNumber]);

  const canSubmit = useMemo(() => {
    return classId && sessionId && !validationError;
  }, [classId, sessionId, validationError]);

  const statusApiUrl = useMemo(resolveStatusApiUrl, []);

  useEffect(() => {
    if (!classId || !sessionId || !statusApiUrl) return;

    let canceled = false;

    const loadStatus = async () => {
      setStatusBusy(true);
      setStatusError("");
      try {
        const u = new URL(statusApiUrl);
        u.searchParams.set("classId", classId);
        u.searchParams.set("sessionId", sessionId);
        const res = await fetch(u.toString());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load check-in status");
        if (canceled) return;
        setCheckinStatus(data);
        if (Number.isFinite(data?.serverTime)) setServerTimeMs(Number(data.serverTime));
      } catch (e) {
        if (canceled) return;
        setStatusError(e?.message || "Failed to load check-in status");
      } finally {
        if (!canceled) setStatusBusy(false);
      }
    };

    loadStatus();
    const poll = window.setInterval(loadStatus, 30000);
    return () => {
      canceled = true;
      window.clearInterval(poll);
    };
  }, [classId, sessionId, statusApiUrl]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setServerTimeMs((prev) => (Number.isFinite(prev) ? prev + 1000 : Date.now()));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);


  const attendanceWindowLabel = useMemo(() => {
    if (checkinStatus?.openFrom || checkinStatus?.openTo) {
      return formatInterval(checkinStatus.openFrom, checkinStatus.openTo);
    }
    if (startTime || endTime) return `${startTime || "--:--"} to ${endTime || "--:--"} ${ATTENDANCE_TIME_ZONE_LABEL}`;
    return "-";
  }, [checkinStatus, startTime, endTime]);

  const personalizedStartMessage = useMemo(() => {
    const startLabel = formatStartTimeLabel(startTime, checkinStatus);
    return `Hello! Class starts at ${startLabel}. Kindly check in for your attendance to be recorded while you wait for the meeting to start.`;
  }, [startTime, checkinStatus]);

  const personalizedEndedMessage = useMemo(() => {
    const endLabel = formatEndTimeLabel(endTime, checkinStatus);
    return `Class ended at ${endLabel}. If you still have not checked in, submit now so your attendance can still be recorded.`;
  }, [endTime, checkinStatus]);

  const statusSummary = useMemo(() => {
    if (!checkinStatus) return null;

    const status = String(checkinStatus.status || "");
    const openFrom = Number(checkinStatus.openFrom || 0) || null;
    const openTo = Number(checkinStatus.openTo || 0) || null;

    if (status === "open") {
      return {
        tone: "open",
        label: personalizedStartMessage,
        detail: [
          openTo && serverTimeMs ? `Ends in ${formatDuration(openTo - serverTimeMs)}` : "",
        ].filter(Boolean).join(" "),
      };
    }

    if (status === "scheduled") {
      return {
        tone: "scheduled",
        label: personalizedStartMessage,
        detail: [
          openFrom && serverTimeMs ? `Starts in ${formatDuration(openFrom - serverTimeMs)}` : `Starts at ${formatClock(openFrom)}`,
        ].filter(Boolean).join(" "),
      };
    }

    if (status === "ended") {
      return {
        tone: "ended",
        label: "Class has ended",
        detail: personalizedEndedMessage,
      };
    }

    if (status === "not_opened") {
      return {
        tone: "closed",
        label: "Session not opened",
        detail: "Ask your teacher to open check-in.",
      };
    }

    return {
      tone: "closed",
      label: "Check-in closed",
      detail: "Ask your teacher to open check-in.",
    };
  }, [checkinStatus, serverTimeMs, personalizedStartMessage, personalizedEndedMessage]);

  const preClassCountdown = useMemo(() => {
    if (!Number.isFinite(serverTimeMs)) return null;
    const status = String(checkinStatus?.status || "");
    const serverScheduledStart = Number(checkinStatus?.openFrom || 0) || null;
    const fallbackStart = resolveFallbackStartTimestamp(date, startTime);
    const startMs = serverScheduledStart || fallbackStart;

    if (!startMs) return null;
    if (checkinStatus && status !== "scheduled") return null;

    const remainingMs = startMs - serverTimeMs;
    if (remainingMs <= 0) return null;

    return {
      remainingLabel: formatDuration(remainingMs),
      startTimeLabel: formatClock(startMs),
    };
  }, [checkinStatus, serverTimeMs, date, startTime]);

  const submit = async (e) => {
    e.preventDefault();
    if (validationError) {
      error(validationError);
      return;
    }

    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPhone = phoneNumber.trim();
      const res = await fetch(import.meta.env.VITE_CHECKIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sessionId,
          date,
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
          sessionLabel: sessionLabel || sessionDisplayLabel,
          assignmentId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Check-in failed");

      const resolvedSavedSessionId = String(data?.savedSessionId || sessionId || "").trim();
      setSavedSessionId(resolvedSavedSessionId);
      success("Check-in successful. You are marked present.");
      setSubmittedInfo({
        checkedInAt: Date.now(),
        maskedEmail: trimmedEmail.replace(/(^.).*(@.*$)/, "$1***$2"),
        savedSessionId: resolvedSavedSessionId,
      });
      setEmail("");
      setPhoneNumber("");
    } catch (err) {
      error(err?.message || "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <h2>Student Check-in</h2>
        <p className="checkin-subtitle">{personalizedStartMessage}</p>
        <div className="checkin-live-clock" role="status" aria-live="polite">
          Current time: <b>{formatLiveClockLabel(serverTimeMs)}</b> {ATTENDANCE_TIME_ZONE_LABEL}
        </div>

        {preClassCountdown && (
          <div className="checkin-live-countdown" role="status" aria-live="polite">
            <div className="checkin-live-countdown-title">Class starts in</div>
            <div className="checkin-live-countdown-timer">{preClassCountdown.remainingLabel}</div>
            <div className="checkin-live-countdown-note">Countdown to {preClassCountdown.startTimeLabel} {ATTENDANCE_TIME_ZONE_LABEL}</div>
          </div>
        )}

        {statusSummary && (
          <div className={`checkin-status checkin-status-${statusSummary.tone}`}>
            <div className="checkin-status-label">{statusSummary.label}</div>
            {statusSummary.detail && <div className="checkin-status-detail">{statusSummary.detail}</div>}
          </div>
        )}
        {statusBusy && <div className="checkin-help">Refreshing check-in status...</div>}
        {statusError && <div className="checkin-inline-error">{statusError}</div>}

        <div className="checkin-info-block">
          <div className="checkin-info-title">Today in class</div>
          <div>Welcome to <b>{classId || "-"}</b>.</div>
          <div>You will be working on <b>{sessionDisplayLabel || "today's lesson"}</b>.</div>
          <div>Attendance window: <b>{attendanceWindowLabel || formatInterval(checkinStatus?.openFrom, checkinStatus?.openTo)}</b></div>
          <div className="checkin-help">Kindly check in for your attendance to be recorded while you wait for the meeting to start. If class has ended, you can still submit for late attendance recording.</div>
        </div>

        {(expectedCount > 0 || expectedStudents.length > 0) && (
          <div className="checkin-expected">
            <div><b>Expected students:</b> {expectedCount || expectedStudents.length}</div>
            {expectedStudents.length > 0 && (
              <div className="checkin-help">{expectedStudents.join(", ")}</div>
            )}
          </div>
        )}

        <div className="checkin-meta">
          <div><b>Class:</b> {classId || "-"}</div>
          <div><b>Date:</b> {dateLabel || "-"}</div>
          <div><b>Session:</b> {sessionDisplayLabel || "-"}</div>
          <div><b>Assignment ID:</b> {assignmentId || "-"}</div>
          <div><b>Saved to:</b> <code>{assignmentStoragePath}</code></div>
        </div>

        {matchingSlide && (
          <div className="checkin-slide-download">
            <div><b>Lesson slide ready:</b> {matchingSlide.title}</div>
            <a href={slideDownloadUrl} target="_blank" rel="noreferrer">
              Download this teaching slide (PDF)
            </a>
          </div>
        )}

        {submittedInfo && (
          <div className="checkin-success-card" role="status" aria-live="polite">
            <div><b>✅ You are checked in.</b></div>
            <div>Time: {new Date(submittedInfo.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: ATTENDANCE_TIME_ZONE })} {ATTENDANCE_TIME_ZONE_LABEL}</div>
            <div>Email: {submittedInfo.maskedEmail}</div>
            <div>Session: {sessionDisplayLabel || "-"}</div>
            <div>Saved under session ID: {submittedInfo.savedSessionId || "-"}</div>
          </div>
        )}

        {(!classId || !sessionId) && (
          <div className="checkin-warning">
            Missing classId/sessionId in QR link. Ask your teacher to show the QR again.
          </div>
        )}

        <form onSubmit={submit} className="checkin-form">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            type="email"
          />
          <input
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            aria-label="Phone number"
            type="tel"
          />

          {normalizedPhonePreview && (
            <div className="checkin-help">
              Normalized student number: <b>{normalizedPhonePreview}</b>
            </div>
          )}

          {!canSubmit && classId && sessionId && <div className="checkin-inline-error">{validationError}</div>}

          <button disabled={!canSubmit || busy}>{busy ? "Submitting..." : "Mark me present"}</button>
        </form>

        <div className="checkin-share">
          <div><b>Need to continue on another device?</b> Scan this QR code to open this same form.</div>
          <div className="checkin-share-box">
            <QRCodeCanvas value={selfCheckinUrl} size={130} includeMargin />
          </div>
        </div>
      </div>
    </div>
  );
}
