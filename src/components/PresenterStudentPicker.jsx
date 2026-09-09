import { useEffect, useMemo, useRef, useState } from "react";
import { listClasses } from "../services/classesService.js";
import { listStudentsByClass } from "../services/studentsService.js";
import { saveClassParticipationSession } from "../services/classParticipationService.js";
import "./PresenterStudentPicker.css";

const LAST_CLASS_KEY = "falowen:presenter:last-class";

function safeStorageGet(key, fallback = "") {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Presenter remains usable when browser storage is unavailable.
  }
}

function normalize(value) {
  return String(value || "").trim();
}

function localDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function studentKey(student = {}, index = 0) {
  return normalize(student.studentCode || student.studentcode || student.uid || student.email || student.id || `${student.name}-${index}`)
    .toLowerCase();
}

function studentName(student = {}) {
  return normalize(student.name || student.fullName || student.displayName || student.email || "Student");
}

function studentCode(student = {}) {
  return normalize(student.studentCode || student.studentcode || student.student_code || student.code).toLowerCase();
}

function studentEmail(student = {}) {
  return normalize(student.email || student.studentEmail || student.emailAddress);
}

function studentUid(student = {}) {
  return normalize(student.uid || student.firebaseUid || student.firebaseUID || student.authUid);
}

function classIdOf(entry = {}) {
  return normalize(entry.classId || entry.name || entry.id);
}

function classMatchesCourse(entry = {}, course = "") {
  const expected = normalize(course).toUpperCase();
  if (!expected) return true;
  const candidates = [entry.levelId, entry.level, entry.courseLevel, entry.languageLevel, entry.classId, entry.name]
    .map((value) => normalize(value).toUpperCase())
    .filter(Boolean);
  return candidates.some((value) => value === expected || value.startsWith(`${expected} `));
}

function participationStorageKey(slide = {}, classId = "") {
  const lesson = normalize(slide.assignmentId || slide.id || `${slide.course || "course"}-${slide.day || "lesson"}`);
  return `falowen:presenter:participation:${lesson}:${classId}`;
}

