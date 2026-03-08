import { useEffect, useMemo, useState } from "react";
import answersDictionary from "../data/answers_dictionary.json";
import { deleteSubmission, fetchSubmissions, hideSubmissionFromQueue, loadRoster, loadSubmissions, saveScoreRow } from "../services/markingService.js";
import { autoMarkSubmission } from "../utils/autoMarking.js";
import { buildAssignmentId } from "../utils/assignmentId.js";
import { useToast } from "../context/ToastContext.jsx";

const DEFAULT_REFERENCE_LINK =
  "https://docs.google.com/spreadsheets/d/1bENY4-5AG9hrgaDKqyNpTwKT02i58wGva6tVRn-hhbE/gviz/tq?tqx=out:html&sheet=Key";
const REFERENCE_ASSIGNMENT_STORAGE_KEY = "marking.referenceAssignment";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function flattenAnswers(value, prefix = "") {
  if (typeof value === "string") {
    return [`${prefix}${value}`];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}${key}. ` : `${key}: `;
    return flattenAnswers(nested, nextPrefix);
  });
}

function inferLevel(assignment = "") {
  const match = String(assignment).trim().match(/^([A-Z]\d+)/i);
  return match ? match[1].toUpperCase() : "";
}

function inferAssignmentId(...candidates) {
  for (const value of candidates) {
    const match = String(value || "").trim().match(/([A-Z]\d+-[\d._]+)/i);
    if (match?.[1]) {
      return match[1].toUpperCase().replace(/_/g, ".");
    }
  }
  return "";
}

function formatReferenceAssignmentLabel(entry = {}) {
  const assignment = String(entry.assignment || "").trim();
  if (!assignment) return "";

  const looksLikeBareId = /^[A-Z]\d+-/.test(assignment);
  const topic = String(entry.de || entry.en || "").trim();

  if (!looksLikeBareId || !topic) return assignment;
  return `${assignment.replace("-", " ")} — ${topic}`;
}

export default function MarkingPage() {
  const { success, error } = useToast();
  const [roster, setRoster] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionNotifications, setSubmissionNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [referenceAssignment, setReferenceAssignment] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REFERENCE_ASSIGNMENT_STORAGE_KEY) || "";
  });
  const [referenceQuery, setReferenceQuery] = useState("");
  const [score, setScore] = useState("");
  const [assignmentValue, setAssignmentValue] = useState("");
  const [assignmentIdValue, setAssignmentIdValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saveReceipt, setSaveReceipt] = useState(null);
  const [savingScore, setSavingScore] = useState(false);
  const [autoMarking, setAutoMarking] = useState(false);
  const [deletingSubmissionPath, setDeletingSubmissionPath] = useState("");
  const [activeSubmissionTab, setActiveSubmissionTab] = useState("latest");

  const referenceEntries = useMemo(() => {
    if (Array.isArray(answersDictionary)) {
      return answersDictionary.map((entry) => {
        const assignmentId = inferAssignmentId(entry.assignmentId, entry.assignment_id, entry.assignment, entry.assignmentKey);
        return {
          ...entry,
          assignment: String(entry.assignment || assignmentId || "").trim(),
          assignmentId,
          level: String(entry.level || inferLevel(entry.assignment || assignmentId)).toUpperCase(),
        };
      });
    }

    return Object.entries(answersDictionary || {}).map(([assignmentKey, data]) => {
      const assignmentId = inferAssignmentId(data?.assignmentId, data?.assignment_id, assignmentKey);
      const assignment = String(data?.assignment || assignmentId || assignmentKey || "").trim();
      return {
        assignment,
        assignmentId,
        level: String(data?.level || inferLevel(assignment)).toUpperCase(),
        assignmentAliases: [assignmentKey, assignmentId, assignment].filter(Boolean),
        ...data,
      };
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rosterRows = await loadRoster();
        setRoster(rosterRows);

        const firstReference = referenceEntries?.[0]?.assignment || "";
        setReferenceAssignment((current) => current || firstReference);
      } catch (err) {
        error(err?.message || "Failed to load marking data");
      } finally {
        setLoading(false);
      }
    })();
  }, [referenceEntries, error]);

  useEffect(() => {
    const selectedStudent = roster.find((row) => row.id === selectedStudentId);
    if (!selectedStudent?.studentCode || !selectedStudent?.level) {
      setSubmissions([]);
      return;
    }

    (async () => {
      setLoadingSubmissions(true);
      try {
        const submissionRows = await fetchSubmissions(selectedStudent.level, selectedStudent.studentCode);
        setSubmissions(submissionRows);
      } catch (err) {
        error(err?.message || "Failed to load student submissions");
      } finally {
        setLoadingSubmissions(false);
      }
    })();
  }, [roster, selectedStudentId, error]);

  useEffect(() => {
    let cancelled = false;

    const loadLatestSubmissions = async () => {
      setLoadingNotifications(true);
      try {
        const rows = await loadSubmissions();
        if (!cancelled) setSubmissionNotifications(rows);
      } catch (err) {
        if (!cancelled) error(err?.message || "Failed to load submission notifications");
      } finally {
        if (!cancelled) setLoadingNotifications(false);
      }
    };

    loadLatestSubmissions();
    const refreshId = window.setInterval(loadLatestSubmissions, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshId);
    };
  }, [error]);

  useEffect(() => {
    if (!referenceAssignment || typeof window === "undefined") return;
    window.localStorage.setItem(REFERENCE_ASSIGNMENT_STORAGE_KEY, referenceAssignment);
  }, [referenceAssignment]);

  const filteredStudents = useMemo(() => {
    if (!query.trim()) return roster;
    const q = normalize(query);
    return roster.filter((row) => normalize(row.name).includes(q) || normalize(row.studentCode).includes(q) || normalize(row.level).includes(q));
  }, [query, roster]);

  const selectedStudent = useMemo(() => {
    return roster.find((row) => row.id === selectedStudentId) || null;
  }, [roster, selectedStudentId]);

  const referenceEntry = useMemo(() => {
    return referenceEntries.find((entry) => entry.assignment === referenceAssignment) || null;
  }, [referenceAssignment, referenceEntries]);

  const filteredReferenceEntries = useMemo(() => {
    if (!referenceQuery.trim()) return referenceEntries;
    const q = normalize(referenceQuery);
    return referenceEntries.filter((entry) => {
      const assignment = normalize(entry.assignment);
      const level = normalize(entry.level);
      const referenceText = normalize(entry.reference || "");
      const topicDe = normalize(entry.de || "");
      const topicEn = normalize(entry.en || "");
      return assignment.includes(q) || level.includes(q) || referenceText.includes(q) || topicDe.includes(q) || topicEn.includes(q);
    });
  }, [referenceEntries, referenceQuery]);

  const formattedReferenceAnswers = useMemo(() => {
    if (referenceEntry?.reference) return referenceEntry.reference;
    const lines = flattenAnswers(referenceEntry?.answers);
    return lines.join("\n");
  }, [referenceEntry]);

  const studentSubmissions = useMemo(() => submissions, [submissions]);

  const latestSubmission = useMemo(() => {
    if (!studentSubmissions.length) return null;

    const selectedReference = referenceEntries.find((entry) => entry.assignment === referenceAssignment);
    const referenceAliases = [
      selectedReference?.assignment,
      selectedReference?.assignmentId,
      ...(selectedReference?.assignmentAliases || []),
    ].map(normalize).filter(Boolean);

    const exact = studentSubmissions.find((row) => {
      const submissionAssignmentId = inferAssignmentId(row.assignmentId, row.assignmentKey, row.assignment);
      const submissionAliases = [row.assignment, row.assignmentId, row.assignmentKey, submissionAssignmentId].map(normalize);
      return submissionAliases.some((alias) => referenceAliases.includes(alias));
    });
    return exact || studentSubmissions[0];
  }, [studentSubmissions, referenceAssignment, referenceEntries]);

  const selectedSubmission = latestSubmission;

  useEffect(() => {
    const submissionAssignment = selectedSubmission?.assignment || "";
    const nextAssignment = submissionAssignment || referenceEntry?.assignment || "";
    const submissionAssignmentId = selectedSubmission?.assignmentId || selectedSubmission?.assignmentKey || "";
    const level = selectedStudent?.level || referenceEntry?.level || inferLevel(nextAssignment);

    setAssignmentValue(nextAssignment);
    setAssignmentIdValue(submissionAssignmentId || buildAssignmentId(level, nextAssignment));
  }, [
    selectedStudent?.level,
    referenceEntry?.level,
    referenceEntry?.assignment,
    selectedSubmission?.assignment,
    selectedSubmission?.assignmentId,
    selectedSubmission?.assignmentKey,
  ]);

  const latestNotifications = useMemo(() => submissionNotifications.slice(0, 30), [submissionNotifications]);

  const combinedReferenceAndSubmission = useMemo(() => {
    const referenceText = (formattedReferenceAnswers || "No reference answer available.").trim();
    const submissionText = (selectedSubmission?.text || "No student submission available.").trim();

    return `Reference Answer\n${referenceText}\n\nStudent Submission\n${submissionText}`;
  }, [formattedReferenceAnswers, selectedSubmission]);

  const handleDeleteSubmission = async (submission) => {
    if (!submission?.path) {
      error("Could not delete submission: missing document path.");
      return;
    }

    const confirmed = window.confirm("Delete this submission permanently? This cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingSubmissionPath(submission.path);
      await deleteSubmission(submission.path);
      setSubmissions((prev) => prev.filter((row) => row.path !== submission.path));
      setSubmissionNotifications((prev) => prev.filter((row) => row.path !== submission.path));
      success("Submission deleted.");
    } catch (err) {
      error(err?.message || "Failed to delete submission.");
    } finally {
      setDeletingSubmissionPath("");
    }
  };

  const handleSelectFromNotification = async (submission) => {
    if (!submission?.studentCode || !submission?.level) {
      error("This notification is missing student information and cannot be opened.");
      return;
    }

    const matchingStudent = roster.find((row) => {
      const sameCode = normalize(row.studentCode) && normalize(row.studentCode) === normalize(submission.studentCode);
      const sameLevel = normalize(row.level) && normalize(row.level) === normalize(submission.level);
      return sameCode && sameLevel;
    }) || roster.find((row) => normalize(row.studentCode) === normalize(submission.studentCode));

    if (!matchingStudent) {
      setSubmissionNotifications((prev) => prev.filter((row) => row.path !== submission.path));
      error("Student for this submission was not found in the roster.");
      return;
    }

    let freshRows = [];
    try {
      freshRows = await fetchSubmissions(matchingStudent.level, matchingStudent.studentCode);
    } catch (err) {
      error(err?.message || "Failed to verify this submission before loading.");
      return;
    }

    const submissionStillExists = submission.path
      ? freshRows.some((row) => row.path === submission.path)
      : freshRows.some((row) => normalize(row.assignment) === normalize(submission.assignment));

    if (!submissionStillExists) {
      setSubmissionNotifications((prev) => prev.filter((row) => row.path !== submission.path));
      error("This submission no longer exists (it may already be deleted).");
      return;
    }

    setSubmissions(freshRows);
    setSelectedStudentId(matchingStudent.id);
    setQuery("");
    setActiveSubmissionTab("latest");

    const matchingReference = referenceEntries.find((entry) => normalize(entry.assignment) === normalize(submission.assignment));
    if (matchingReference?.assignment) {
      setReferenceAssignment(matchingReference.assignment);
    }

    const nextAssignment = submission.assignment || matchingReference?.assignment || "";
    const submissionAssignmentId = submission.assignmentId || submission.assignmentKey || "";
    const level = matchingStudent.level || matchingReference?.level || inferLevel(nextAssignment);
    setAssignmentValue(nextAssignment);
    setAssignmentIdValue(submissionAssignmentId || buildAssignmentId(level, nextAssignment));
  };

  const handleCopyCombined = async () => {
    try {
      await navigator.clipboard.writeText(combinedReferenceAndSubmission);
      success("Combined reference and submission copied.");
    } catch {
      error("Could not copy combined text. Please copy manually.");
    }
  };


  const handleAutoMark = async () => {
    if (!referenceEntry) {
      error("Pick a reference answer before auto-marking.");
      return;
    }

    const submissionText = selectedSubmission?.text || "";
    if (!submissionText.trim()) {
      error("No student submission available to auto-mark.");
      return;
    }

    try {
      setAutoMarking(true);
      const result = autoMarkSubmission({ referenceEntry, submissionText });
      setScore(String(result.score));
      setFeedback(result.feedback);
      success("AI auto-mark draft applied. Please review before saving.");
    } catch (err) {
      error(err?.message || "Failed to auto-mark submission.");
    } finally {
      setAutoMarking(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      error("Pick a student before saving.");
      return;
    }
    if (!referenceEntry) {
      error("Pick a reference answer before saving.");
      return;
    }
    if (!assignmentValue.trim()) {
      error("Assignment is required.");
      return;
    }
    if (!assignmentIdValue.trim()) {
      error("Assignment ID is required.");
      return;
    }
    if (!feedback.trim()) {
      error("Feedback is required.");
      return;
    }
    if (score === "") {
      error("Score is required.");
      return;
    }

    try {
      setSavingScore(true);
      const level = selectedStudent.level || referenceEntry.level || inferLevel(referenceEntry.assignment);
      const safeAssignment = assignmentValue.trim();

      const receipt = await saveScoreRow({
        studentCode: selectedStudent.studentCode,
        name: selectedStudent.name,
        assignment: safeAssignment,
        assignmentId: assignmentIdValue.trim(),
        score: Number(score),
        comments: feedback.trim(),
        level,
        link: referenceEntry.answer_url || DEFAULT_REFERENCE_LINK,
      });
      setSaveReceipt(receipt);

      const successfulTargets = [
        receipt.sheet.success ? "Google Sheets" : null,
        receipt.firestore.success ? "Firestore" : null,
      ].filter(Boolean);

      const targetMessage = successfulTargets.length
        ? `Saved to ${successfulTargets.join(" and ")}.`
        : "Save completed with warnings.";

      if (selectedSubmission?.path) {
        await hideSubmissionFromQueue(selectedSubmission.path);
        setSubmissions((prev) => prev.filter((row) => row.path !== selectedSubmission.path));
        setSubmissionNotifications((prev) => prev.filter((row) => row.path !== selectedSubmission.path));
      }

      success(`Saved score for ${receipt.row.name} (${receipt.row.assignment} · ${receipt.row.assignment_id || "No assignment ID"}). ${targetMessage}`);
    } catch (err) {
      if (err?.receipt) {
        setSaveReceipt(err.receipt);
      }
      error(err?.message || "Failed to save score");
    } finally {
      setSavingScore(false);
    }
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <h2>Student Work Marking</h2>
      <p style={{ marginTop: -8, opacity: 0.8 }}>
        5-stage flow: student → reference answer → submission → score/feedback → save to Google Sheets (optional Firestore mirror).
      </p>

      {loading && <p>Loading roster and submissions...</p>}

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>1) Pick a student</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            placeholder="Search by student name/code/level"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={{ minWidth: 320 }}>
            <option value="">Select student...</option>
            {filteredStudents.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name || "(No name)"} · {row.studentCode || "No code"} · {row.level || "No level"}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>2) Pick a reference answer</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Search reference answers by assignment/level"
            value={referenceQuery}
            onChange={(e) => setReferenceQuery(e.target.value)}
          />
          <select value={referenceAssignment} onChange={(e) => setReferenceAssignment(e.target.value)}>
            {filteredReferenceEntries.map((entry) => (
              <option key={entry.assignment} value={entry.assignment}>
                {formatReferenceAssignmentLabel(entry)}
              </option>
            ))}
          </select>
          {!filteredReferenceEntries.length && (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>No reference answers match your search.</p>
          )}
          <textarea value={formattedReferenceAnswers} readOnly rows={10} />
          {referenceEntry?.answer_url && (
            <a href={referenceEntry.answer_url} target="_blank" rel="noreferrer">
              Open answer source
            </a>
          )}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>3) Load student submission</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setActiveSubmissionTab("latest")}
            style={{ fontWeight: activeSubmissionTab === "latest" ? 700 : 400 }}
          >
            Latest submission
          </button>
          <button
            onClick={() => setActiveSubmissionTab("notifications")}
            style={{ fontWeight: activeSubmissionTab === "notifications" ? 700 : 400 }}
          >
            Incoming notifications
          </button>
        </div>
        {loadingSubmissions ? (
          <p style={{ margin: 0 }}>Loading submissions...</p>
        ) : activeSubmissionTab === "latest" ? (
          selectedSubmission ? (
            <>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                Assignment: <b>{selectedSubmission.assignment || "Unknown"}</b>
                {selectedSubmission.assignmentId ? <> · ID: <code>{selectedSubmission.assignmentId}</code></> : null}
                {" · "}Status: {selectedSubmission.status || "submitted"} · Submitted: {selectedSubmission.createdAt?.toLocaleString() || "Unknown"}
              </div>
              <textarea readOnly rows={8} value={selectedSubmission.text || "No submission text available."} />
            </>
          ) : (
            <p style={{ margin: 0 }}>No submission found yet for this student.</p>
          )
        ) : activeSubmissionTab === "notifications" ? (
          loadingNotifications ? (
            <p style={{ margin: 0 }}>Loading notifications...</p>
          ) : latestNotifications.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {latestNotifications.map((row) => (
                <div key={row.path || row.id} style={{ border: "1px solid #e1e1e1", borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13 }}>
                    <b>{row.studentName || "Unknown student"}</b> ({row.studentCode || "No code"}) · {row.level || "No level"}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <b>{row.assignment || "Unknown assignment"}</b> · {row.status || "submitted"} · {row.createdAt?.toLocaleString() || "Unknown time"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <button onClick={() => void handleSelectFromNotification(row)}>Load for marking</button>
                    <button
                      onClick={() => handleDeleteSubmission(row)}
                      disabled={deletingSubmissionPath === row.path}
                    >
                      {deletingSubmissionPath === row.path ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0 }}>No incoming submissions found yet.</p>
          )
        ) : null}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>4) Combined reference + student answer</h3>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
          Use this combined block for quick copy/paste into external marking tools.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <textarea readOnly rows={12} value={combinedReferenceAndSubmission} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCopyCombined}>Copy combined text</button>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>5) Enter score and feedback</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Score (0-100)
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => {
                const nextValue = e.target.value;
                if (nextValue === "") {
                  setScore("");
                  return;
                }

                setScore(String(Math.max(0, Math.min(100, Number(nextValue)))));
              }}
            />
          </label>
          <label>
            Feedback
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={8}
              style={{ fontSize: "1rem", lineHeight: 1.6, minHeight: 180 }}
              placeholder="Write clear, actionable feedback for the student..."
            />
          </label>
          <label>
            Assignment
            <input value={assignmentValue} onChange={(e) => setAssignmentValue(e.target.value)} />
          </label>
          <label>
            Assignment ID (loaded from submission when available; editable)
            <input value={assignmentIdValue} onChange={(e) => setAssignmentIdValue(e.target.value)} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAutoMark} disabled={autoMarking || !selectedSubmission}>
              {autoMarking ? "Auto-marking..." : "Auto-mark with AI"}
            </button>
            <button onClick={() => { setScore(""); setFeedback(""); }}>Reset</button>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>6) Save to Google Sheets (and optionally Firestore)</h3>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
          Saves row headers: studentcode, name, assignment, score, comments, date, level, link, assignment_id.
        </p>
        <button onClick={handleSave} disabled={loading || savingScore}>{savingScore ? "Saving..." : "Save score"}</button>
        {savingScore && <p style={{ marginTop: 8, fontSize: 13 }}>Saving score, please wait...</p>}
        {saveReceipt && (
          <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 8, padding: 10, background: "#fafafa", display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              <b>Save receipt:</b> {saveReceipt.row.name} · {saveReceipt.row.assignment} · ID: <code>{saveReceipt.row.assignment_id || "—"}</code>
            </div>
            <div style={{ fontSize: 13 }}>
              Google Sheets: <b>{saveReceipt.sheet.success ? "Success" : "Failed"}</b>
              <div style={{ opacity: 0.85 }}>{saveReceipt.sheet.message}</div>
            </div>
            <div style={{ fontSize: 13 }}>
              Firestore mirror: <b>{saveReceipt.firestore.success ? "Success" : "Failed"}</b>
              <div style={{ opacity: 0.85 }}>{saveReceipt.firestore.message}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
