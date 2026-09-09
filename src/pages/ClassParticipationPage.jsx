import { useEffect, useMemo, useState } from "react";
import { listClasses } from "../services/classesService.js";
import {
  getClassParticipationSession,
  listClassParticipationSessions,
} from "../services/classParticipationService.js";
import "./ClassParticipationPage.css";

function clean(value) {
  return String(value || "").trim();
}

function classIdOf(entry = {}) {
  return clean(entry.classId || entry.name || entry.id);
}

function percentage(part, whole) {
  const denominator = Number(whole || 0);
  if (!denominator) return 0;
  return Math.round((Number(part || 0) / denominator) * 100);
}

function formatDate(value = "") {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClassParticipationPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listClasses();
        if (cancelled) return;
        const active = (Array.isArray(rows) ? rows : []).filter((entry) => !entry.archived && entry.status !== "archived");
        setClasses(active);
        if (active.length) setClassId(classIdOf(active[0]));
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "Could not load classes.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!classId) {
      setSessions([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedId("");
    setDetail(null);
    (async () => {
      try {
        const rows = await listClassParticipationSessions(classId);
        if (!cancelled) setSessions(rows);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "Could not load participation sessions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError("");
    (async () => {
      try {
        const data = await getClassParticipationSession(selectedId);
        if (!cancelled) setDetail(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "Could not load participation details.");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const totals = useMemo(() => sessions.reduce((summary, session) => ({
    sessions: summary.sessions + 1,
    roster: summary.roster + Number(session.rosterCount || 0),
    participated: summary.participated + Number(session.participatedCount || 0),
    correct: summary.correct + Number(session.correctCount || 0),
    needsReview: summary.needsReview + Number(session.needsReviewCount || 0),
  }), { sessions: 0, roster: 0, participated: 0, correct: 0, needsReview: 0 }), [sessions]);

  const records = Array.isArray(detail?.records) ? detail.records : [];

  return (
    <section className="class-participation-page">
      <header className="class-participation-header">
        <div>
          <p className="class-participation-eyebrow">Teaching insights</p>
          <h1>Class Participation</h1>
          <p>Live presenter participation saved from Teaching Slides. This is diagnostic learning data only and never changes grades or official attendance.</p>
        </div>
        <label>
          <span>Class</span>
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            {!classes.length ? <option value="">No active classes</option> : null}
            {classes.map((entry) => {
              const id = classIdOf(entry);
              return <option key={id} value={id}>{entry.name || id}</option>;
            })}
          </select>
        </label>
      </header>

      <div className="class-participation-summary" aria-label="Participation summary">
        <article><span>Recorded lessons</span><strong>{totals.sessions}</strong></article>
        <article><span>Participation rate</span><strong>{percentage(totals.participated, totals.roster)}%</strong></article>
        <article><span>Correct responses</span><strong>{totals.correct}</strong></article>
        <article><span>Needs review</span><strong>{totals.needsReview}</strong></article>
      </div>

      {error ? <p className="class-participation-error" role="alert">{error}</p> : null}

      <div className="class-participation-layout">
        <section className="class-participation-panel">
          <div className="class-participation-panel-heading">
            <div>
              <h2>Lesson sessions</h2>
              <p>Select a lesson to see each learner’s participation.</p>
            </div>
          </div>

          {loading ? <p className="class-participation-empty">Loading participation…</p> : null}
          {!loading && !sessions.length ? (
            <p className="class-participation-empty">No presenter participation has been saved for this class yet.</p>
          ) : null}
          <div className="class-participation-session-list">
            {sessions.map((session) => {
              const rate = percentage(session.participatedCount, session.rosterCount);
              return (
                <button
                  type="button"
                  key={session.id}
                  className={selectedId === session.id ? "is-selected" : ""}
                  onClick={() => setSelectedId(session.id)}
                >
                  <span className="class-participation-session-date">{formatDate(session.sessionDate)}</span>
                  <strong>{session.lessonDay || session.assignmentId} · {session.lessonTitle || session.assignmentId}</strong>
                  <span>{session.participatedCount || 0}/{session.rosterCount || 0} participated · {rate}% · {session.needsReviewCount || 0} need review</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="class-participation-panel class-participation-detail">
          <div className="class-participation-panel-heading">
            <div>
              <h2>{detail?.session ? `${detail.session.lessonDay || detail.session.assignmentId} details` : "Student participation"}</h2>
              <p>{detail?.session ? formatDate(detail.session.sessionDate) : "Choose a lesson session."}</p>
            </div>
          </div>

          {loadingDetail ? <p className="class-participation-empty">Loading students…</p> : null}
          {!loadingDetail && !detail ? <p className="class-participation-empty">No lesson selected.</p> : null}
          {detail ? (
            <div className="class-participation-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Turns</th>
                    <th>Correct</th>
                    <th>Needs review</th>
                    <th>Skipped</th>
                    <th>Presenter status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.studentName || record.studentCode || "Student"}</strong></td>
                      <td>{record.turns || 0}</td>
                      <td>{record.correct || 0}</td>
                      <td>{record.needsReview || 0}</td>
                      <td>{record.skipped || 0}</td>
                      <td>{record.presenterAbsent ? "Not in presenter rotation" : Number(record.turns || 0) > 0 ? "Participated" : "Not selected yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="class-participation-note">
        <strong>How to use this data</strong>
        <p>Use “Needs review” to decide what to revisit in the next lesson. A learner’s participation count is not an academic score, and presenter absence is not the official attendance record.</p>
      </aside>
    </section>
  );
}