function readParticipation(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function randomItem(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function markedLabel(value = "") {
  if (value === "needsHelp") return "Needs help";
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function PresenterStudentPicker({ slide }) {
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => safeStorageGet(LAST_CLASS_KEY));
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [roundPicked, setRoundPicked] = useState(() => new Set());
  const [absentKeys, setAbsentKeys] = useState(() => new Set());
  const [stats, setStats] = useState({});
  const [lastMarked, setLastMarked] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const saveSequence = useRef(0);

  const course = normalize(slide?.course).toUpperCase();
  const activeClasses = useMemo(() => classOptions.filter((entry) => !entry.archived && entry.status !== "archived"), [classOptions]);
  const matchingClasses = useMemo(() => {
    const matches = activeClasses.filter((entry) => classMatchesCourse(entry, course));
    return matches.length ? matches : activeClasses;
  }, [activeClasses, course]);
  const selectedClass = useMemo(
    () => matchingClasses.find((entry) => classIdOf(entry) === selectedClassId) || null,
    [matchingClasses, selectedClassId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      try {
        const classes = await listClasses();
        if (cancelled) return;
        setClassOptions(Array.isArray(classes) ? classes : []);
      } catch {
        if (!cancelled) setError("Could not load classes.");
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!matchingClasses.length) return;
    const validSelection = matchingClasses.some((entry) => classIdOf(entry) === selectedClassId);
    if (!validSelection) setSelectedClassId(classIdOf(matchingClasses[0]));
  }, [matchingClasses, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return undefined;
    }

    let cancelled = false;
    safeStorageSet(LAST_CLASS_KEY, selectedClassId);
    setLoadingStudents(true);
    setError("");
    setSaveState("idle");
    setCurrentKey("");
    setLastMarked("");
    setRoundPicked(new Set());

    const storageKey = participationStorageKey(slide, selectedClassId);
    const saved = readParticipation(storageKey);
    setStats(saved.stats || {});
    setAbsentKeys(new Set(Array.isArray(saved.absentKeys) ? saved.absentKeys : []));

    (async () => {
      try {
        const roster = await listStudentsByClass(selectedClassId, { className: selectedClass?.name || selectedClassId });
        if (!cancelled) setStudents(Array.isArray(roster) ? roster : []);
      } catch {
        if (!cancelled) {
          setStudents([]);
          setError("Could not load the student roster for this class.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedClassId, selectedClass, slide]);

  useEffect(() => {
    if (!selectedClassId) return;
    safeStorageSet(
      participationStorageKey(slide, selectedClassId),
      JSON.stringify({ stats, absentKeys: [...absentKeys] }),
    );
  }, [stats, absentKeys, selectedClassId, slide]);

  const roster = useMemo(() => students.map((student, index) => ({
    student,
    key: studentKey(student, index),
    name: studentName(student),
  })), [students]);

  useEffect(() => {
    if (!selectedClassId || loadingStudents || !roster.length) return undefined;
    const sequence = saveSequence.current + 1;
    saveSequence.current = sequence;
    setSaveState("pending");

    const timer = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        await saveClassParticipationSession({
          classId: selectedClassId,
          className: selectedClass?.name || selectedClassId,
          course,
          assignmentId: normalize(slide?.assignmentId || slide?.id),
          lessonId: normalize(slide?.id || slide?.assignmentId),
          lessonDay: normalize(slide?.day),
          lessonTitle: normalize(slide?.title || slide?.topic),
          sessionDate: localDateKey(),
          students: roster.map(({ student, key, name }) => {
            const row = stats[key] || {};
            return {
              studentUid: studentUid(student),
              studentCode: studentCode(student),
              studentEmail: studentEmail(student),
              studentName: name,
              turns: Number(row.turns || 0),
              correct: Number(row.correct || 0),
              needsReview: Number(row.needsHelp || row.needsReview || 0),
              skipped: Number(row.skipped || 0),
              presenterAbsent: absentKeys.has(key),
            };
          }),
        });
        if (saveSequence.current === sequence) setSaveState("saved");
      } catch (saveError) {
        console.error("class participation save failed", saveError);
        if (saveSequence.current === sequence) setSaveState("failed");
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [stats, absentKeys, selectedClassId, selectedClass, course, slide, roster, loadingStudents]);

  const current = roster.find((entry) => entry.key === currentKey) || null;
  const eligible = roster.filter((entry) => !absentKeys.has(entry.key));
  const participatedKeys = new Set(Object.keys(stats).filter((key) => Number(stats[key]?.turns || 0) > 0));
  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);
  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);

  function pickStudent() {
    if (!eligible.length) {
      setCurrentKey("");
      return;
    }

    let available = eligible.filter((entry) => !roundPicked.has(entry.key));
    let nextRound = new Set(roundPicked);
    if (!available.length) {
      nextRound = new Set();
      available = eligible;
    }

    const picked = randomItem(available);
    if (!picked) return;
    nextRound.add(picked.key);
    setRoundPicked(nextRound);
    setCurrentKey(picked.key);
    setLastMarked("");
  }

  function markCurrent(status) {
    if (!current || lastMarked) return;
    setStats((currentStats) => {
      const previous = currentStats[current.key] || { name: current.name, turns: 0, correct: 0, needsHelp: 0, skipped: 0 };
      const next = { ...previous, name: current.name };
      if (status === "correct") {
        next.turns += 1;
        next.correct += 1;
      } else if (status === "needsHelp") {
        next.turns += 1;
        next.needsHelp += 1;
      } else if (status === "skip") {
        next.skipped += 1;
      }
      return { ...currentStats, [current.key]: next };
    });

    if (status === "absent") {
      setAbsentKeys((currentAbsent) => new Set([...currentAbsent, current.key]));
    }
    setLastMarked(status);
  }

  function resetLessonParticipation() {
    setCurrentKey("");
    setRoundPicked(new Set());
    setAbsentKeys(new Set());
    setStats({});
    setLastMarked("");
  }

  const saveLabel = saveState === "saving" || saveState === "pending"
    ? "Saving…"
    : saveState === "saved"
      ? "Saved"
      : saveState === "failed"
        ? "Save failed"
        : "";

  return (
    <section className="presenter-student-picker" aria-label="Random student participation">
      <div className="presenter-student-toolbar">
        <label className="presenter-student-class-select">
          <span>Class</span>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            disabled={loadingClasses}
          >
            {!matchingClasses.length ? <option value="">No class available</option> : null}
            {matchingClasses.map((entry) => {
              const id = classIdOf(entry);
              return <option key={id} value={id}>{entry.name || id}</option>;
            })}
          </select>
        </label>

        <div className={`presenter-student-current ${current ? "is-active" : ""}`}>
          <span>{loadingStudents ? "Loading roster…" : current ? "Current student" : "Students"}</span>
          <strong>{current?.name || (students.length ? `${students.length} ready` : "Select class")}</strong>
        </div>

        {current ? (
          <div className="presenter-student-actions" role="group" aria-label="Record student response">
            <button type="button" className="is-correct" onClick={() => markCurrent("correct")} disabled={Boolean(lastMarked)}>Correct</button>
            <button type="button" className="is-help" onClick={() => markCurrent("needsHelp")} disabled={Boolean(lastMarked)}>Needs help</button>
            <button type="button" className="is-quiet" onClick={() => markCurrent("skip")} disabled={Boolean(lastMarked)}>Skip</button>
            <button
              type="button"
              className="is-quiet"
              title="Removes this learner from the presenter rotation only; official attendance is unchanged."
              onClick={() => markCurrent("absent")}
              disabled={Boolean(lastMarked)}
            >
              Absent
            </button>
          </div>
        ) : null}

        <button type="button" className="presenter-pick-student" onClick={pickStudent} disabled={loadingStudents || !eligible.length}>
          {current ? "Next student →" : "Pick student"}
        </button>

        <details className="presenter-student-more">
          <summary aria-label="Participation details">•••</summary>
          <div className="presenter-student-more-panel">
            <strong>Lesson participation</strong>
            <p>Participated {participatedKeys.size}/{eligible.length} · Correct {correctCount} · Needs review {helpCount} · Presenter absent {absentKeys.size}</p>
            <small>Saved to Class Participation. “Absent” only removes a learner from this presenter rotation and never changes official attendance or grades.</small>
            <button type="button" onClick={resetLessonParticipation} disabled={!students.length}>Reset participation</button>
          </div>
        </details>
      </div>

      <div className="presenter-student-status-line" aria-live="polite">
        <span>Participation {participatedKeys.size}/{eligible.length} · {correctCount} correct · {helpCount} need review</span>
        {lastMarked ? <strong>Recorded: {markedLabel(lastMarked)}</strong> : null}
        {saveLabel ? <strong className={`presenter-student-save-state is-${saveState}`}>{saveLabel}</strong> : null}
        {error ? <strong className="presenter-student-error">{error}</strong> : null}
      </div>
    </section>
  );
}
