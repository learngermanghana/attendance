import { useEffect, useMemo, useState } from "react";
import answersDictionary from "../data/answers_dictionary.json";
import { loadRoster, loadSubmissions, saveScoreRow } from "../services/markingService.js";

const DEFAULT_REFERENCE_LINK =
  "https://docs.google.com/spreadsheets/d/1bENY4-5AG9hrgaDKqyNpTwKT02i58wGva6tVRn-hhbE/gviz/tq?tqx=out:html&sheet=Key";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export default function MarkingPage() {
  const [roster, setRoster] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [referenceAssignment, setReferenceAssignment] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessage("");
      try {
        const [rosterRows, submissionRows] = await Promise.all([loadRoster(), loadSubmissions()]);
        setRoster(rosterRows);
        setSubmissions(submissionRows);

        const firstReference = answersDictionary?.[0]?.assignment || "";
        setReferenceAssignment(firstReference);
      } catch (err) {
        setMessage(`❌ ${err?.message || "Failed to load marking data"}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!query.trim()) return roster;
    const q = normalize(query);
    return roster.filter((row) => normalize(row.name).includes(q) || normalize(row.studentCode).includes(q) || normalize(row.level).includes(q));
  }, [query, roster]);

  const selectedStudent = useMemo(() => {
    return roster.find((row) => row.id === selectedStudentId) || null;
  }, [roster, selectedStudentId]);

  const referenceEntry = useMemo(() => {
    return answersDictionary.find((entry) => entry.assignment === referenceAssignment) || null;
  }, [referenceAssignment]);

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

  const handleSave = async () => {
    if (!selectedStudent) {
      setMessage("❌ Pick a student before saving.");
      return;
    }
    if (!referenceEntry) {
      setMessage("❌ Pick a reference answer before saving.");
      return;
    }
    if (!feedback.trim()) {
      setMessage("❌ Feedback is required.");
      return;
    }

    try {
      const row = await saveScoreRow({
        studentCode: selectedStudent.studentCode,
        name: selectedStudent.name,
        assignment: referenceEntry.assignment,
        score: Number(score),
        comments: feedback.trim(),
        level: selectedStudent.level || referenceEntry.level || "",
        link: DEFAULT_REFERENCE_LINK,
      });
      setMessage(`✅ Saved score for ${row.name} (${row.assignment}).`);
    } catch (err) {
      setMessage(`❌ ${err?.message || "Failed to save score"}`);
    }
  };

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <h2>Student Work Marking</h2>
      <p style={{ marginTop: -8, opacity: 0.8 }}>
        5-stage flow: student → reference answer → submission → score/feedback → save to Google Sheets (optional Firestore mirror).
      </p>

      {loading && <p>Loading roster and submissions...</p>}
      {message && <p style={{ margin: 0 }}>{message}</p>}

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
            {answersDictionary.map((entry) => (
              <option key={entry.assignment} value={entry.assignment}>
                {entry.assignment}
              </option>
            ))}
          </select>
          <textarea value={referenceEntry?.reference || ""} readOnly rows={6} />
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
        <h3>4) Enter score and feedback</h3>
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
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Write student feedback..." />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setScore(0); setFeedback(""); }}>Reset</button>
          </div>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>5) Save to Google Sheets (and optionally Firestore)</h3>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
          Saves row headers: studentcode, name, assignment, score, comments, date, level, link.
        </p>
        <button onClick={handleSave} disabled={loading}>Save score</button>
      </section>
    </div>
  );
}
