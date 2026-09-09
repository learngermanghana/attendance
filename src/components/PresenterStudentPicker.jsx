import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listClasses } from "../services/classesService.js";
import { listStudentsByClass } from "../services/studentsService.js";
import {
  getCurrentClassParticipationSession,
  saveClassParticipationSession,
} from "../services/classParticipationService.js";
import { buildA1PresenterQuestionPool, resultLabel } from "../utils/a1PresenterQuestionPool.js";
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

function lower(value) {
  return normalize(value).toLowerCase();
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

function recordedResult(status = "") {
  if (status === "needsHelp") return "needs_review";
  if (status === "absent") return "presenter_absent";
  return status;
}

function rosterEntries(rows = []) {
  return rows.map((student, index) => ({
    student,
    key: studentKey(student, index),
    name: studentName(student),
  }));
}

function recordMatchesEntry(record = {}, entry = {}) {
  const student = entry.student || {};
  const uid = studentUid(student);
  const code = studentCode(student);
  const email = lower(studentEmail(student));
  const name = lower(entry.name);
  if (uid && normalize(record.studentUid) === uid) return true;
  if (code && lower(record.studentCode) === code) return true;
  if (email && lower(record.studentEmail || record.studentEmailNormalized) === email) return true;
  return Boolean(name && lower(record.studentName) === name);
}

function cloudStateFromRecords(records = [], entries = []) {
  const nextStats = {};
  const nextAbsent = new Set();
  entries.forEach((entry) => {
    const record = records.find((candidate) => recordMatchesEntry(candidate, entry));
    if (!record) return;
    nextStats[entry.key] = {
      name: entry.name,
      turns: Number(record.turns || 0),
      correct: Number(record.correct || 0),
      needsHelp: Number(record.needsReview || record.needsHelp || 0),
      skipped: Number(record.skipped || 0),
      responses: Array.isArray(record.questionResponses) ? record.questionResponses : [],
    };
    if (record.presenterAbsent) nextAbsent.add(entry.key);
  });
  return { stats: nextStats, absentKeys: nextAbsent };
}

function responseIdentity(response = {}) {
  return [
    normalize(response.questionId),
    normalize(response.recordedAt),
    normalize(response.result),
    normalize(response.question),
  ].join("|");
}

function mergeResponses(first = [], second = []) {
  const merged = new Map();
  [...first, ...second].forEach((response) => {
    if (!response || typeof response !== "object") return;
    merged.set(responseIdentity(response), response);
  });
  return [...merged.values()].sort((a, b) => String(a.recordedAt || "").localeCompare(String(b.recordedAt || "")));
}

function mergeStats(localStats = {}, cloudStats = {}) {
  const keys = new Set([...Object.keys(cloudStats), ...Object.keys(localStats)]);
  const merged = {};
  keys.forEach((key) => {
    const local = localStats[key] || {};
    const cloud = cloudStats[key] || {};
    const responses = mergeResponses(cloud.responses, local.responses);
    const responseCorrect = responses.filter((response) => response.result === "correct").length;
    const responseNeedsReview = responses.filter((response) => response.result === "needs_review").length;
    merged[key] = {
      name: local.name || cloud.name || "Student",
      turns: Math.max(Number(local.turns || 0), Number(cloud.turns || 0), responseCorrect + responseNeedsReview),
      correct: Math.max(Number(local.correct || 0), Number(cloud.correct || 0), responseCorrect),
      needsHelp: Math.max(Number(local.needsHelp || local.needsReview || 0), Number(cloud.needsHelp || cloud.needsReview || 0), responseNeedsReview),
      skipped: Math.max(Number(local.skipped || 0), Number(cloud.skipped || 0)),
      responses,
    };
  });
  return merged;
}

function mergeAbsent(localAbsent = new Set(), cloudAbsent = new Set(), overrides = new Map()) {
  const keys = new Set([...localAbsent, ...cloudAbsent, ...overrides.keys()]);
  const merged = new Set();
  keys.forEach((key) => {
    if (overrides.has(key)) {
      if (overrides.get(key)) merged.add(key);
      return;
    }
    if (localAbsent.has(key) || cloudAbsent.has(key)) merged.add(key);
  });
  return merged;
}

function hasLocalParticipation(saved = {}) {
  return Object.keys(saved.stats || {}).length > 0 || (Array.isArray(saved.absentKeys) && saved.absentKeys.length > 0);
}

export default function PresenterStudentPicker({
  slide,
  questions = [],
  questionContext = "",
  onQuestionChange,
  renderQuestionExternally = false,
}) {
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => safeStorageGet(LAST_CLASS_KEY));
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [roundPicked, setRoundPicked] = useState(() => new Set());
  const [roundQuestionIds, setRoundQuestionIds] = useState(() => new Set());
  const [currentQuestionId, setCurrentQuestionId] = useState("");
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);
  const [absentKeys, setAbsentKeys] = useState(() => new Set());
  const [stats, setStats] = useState({});
  const [lastMarked, setLastMarked] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [syncState, setSyncState] = useState("idle");
  const [cloudRevision, setCloudRevision] = useState(0);
  const [hydratedIdentity, setHydratedIdentity] = useState("");
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const saveSequence = useRef(0);
  const restoreSequence = useRef(0);
  const absenceOverrides = useRef(new Map());

  const course = normalize(slide?.course).toUpperCase();
  const assignmentId = normalize(slide?.assignmentId || slide?.id);
  const sessionDate = localDateKey();
  const activeClasses = useMemo(() => classOptions.filter((entry) => !entry.archived && entry.status !== "archived"), [classOptions]);
  const matchingClasses = useMemo(() => {
    const matches = activeClasses.filter((entry) => classMatchesCourse(entry, course));
    return matches.length ? matches : activeClasses;
  }, [activeClasses, course]);
  const selectedClass = useMemo(
    () => matchingClasses.find((entry) => classIdOf(entry) === selectedClassId) || null,
    [matchingClasses, selectedClassId],
  );
  const roster = useMemo(() => rosterEntries(students), [students]);
  const sessionIdentity = `${selectedClassId}|${assignmentId}|${sessionDate}`;
  const hasQuestionMode = Array.isArray(questions) && questions.length > 0;
  const questionSignature = useMemo(
    () => (Array.isArray(questions) ? questions : []).map((question) => `${normalize(question?.questionDe || question?.question)}|${normalize(question?.answerDe || question?.answer)}`).join("||"),
    [questions],
  );
  const questionPool = useMemo(() => buildA1PresenterQuestionPool(
    questions,
    Math.max(roster.length, questions.length || 0),
    `${normalize(slide?.assignmentId || slide?.id || "a1")}-${normalize(questionContext || "class-check")}`,
  ), [questions, roster.length, slide?.assignmentId, slide?.id, questionContext]);

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
    if (!selectedClassId || !assignmentId) {
      setStudents([]);
      setHydratedIdentity("");
      setSyncState("idle");
      return undefined;
    }

    let cancelled = false;
    const restoreId = restoreSequence.current + 1;
    restoreSequence.current = restoreId;
    safeStorageSet(LAST_CLASS_KEY, selectedClassId);
    setLoadingStudents(true);
    setError("");
    setSaveState("idle");
    setSyncState("restoring");
    setHydratedIdentity("");
    setCloudRevision(0);
    setDirtyVersion(0);
    setSavedVersion(0);
    absenceOverrides.current.clear();
    setCurrentKey("");
    setCurrentQuestionId("");
    setShowQuestionAnswer(false);
    setLastMarked("");
    setRoundPicked(new Set());
    setRoundQuestionIds(new Set());
    onQuestionChange?.(null);

    const storageKey = participationStorageKey(slide, selectedClassId);
    const saved = readParticipation(storageKey);
    setStats(saved.stats || {});
    setAbsentKeys(new Set(Array.isArray(saved.absentKeys) ? saved.absentKeys : []));

    (async () => {
      try {
        const rosterRows = await listStudentsByClass(selectedClassId, { className: selectedClass?.name || selectedClassId });
        if (cancelled || restoreSequence.current !== restoreId) return;
        const safeRows = Array.isArray(rosterRows) ? rosterRows : [];
        setStudents(safeRows);

        try {
          const cloud = await getCurrentClassParticipationSession({ classId: selectedClassId, assignmentId, sessionDate });
          if (cancelled || restoreSequence.current !== restoreId) return;
          if (cloud?.session) {
            const restored = cloudStateFromRecords(cloud.records, rosterEntries(safeRows));
            setStats(restored.stats);
            setAbsentKeys(restored.absentKeys);
            setCloudRevision(Number(cloud.session.revision || 0));
            setSavedVersion(0);
            setSyncState("synced");
          } else {
            setCloudRevision(0);
            setSyncState("synced");
            if (hasLocalParticipation(saved)) setDirtyVersion(1);
          }
          setHydratedIdentity(sessionIdentity);
        } catch (cloudError) {
          console.error("class participation restore failed", cloudError);
          if (cancelled || restoreSequence.current !== restoreId) return;
          setHydratedIdentity(sessionIdentity);
          setSyncState("offline");
        }
      } catch {
        if (!cancelled) {
          setStudents([]);
          setHydratedIdentity(sessionIdentity);
          setSyncState("offline");
          setError("Could not load the student roster for this class.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedClassId, selectedClass?.name, assignmentId, sessionDate, sessionIdentity, slide, onQuestionChange]);

  useEffect(() => {
    setCurrentKey("");
    setCurrentQuestionId("");
    setShowQuestionAnswer(false);
    setLastMarked("");
    setRoundPicked(new Set());
    setRoundQuestionIds(new Set());
    onQuestionChange?.(null);
  }, [questionContext, questionSignature, onQuestionChange]);

  useEffect(() => {
    if (!selectedClassId) return;
    safeStorageSet(
      participationStorageKey(slide, selectedClassId),
      JSON.stringify({ stats, absentKeys: [...absentKeys], cloudRevision }),
    );
  }, [stats, absentKeys, cloudRevision, selectedClassId, slide]);

  const refreshFromCloud = useCallback(async () => {
    if (!selectedClassId || !assignmentId || !students.length) return;
    const restoreId = restoreSequence.current + 1;
    restoreSequence.current = restoreId;
    setSyncState("restoring");
    try {
      const cloud = await getCurrentClassParticipationSession({ classId: selectedClassId, assignmentId, sessionDate });
      if (restoreSequence.current !== restoreId) return;
      if (cloud?.session) {
        const restored = cloudStateFromRecords(cloud.records, rosterEntries(students));
        setStats(restored.stats);
        setAbsentKeys(restored.absentKeys);
        setCloudRevision(Number(cloud.session.revision || 0));
        absenceOverrides.current.clear();
      }
      setHydratedIdentity(sessionIdentity);
      setSyncState("synced");
      setSaveState("idle");
    } catch (cloudError) {
      console.error("class participation refresh failed", cloudError);
      setSyncState("offline");
    }
  }, [selectedClassId, assignmentId, sessionDate, students, sessionIdentity]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (dirtyVersion !== savedVersion) return;
      if (saveState === "saving" || saveState === "pending") return;
      refreshFromCloud();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [dirtyVersion, savedVersion, saveState, refreshFromCloud]);

  useEffect(() => {
    if (!selectedClassId || !assignmentId || loadingStudents || !roster.length) return undefined;
    if (hydratedIdentity !== sessionIdentity || syncState === "restoring") return undefined;
    if (dirtyVersion === savedVersion) return undefined;

    const sequence = saveSequence.current + 1;
    saveSequence.current = sequence;
    const versionToSave = dirtyVersion;
    setSaveState("pending");

    const timer = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        const result = await saveClassParticipationSession({
          classId: selectedClassId,
          className: selectedClass?.name || selectedClassId,
          course,
          assignmentId,
          lessonId: normalize(slide?.id || slide?.assignmentId),
          lessonDay: normalize(slide?.day),
          lessonTitle: normalize(slide?.title || slide?.topic),
          sessionDate,
          questionPoolSize: questionPool.length,
          baseRevision: cloudRevision,
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
              questionResponses: Array.isArray(row.responses) ? row.responses : [],
            };
          }),
        });
        if (saveSequence.current !== sequence) return;
        setCloudRevision(Number(result?.revision ?? cloudRevision));
        setSavedVersion(versionToSave);
        setSaveState("saved");
        setSyncState("synced");
        absenceOverrides.current.clear();
      } catch (saveError) {
        console.error("class participation save failed", saveError);
        if (saveSequence.current !== sequence) return;
        if (Number(saveError?.status) === 409 || saveError?.data?.code === "participation_conflict") {
          setSaveState("conflict");
          setSyncState("restoring");
          try {
            const cloud = await getCurrentClassParticipationSession({ classId: selectedClassId, assignmentId, sessionDate });
            if (saveSequence.current !== sequence) return;
            const restored = cloudStateFromRecords(cloud.records, roster);
            setStats((currentStats) => mergeStats(currentStats, restored.stats));
            setAbsentKeys((currentAbsent) => mergeAbsent(currentAbsent, restored.absentKeys, absenceOverrides.current));
            setCloudRevision(Number(cloud?.session?.revision || saveError?.data?.currentRevision || 0));
            setSyncState("synced");
            setDirtyVersion((version) => version + 1);
          } catch (refreshError) {
            console.error("class participation conflict refresh failed", refreshError);
            setSaveState("failed");
            setSyncState("offline");
          }
        } else {
          setSaveState("failed");
          setSyncState("offline");
        }
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    stats,
    absentKeys,
    dirtyVersion,
    savedVersion,
    selectedClassId,
    selectedClass,
    course,
    assignmentId,
    slide,
    roster,
    loadingStudents,
    questionPool.length,
    sessionDate,
    cloudRevision,
    hydratedIdentity,
    sessionIdentity,
    syncState,
  ]);

  const current = roster.find((entry) => entry.key === currentKey) || null;
  const eligible = roster.filter((entry) => !absentKeys.has(entry.key));
  const absentStudents = roster.filter((entry) => absentKeys.has(entry.key));
  const currentQuestion = questionPool.find((question) => question.id === currentQuestionId) || null;
  const participatedKeys = new Set(Object.keys(stats).filter((key) => Number(stats[key]?.turns || 0) > 0));
  const correctCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.correct || 0), 0);
  const helpCount = Object.values(stats).reduce((sum, row) => sum + Number(row?.needsHelp || row?.needsReview || 0), 0);
  const availableQuestionCount = Math.max(0, questionPool.length - roundQuestionIds.size);
  const interactionLocked = loadingStudents || syncState === "restoring" || hydratedIdentity !== sessionIdentity;

  function publishQuestion(question) {
    if (!question) {
      onQuestionChange?.(null);
      return;
    }
    const poolPosition = questionPool.findIndex((candidate) => candidate.id === question.id) + 1;
    onQuestionChange?.({ ...question, poolPosition, poolSize: questionPool.length });
  }

  function pickStudent() {
    if (interactionLocked || !eligible.length) return;

    let availableStudents = eligible.filter((entry) => !roundPicked.has(entry.key));
    let nextRoundPicked = new Set(roundPicked);
    let nextRoundQuestionIds = new Set(roundQuestionIds);
    if (!availableStudents.length) {
      nextRoundPicked = new Set();
      nextRoundQuestionIds = new Set();
      availableStudents = eligible;
    }

    const picked = randomItem(availableStudents);
    if (!picked) return;
    nextRoundPicked.add(picked.key);

    let assignedQuestion = null;
    if (hasQuestionMode && questionPool.length) {
      let availableQuestions = questionPool.filter((question) => !nextRoundQuestionIds.has(question.id));
      if (!availableQuestions.length) {
        nextRoundQuestionIds = new Set();
        availableQuestions = questionPool;
      }
      const previousQuestionIds = new Set(
        (Array.isArray(stats[picked.key]?.responses) ? stats[picked.key].responses : [])
          .map((response) => normalize(response?.questionId))
          .filter(Boolean),
      );
      const unseenForStudent = availableQuestions.filter((question) => !previousQuestionIds.has(question.id));
      assignedQuestion = randomItem(unseenForStudent.length ? unseenForStudent : availableQuestions);
      if (assignedQuestion) nextRoundQuestionIds.add(assignedQuestion.id);
    }

    setRoundPicked(nextRoundPicked);
    setRoundQuestionIds(nextRoundQuestionIds);
    setCurrentKey(picked.key);
    setCurrentQuestionId(assignedQuestion?.id || "");
    setShowQuestionAnswer(false);
    setLastMarked("");
    publishQuestion(assignedQuestion);
  }

  function markCurrent(status) {
    if (!current || lastMarked || interactionLocked) return;
    if (hasQuestionMode && !currentQuestion) return;
    const result = recordedResult(status);
    const response = currentQuestion ? {
      questionId: currentQuestion.id,
      question: currentQuestion.questionDe,
      sourceQuestion: currentQuestion.sourceQuestion || currentQuestion.questionDe,
      result,
      questionContext: normalize(questionContext),
      recordedAt: new Date().toISOString(),
    } : null;

    setStats((currentStats) => {
      const previous = currentStats[current.key] || { name: current.name, turns: 0, correct: 0, needsHelp: 0, skipped: 0, responses: [] };
      const next = { ...previous, name: current.name, responses: Array.isArray(previous.responses) ? [...previous.responses] : [] };
      if (status === "correct") {
        next.turns += 1;
        next.correct += 1;
      } else if (status === "needsHelp") {
        next.turns += 1;
        next.needsHelp += 1;
      } else if (status === "skip") {
        next.skipped += 1;
      }
      if (response) next.responses.push(response);
      return { ...currentStats, [current.key]: next };
    });

    if (status === "absent") {
      absenceOverrides.current.set(current.key, true);
      setAbsentKeys((currentAbsent) => new Set([...currentAbsent, current.key]));
    }
    setLastMarked(status);
    setDirtyVersion((version) => version + 1);
  }

  function markJoinedLate(key) {
    if (!key || interactionLocked) return;
    absenceOverrides.current.set(key, false);
    setAbsentKeys((currentAbsent) => {
      const next = new Set(currentAbsent);
      next.delete(key);
      return next;
    });
    setRoundPicked((currentRound) => {
      const next = new Set(currentRound);
      next.delete(key);
      return next;
    });
    if (currentKey === key && lastMarked === "absent") setLastMarked("");
    setDirtyVersion((version) => version + 1);
  }

  function resetLessonParticipation() {
    roster.forEach((entry) => absenceOverrides.current.set(entry.key, false));
    setCurrentKey("");
    setCurrentQuestionId("");
    setShowQuestionAnswer(false);
    setRoundPicked(new Set());
    setRoundQuestionIds(new Set());
    setAbsentKeys(new Set());
    setStats({});
    setLastMarked("");
    setDirtyVersion((version) => version + 1);
    publishQuestion(null);
  }

  const saveLabel = syncState === "restoring"
    ? "Restoring from cloud…"
    : saveState === "saving" || saveState === "pending"
      ? "Cloud saving…"
      : saveState === "saved"
        ? "Cloud saved"
        : saveState === "conflict"
          ? "Syncing newer cloud data…"
          : syncState === "offline" || saveState === "failed"
            ? "Offline · saved on this device"
            : syncState === "synced"
              ? "Cloud synced"
              : "";
  const resultText = lastMarked ? resultLabel(recordedResult(lastMarked)) : "";
  const mustRecordBeforeNext = Boolean(hasQuestionMode && current && currentQuestion && !lastMarked);

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
          <span>{syncState === "restoring" ? "Restoring participation…" : loadingStudents ? "Loading roster…" : current ? "Current student" : "Students"}</span>
          <strong>{current?.name || (students.length ? `${students.length} ready` : "Select class")}</strong>
        </div>

        {current ? (
          <div className="presenter-student-actions" role="group" aria-label="Record student response">
            <button type="button" className="is-correct" onClick={() => markCurrent("correct")} disabled={interactionLocked || Boolean(lastMarked) || (hasQuestionMode && !currentQuestion)}>Correct</button>
            <button type="button" className="is-help" onClick={() => markCurrent("needsHelp")} disabled={interactionLocked || Boolean(lastMarked) || (hasQuestionMode && !currentQuestion)}>Needs help</button>
            <button type="button" className="is-quiet" onClick={() => markCurrent("skip")} disabled={interactionLocked || Boolean(lastMarked) || (hasQuestionMode && !currentQuestion)}>Skip</button>
            <button
              type="button"
              className="is-quiet"
              title="Removes this learner from the presenter rotation only; official attendance is unchanged."
              onClick={() => markCurrent("absent")}
              disabled={interactionLocked || Boolean(lastMarked) || (hasQuestionMode && !currentQuestion)}
            >
              Absent
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="presenter-pick-student"
          onClick={pickStudent}
          disabled={interactionLocked || !eligible.length || mustRecordBeforeNext}
          title={mustRecordBeforeNext ? "Record Correct, Needs help, Skip or Absent before moving to another student." : ""}
        >
          {syncState === "restoring" ? "Restoring…" : mustRecordBeforeNext ? "Record result first" : current ? "Next student →" : "Pick student"}
        </button>

        <details className="presenter-student-more">
          <summary aria-label="Participation details">•••</summary>
          <div className="presenter-student-more-panel">
            <strong>Lesson participation</strong>
            <p>Participated {participatedKeys.size}/{eligible.length} · Correct {correctCount} · Needs review {helpCount} · Presenter absent {absentKeys.size}</p>
            {hasQuestionMode ? <p>Unique questions {questionPool.length} · {availableQuestionCount} still unused in this round.</p> : null}
            <small>Cloud sync lets you continue the same lesson on another signed-in device. “Absent” only removes a learner from this presenter rotation and never changes official attendance or grades.</small>
            {absentStudents.length ? (
              <div className="presenter-absent-list">
                <strong>Presenter absent</strong>
                {absentStudents.map((entry) => (
                  <div key={entry.key} className="presenter-absent-row">
                    <span>{entry.name}</span>
                    <button type="button" onClick={() => markJoinedLate(entry.key)} disabled={interactionLocked}>Joined late</button>
                  </div>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={refreshFromCloud} disabled={interactionLocked || dirtyVersion !== savedVersion}>Refresh from cloud</button>
            <button type="button" onClick={resetLessonParticipation} disabled={interactionLocked || !students.length}>Reset participation</button>
          </div>
        </details>
      </div>

      {hasQuestionMode && !renderQuestionExternally ? (
        <div className="presenter-student-question-card">
          <div>
            <span>Unique A1 concept question</span>
            <strong>{currentQuestion?.questionDe || "Pick a student to assign a question."}</strong>
          </div>
          {currentQuestion ? (
            <button type="button" onClick={() => setShowQuestionAnswer((currentValue) => !currentValue)}>
              {showQuestionAnswer ? "Hide answer" : "Reveal answer"}
            </button>
          ) : null}
          {showQuestionAnswer && currentQuestion ? <p>{currentQuestion.answerDe}</p> : null}
        </div>
      ) : null}

      <div className="presenter-student-status-line" aria-live="polite">
        <span>Participation {participatedKeys.size}/{eligible.length} · {correctCount} correct · {helpCount} need review</span>
        {hasQuestionMode ? <span>Questions {questionPool.length} · {availableQuestionCount} available</span> : null}
        {resultText ? <strong>Recorded: {resultText}</strong> : null}
        {saveLabel ? <strong className={`presenter-student-save-state is-${saveState || syncState}`}>{saveLabel}</strong> : null}
        {error ? <strong className="presenter-student-error">{error}</strong> : null}
      </div>
    </section>
  );
}
