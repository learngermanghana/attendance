import { useEffect, useMemo, useState } from "react";
import answersDictionary from "../data/answers_dictionary.json";
import { loadRoster, loadSubmissions, saveScoreRow } from "../services/markingService.js";
import { useToast } from "../context/ToastContext.jsx";

const DEFAULT_REFERENCE_LINK =
  "https://docs.google.com/spreadsheets/d/1bENY4-5AG9hrgaDKqyNpTwKT02i58wGva6tVRn-hhbE/gviz/tq?tqx=out:html&sheet=Key";

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

export default function MarkingPage() {
  const { success, error } = useToast();
  const [roster, setRoster] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [referenceAssignment, setReferenceAssignment] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  const referenceEntries = useMemo(() => {
    if (Array.isArray(answersDictionary)) return answersDictionary;
    return Object.entries(answersDictionary || {}).map(([assignment, data]) => ({
      assignment,
      ...data,
    }));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rosterRows, submissionRows] = await Promise.all([loadRoster(), loadSubmissions()]);
        setRoster(rosterRows);
        setSubmissions(submissionRows);

        const firstReference = referenceEntries?.[0]?.assignment || "";
        setReferenceAssignment(firstReference);
      } catch (err) {
        error(err?.message || "Failed to load marking data");
      } finally {
        setLoading(false);
      }
    })();
  }, [referenceEntries]);

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

  const formattedReferenceAnswers = useMemo(() => {
    if (referenceEntry?.reference) return referenceEntry.reference;
    const lines = flattenAnswers(referenceEntry?.answers);
    return lines.join("\n");
  }, [referenceEntry]);

  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];
    return submissions.filter((row) => {
      const codeMatch = row.studentCode && selectedStudent.studentCode && normalize(row.studentCode) === normalize(selectedStudent.studentCode);
      const nameMatch = normalize(row.studentName) && normalize(row.studentName) === normalize(selectedStudent.name);
      return codeMatch || nameMatch;
    });
  }, [selectedStudent, submissions]);

  const selectedSubmission = useMemo(() => {
    if (!studentSubmissions.length) return null;

    const exact = studentSubmissions.find((row) => normalize(row.assignment) === normalize(referenceAssignment));
    return exact || studentSubmissions[0];
  }, [studentSubmissions, referenceAssignment]);

  const combinedReferenceAndSubmission = useMemo(() => {
    const referenceText = (formattedReferenceAnswers || "No reference answer available.").trim();
    const submissionText = (selectedSubmission?.text || "No student submission available.").trim();

    return `Reference Answer\n${referenceText}\n\nStudent Submission\n${submissionText}`;
  }, [formattedReferenceAnswers, selectedSubmission]);

  const handleCopyCombined = async () => {
    try {
      await navigator.clipboard.writeText(combinedReferenceAndSubmission);
      success("Combined reference and submission copied.");
    } catch {
      error("Could not copy combined text. Please copy manually.");
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
    if (!feedback.trim()) {
      error("Feedback is required.");
      return;
    }

    try {
      const row = await saveScoreRow({
        studentCode: selectedStudent.studentCode,
        name: selectedStudent.name,
        assignment: referenceEntry.assignment,
        score: Number(score),
        comments: feedback.trim(),
        level: selectedStudent.level || referenceEntry.level || inferLevel(referenceEntry.assignment),
        link: referenceEntry.answer_url || DEFAULT_REFERENCE_LINK,
      });
      success(`Saved score for ${row.name} (${row.assignment}).`);
    } catch (err) {
      error(err?.message || "Failed to save score");
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
          <select value={referenceAssignment} onChange={(e) => setReferenceAssignment(e.target.value)}>
            {referenceEntries.map((entry) => (
              <option key={entry.assignment} value={entry.assignment}>
                {entry.assignment}
              </option>
            ))}
          </select>
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
        {selectedSubmission ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              Assignment: <b>{selectedSubmission.assignment || "Unknown"}</b> · Submitted: {selectedSubmission.createdAt?.toLocaleString() || "Unknown"}
            </div>
            <textarea readOnly rows={8} value={selectedSubmission.text || "No submission text available."} />
          </>
        ) : (
          <p style={{ margin: 0 }}>No submission found yet for this student.</p>
        )}
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
              onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value || 0))))}
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
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setScore(0); setFeedback(""); }}>Reset</button>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>6) Save to Google Sheets (and optionally Firestore)</h3>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
          Saves row headers: studentcode, name, assignment, score, comments, date, level, link.
        </p>
        <button onClick={handleSave} disabled={loading}>Save score</button>
      </section>
    </div>
  );
}
