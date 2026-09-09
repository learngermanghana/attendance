import { useEffect, useMemo, useState } from "react";
import { listClasses } from "../services/classesService.js";
import { listStudentsByClass } from "../services/studentsService.js";
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

function studentKey(student = {}, index = 0) {
  return normalize(student.studentCode || student.studentcode || student.uid || student.email || student.id || `${student.name}-${index}`)
    .toLowerCase();
}

function studentName(student = {}) {
  return normalize(student.name || student.fullName || student.displayName || student.email || "Student");
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

  const course = normalize(slide?.course).toUpperCase();
  const activeClasses = useMemo(() => classOptions.filter((entry) => !entry.archived && entry.status !== "archived"), [classOptions]);
  const matchingClasses = useMemo(() => {
    const matches = activeClasses.filter((entry) => classMatchesCourse(entry, course));
    return matches.length ? matches : activeClasses;
  }, [activeClasses, course]);

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
    setCurrentKey("");
    setLastMarked("");
    setRoundPicked(new Set());

    const storageKey = participationStorageKey(slide, selectedClassId);
    const saved = readParticipation(storageKey);
    setStats(saved.stats || {});
    setAbsentKeys(new Set(Array.isArray(saved.absentKeys) ? saved.absentKeys : []));

    (async () => {
      try {
        const selectedClass = matchingClasses.find((entry) => classIdOf(entry) === selectedClassId);
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
  }, [selectedClassId, matchingClasses, slide]);

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

  const current = roster.find((entry) => entry.key === currentKey) || null;
  const eligible = roster.filter((entry) => !absentKeys.has(entry.key));
  const participatedKeys = new Set(Object.keys(stats).filter((key) => Number(stats[key]?.turns || 0) > 0));
  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);
  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || 0), 0);

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

  return (
    <section className="presenter-student-picker" aria-label="Random student participation">
      <div className="presenter-student-picker-row">
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

        <div className="presenter-student-current">
          <span>{loadingStudents ? "Loading roster…" : current ? "Student" : "Random student"}</span>
          <strong>{current?.name || (students.length ? `${students.length} students ready` : "Select a class")}</strong>
        </div>

        <button type="button" className="presenter-pick-student" onClick={pickStudent} disabled={loadingStudents || !eligible.length}>
          {current ? "Next student" : "Pick student"}
        </button>
      </div>

      {current ? (
        <div className="presenter-student-actions">
          <button type="button" onClick={() => markCurrent("correct")} disabled={Boolean(lastMarked)}>Correct</button>
          <button type="button" onClick={() => markCurrent("needsHelp")} disabled={Boolean(lastMarked)}>Needs help</button>
          <button type="button" onClick={() => markCurrent("skip")} disabled={Boolean(lastMarked)}>Skip</button>
          <button type="button" onClick={() => markCurrent("absent")} disabled={Boolean(lastMarked)}>Absent</button>
          {lastMarked ? <span className="presenter-student-marked">Recorded: {lastMarked === "needsHelp" ? "Needs help" : lastMarked}</span> : null}
        </div>
      ) : null}

      <div className="presenter-student-summary">
        <span>Participated {participatedKeys.size}/{eligible.length}</span>
        <span>Correct {correctCount}</span>
        <span>Needs help {helpCount}</span>
        <span>Presenter absent {absentKeys.size}</span>
        <button type="button" onClick={resetLessonParticipation} disabled={!students.length}>Reset</button>
      </div>
      <small className="presenter-student-note">Participation is for this presenter lesson only. “Absent” does not change official attendance.</small>
      {error ? <small className="presenter-student-error">{error}</small> : null}
    </section>
  );
}
