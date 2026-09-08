import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadClassAttendanceAnalytics } from "../services/attendanceAnalyticsService.js";
import { deleteStudentAccount } from "../services/studentsService.js";

function normalize(value) {
  return String(value ?? "").trim();
}

function comparable(value) {
  return normalize(value).toLowerCase();
}

function displayValue(...values) {
  return values.map(normalize).find(Boolean) || "Not set";
}

function studentKey(student = {}, index = 0) {
  return displayValue(
    student.studentCode,
    student.studentcode,
    student.uid,
    student.id,
    student.email,
    `${student.name || "student"}-${index}`,
  );
}

function studentName(student = {}) {
  return displayValue(student.name, student.displayName, student.studentCode, student.studentcode, student.email, "Student");
}

function studentCode(student = {}) {
  return displayValue(student.studentCode, student.studentcode, student.uid, student.id);
}

function studentPhone(student = {}) {
  return displayValue(student.phone, student.phoneNumber, student.whatsapp, student.guardianPhone);
}

function numberValue(...values) {
  for (const value of values) {
    if (value === "" || value == null) continue;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatMoney(...values) {
  const amount = numberValue(...values);
  return amount == null ? "Not set" : `GHS ${amount.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`;
}

function normalizePhoneForLink(value) {
  const phone = normalize(value);
  if (!phone || phone === "Not set") return "";
  return phone.replace(/(?!^)\+|[^\d+]/g, "");
}

function whatsappNumber(value) {
  const digits = normalize(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

function formatDateTime(value, timezone = "Africa/Accra") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(status) {
  return ({
    present: "Present",
    late: "Late",
    absent: "Absent",
    excused: "Excused",
    cancelled: "Cancelled",
    upcoming: "Upcoming",
  })[status] || status || "Unknown";
}

function statusStyle(status) {
  if (status === "present") return { background: "#dcfce7", color: "#166534" };
  if (status === "late") return { background: "#fef3c7", color: "#92400e" };
  if (status === "absent") return { background: "#fee2e2", color: "#991b1b" };
  if (status === "excused") return { background: "#e0e7ff", color: "#3730a3" };
  return { background: "#e2e8f0", color: "#334155" };
}

function detail(label, value) {
  return (
    <div style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, overflowWrap: "anywhere" }}>{value || "Not set"}</div>
    </div>
  );
}

function attendanceSummaryFor(analytics, student = {}) {
  if (!analytics) return null;
  const identifiers = new Set([
    studentKey(student),
    studentCode(student),
    student.email,
  ].map(comparable).filter(Boolean));
  return analytics.studentSummaries.find((summary) => [
    summary.studentKey,
    summary.studentCode,
    summary.studentEmail,
  ].map(comparable).some((value) => identifiers.has(value))) || null;
}

export default function LiveClassStudentsPanel({
  classId = "",
  className = "",
  levelId = "",
  sessions = [],
  timezone = "Africa/Accra",
}) {
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const [deletingStudentKey, setDeletingStudentKey] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setActionFeedback("");
    setQuery("");
    setSelectedKey("");

    loadClassAttendanceAnalytics({
      classId,
      className,
      sessions,
      klass: { id: classId, name: className, timezone },
    })
      .then((result) => {
        if (!active) return;
        const nextRows = Array.isArray(result.students) ? result.students : [];
        setStudents(nextRows);
        setAnalytics(result.analytics);
        setSelectedKey(nextRows.length ? studentKey(nextRows[0], 0) : "");
      })
      .catch((loadError) => {
        if (!active) return;
        setStudents([]);
        setAnalytics(null);
        setError(loadError?.message || "Could not load students and attendance for this class.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [classId, className, reloadToken, sessions, timezone]);

  const roster = useMemo(() => students.map((student, index) => ({
    student,
    key: studentKey(student, index),
    name: studentName(student),
  })), [students]);

  const filteredRoster = useMemo(() => {
    const wanted = normalize(query).toLowerCase();
    if (!wanted) return roster;
    return roster.filter(({ student, name }) => [
      name,
      student.email,
      studentCode(student),
      studentPhone(student),
      student.status,
      student.paymentStatus,
    ].map((value) => normalize(value).toLowerCase()).some((value) => value.includes(wanted)));
  }, [query, roster]);

  const selectedEntry = roster.find((entry) => entry.key === selectedKey) || filteredRoster[0] || roster[0] || null;
  const selected = selectedEntry?.student || null;
  const phone = selected ? studentPhone(selected) : "";
  const callNumber = normalizePhoneForLink(phone);
  const whatsapp = whatsappNumber(phone);
  const email = normalize(selected?.email);
  const name = selected ? studentName(selected) : "";
  const selectedAttendance = attendanceSummaryFor(analytics, selected || {});
  const attendanceHistory = useMemo(() => [...(selectedAttendance?.records || [])]
    .sort((left, right) => (right.startsAtMs || 0) - (left.startsAtMs || 0)), [selectedAttendance?.records]);
  const selectedDeletionKey = selectedEntry?.key || "";
  const canDeleteSelected = Boolean(
    normalize(selected?.id)
      || normalize(selected?.uid)
      || normalize(selected?.studentCode)
      || normalize(selected?.studentcode)
      || email,
  );

  const deleteSelectedStudent = async () => {
    if (!selected || !canDeleteSelected || deletingStudentKey) return;

    const confirmed = window.prompt(
      `ADMIN OVERRIDE: permanently delete ${name || "this student"} even if an active contract exists. This removes the Falowen account and linked student records. Type DELETE to continue.`,
    );
    if (confirmed !== "DELETE") return;

    const targetIdentifiers = new Set([
      selected.id,
      selected.uid,
      selected.studentCode,
      selected.studentcode,
      selected.email,
    ].map(comparable).filter(Boolean));

    setDeletingStudentKey(selectedDeletionKey || "deleting");
    setError("");
    setActionFeedback("");
    try {
      await deleteStudentAccount(selected);
      setStudents((current) => current.filter((student) => {
        const identifiers = [
          student.id,
          student.uid,
          student.studentCode,
          student.studentcode,
          student.email,
        ].map(comparable).filter(Boolean);
        return !identifiers.some((identifier) => targetIdentifiers.has(identifier));
      }));
      setSelectedKey("");
      setActionFeedback(`${name || "Student"} was permanently deleted. An active contract did not block the admin deletion.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Unable to delete this student account.");
    } finally {
      setDeletingStudentKey("");
    }
  };

  return (
    <article className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Students in {className || "this class"}</h2>
          <p style={{ marginBottom: 0 }}>
            Select one student to review their profile and complete attendance history.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <strong>{students.length} student{students.length === 1 ? "" : "s"}</strong>
          <button type="button" disabled={loading} onClick={() => setReloadToken((value) => value + 1)}>
            {loading ? "Loading…" : "Refresh roster and check-ins"}
          </button>
          <Link to="/students">Open full Students page</Link>
        </div>
      </div>

      {error ? <div style={{ marginTop: 14, padding: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: 8 }}>{error}</div> : null}
      {actionFeedback ? <div style={{ marginTop: 14, padding: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 8 }}>{actionFeedback}</div> : null}
      {loading ? <p>Loading students and attendance for the selected class…</p> : null}

      {!loading && !error && !students.length ? (
        <div style={{ marginTop: 16, padding: 14, border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 10 }}>
          <strong>No active students were matched to this class.</strong>
          <p style={{ marginBottom: 0 }}>Check that each student has the same class ID or class name as <strong>{className || classId}</strong>.</p>
        </div>
      ) : null}

      {!loading && students.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(230px, 0.8fr) minmax(0, 1.7fr)", gap: 16, marginTop: 16 }}>
          <aside style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, alignSelf: "start" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <strong>Search class roster</strong>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email, phone or student code"
              />
            </label>
            <div style={{ display: "grid", gap: 8, marginTop: 12, maxHeight: 520, overflowY: "auto" }}>
              {filteredRoster.map((entry) => {
                const active = entry.key === selectedEntry?.key;
                const summary = attendanceSummaryFor(analytics, entry.student);
                return (
                  <button
                    type="button"
                    key={entry.key}
                    onClick={() => setSelectedKey(entry.key)}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 8,
                      border: active ? "1px solid #2457ff" : "1px solid #cbd5e1",
                      background: active ? "#eff6ff" : "#fff",
                      color: "#0f172a",
                    }}
                  >
                    <strong style={{ display: "block" }}>{entry.name}</strong>
                    <small>{displayValue(studentCode(entry.student), entry.student.email)}</small>
                    {summary ? <small style={{ display: "block", marginTop: 4 }}>Attendance: {summary.attendancePercent}% · Absent: {summary.absent}</small> : null}
                  </button>
                );
              })}
              {!filteredRoster.length ? <p style={{ margin: 0 }}>No student matches this search.</p> : null}
            </div>
          </aside>

          {selected ? (
            <section style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{name}</h3>
                  <p style={{ margin: "5px 0 0", color: "#475569" }}>
                    {displayValue(selected.status, selected.studentStatus, selected.enrollmentStatus, "Active")} · {displayValue(selected.level, levelId)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {email ? <a href={`mailto:${email}`}>Email</a> : null}
                  {callNumber ? <a href={`tel:${callNumber}`}>Call</a> : null}
                  {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
                  <Link to="/student-activity">Student Activity</Link>
                  <Link to="/student-results">Results</Link>
                  <Link to={`/attendance/session/${encodeURIComponent(classId)}`}>Class Attendance</Link>
                  <button
                    type="button"
                    onClick={deleteSelectedStudent}
                    disabled={!canDeleteSelected || Boolean(deletingStudentKey)}
                    title="Admin override: permanently delete even with an active contract"
                    style={{
                      background: "#dc2626",
                      borderColor: "#b91c1c",
                      color: "#fff",
                      cursor: !canDeleteSelected || deletingStudentKey ? "not-allowed" : "pointer",
                      opacity: !canDeleteSelected || deletingStudentKey ? 0.6 : 1,
                    }}
                  >
                    {deletingStudentKey === selectedDeletionKey ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 16 }}>
                {detail("Student code", studentCode(selected))}
                {detail("Email", email || "Not set")}
                {detail("Phone", phone || "Not set")}
                {detail("Class", displayValue(selected.className, selected.class, className))}
                {detail("Level / program", displayValue(selected.level, selected.program, levelId))}
                {detail("Learning mode", displayValue(selected.learningMode, selected.mode, selected.location))}
                {detail("Payment status", displayValue(selected.paymentStatus, selected.status))}
                {detail("Tuition fee", formatMoney(selected.tuitionFee, selected.fee))}
                {detail("Paid", formatMoney(selected.paid, selected.initialPaymentAmount, selected.amountPaid))}
                {detail("Balance due", formatMoney(selected.balanceDue, selected.balance, selected.outstandingBalance, selected.amountDue))}
                {detail("Contract start", displayValue(selected.contractStart, selected.enrollDate))}
                {detail("Contract end", displayValue(selected.contractEnd))}
              </div>

              <section style={{ marginTop: 22, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Attendance history</h3>
                    <p style={{ margin: "5px 0 0", color: "#64748b" }}>QR scans and manual attendance use the same class records.</p>
                  </div>
                  <Link to="/attendance">Open full attendance tracker</Link>
                </div>

                {selectedAttendance ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: 9, marginTop: 14 }}>
                      {detail("Sessions held", selectedAttendance.sessionsHeld)}
                      {detail("Attendance", `${selectedAttendance.attendancePercent}%`)}
                      {detail("Present", selectedAttendance.present)}
                      {detail("Late", selectedAttendance.late)}
                      {detail("Absent", selectedAttendance.absent)}
                      {detail("Consecutive absences", selectedAttendance.consecutiveAbsences)}
                      {detail("Last check-in", formatDateTime(selectedAttendance.lastCheckin, analytics?.timezone || timezone))}
                    </div>

                    <div style={{ overflowX: "auto", marginTop: 14, maxHeight: 480 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                        <thead><tr><th>Session</th><th>Date</th><th>Status</th><th>Check-in time</th><th>Method</th></tr></thead>
                        <tbody>
                          {attendanceHistory.map((record) => (
                            <tr key={`${record.sessionId}-${record.studentKey}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: 8 }}>{record.sessionTopic}</td>
                              <td style={{ padding: 8 }}>{formatDateTime(record.startsAt, analytics?.timezone || timezone)}</td>
                              <td style={{ padding: 8 }}><span style={{ ...statusStyle(record.status), padding: "4px 8px", borderRadius: 999, fontWeight: 700 }}>{statusLabel(record.status)}</span></td>
                              <td style={{ padding: 8 }}>{formatDateTime(record.checkedInAt, analytics?.timezone || timezone)}</td>
                              <td style={{ padding: 8 }}>{record.method || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <p>No attendance record is available for this student yet.</p>}
              </section>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}