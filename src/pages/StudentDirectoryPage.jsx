import { useEffect, useMemo, useState } from "react";
import { listAllStudents, updateStudentById } from "../services/studentsService";
import { useToast } from "../context/ToastContext";

const editableFields = [
  "email",
  "phone",
  "studentCode",
  "level",
  "className",
  "program",
  "location",
  "status",
  "tuitionFee",
  "initialPaymentAmount",
  "paymentIntentAmount",
  "balanceDue",
  "paymentStatus",
  "contractStart",
  "contractEnd",
  "contractTermMonths",
];

const dateFields = new Set(["contractStart", "contractEnd"]);

const fieldLabels = {
  email: "Email",
  phone: "Phone",
  studentCode: "Student code",
  level: "Level",
  className: "Class name",
  program: "Program",
  location: "Location",
  status: "Status",
  tuitionFee: "Tuition fee",
  initialPaymentAmount: "Initial payment amount",
  paymentIntentAmount: "Payment intent amount",
  balanceDue: "Balance due",
  paymentStatus: "Payment status",
  contractStart: "Contract start",
  contractEnd: "Contract end",
  contractTermMonths: "Contract term months",
};

function normalizeEditableValue(value) {
  return String(value ?? "");
}

function normalizeDateValue(value) {
  const raw = normalizeEditableValue(value).trim();
  if (!raw) return "";

  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return raw;

  const utcYear = asDate.getUTCFullYear();
  const utcMonth = String(asDate.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(asDate.getUTCDate()).padStart(2, "0");
  return `${utcYear}-${utcMonth}-${utcDay}`;
}

export default function StudentDirectoryPage() {
  const { pushToast } = useToast();
  const [students, setStudents] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const records = await listAllStudents();
        setStudents(records);
      } catch (err) {
        setError(err?.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;

    return students.filter((student) => {
      const haystack = [
        student.name,
        student.email,
        student.studentCode,
        student.className,
        student.status,
        student.phone,
        student.level,
        student.program,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [students, query]);

  useEffect(() => {
    if (filteredStudents.length === 0) {
      setSelectedStudentId("");
      return;
    }

    const hasSelected = filteredStudents.some((student) => student.id === selectedStudentId);
    if (!hasSelected) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  const getDraft = (student) => {
    const currentDraft = drafts[student.id];
    if (currentDraft) return currentDraft;

    return editableFields.reduce((acc, field) => {
      const normalized = dateFields.has(field) ? normalizeDateValue(student[field]) : normalizeEditableValue(student[field]);
      acc[field] = normalized;
      return acc;
    }, {});
  };

  const selectedStudent = useMemo(
    () => filteredStudents.find((student) => student.id === selectedStudentId) || null,
    [filteredStudents, selectedStudentId],
  );

  const updateDraftField = (studentId, field, value, student) => {
    setDrafts((prev) => {
      const existing = prev[studentId] || getDraft(student);
      return {
        ...prev,
        [studentId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const saveStudent = async (student) => {
    const draft = getDraft(student);
    const payload = {};

    for (const field of editableFields) {
      const incomingValue = normalizeEditableValue(draft[field]).trim();
      const originalValue = dateFields.has(field)
        ? normalizeDateValue(student[field]).trim()
        : normalizeEditableValue(student[field]).trim();

      if (incomingValue !== originalValue) {
        payload[field] = incomingValue;
      }
    }

    if (Object.keys(payload).length === 0) {
      pushToast({ type: "info", message: `No changes to save for ${student.name || student.id}.` });
      return;
    }

    setSavingId(student.id);
    try {
      await updateStudentById(student.id, payload);
      setStudents((prev) => prev.map((record) => (record.id === student.id ? { ...record, ...payload } : record)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[student.id];
        return next;
      });
      pushToast({ type: "success", message: `Saved ${student.name || student.id}.` });
    } catch (err) {
      pushToast({ type: "error", message: err?.message || "Failed to save student" });
    } finally {
      setSavingId("");
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, padding: 16 }}>
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
        <h1 style={{ margin: "0 0 8px" }}>Student Directory</h1>
        <p style={{ margin: "0 0 12px", opacity: 0.8 }}>
          Open one student at a time to view and edit details from Firestore.
        </p>
        <label htmlFor="student-search" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Search students
        </label>
        <input
          id="student-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, class, student code..."
          style={{ width: "100%", maxWidth: 460, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccd4e2" }}
        />
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
        {loading && <p>Loading students...</p>}
        {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

        {!loading && !error && (
          <>
            <p style={{ marginTop: 0 }}>
              Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> student records.
            </p>

            {filteredStudents.length === 0 && <p>No students found for this search.</p>}

            {filteredStudents.length > 0 && (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                <aside style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, maxHeight: 520, overflowY: "auto" }}>
                  {filteredStudents.map((student) => {
                    const isSelected = student.id === selectedStudentId;
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: isSelected ? "1px solid #2563eb" : "1px solid #e5e7eb",
                          background: isSelected ? "#eff6ff" : "#fff",
                          borderRadius: 8,
                          padding: "10px 8px",
                          marginBottom: 8,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{student.name || "Unnamed"}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{student.studentCode || "No student code"}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{student.className || "No class"}</div>
                      </button>
                    );
                  })}
                </aside>

                {selectedStudent && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selectedStudent.name || "Student details"}</h2>
                    <p style={{ marginTop: 0, marginBottom: 12, opacity: 0.75 }}>
                      Edit this student profile and save changes.
                    </p>

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
                      {editableFields.map((field) => {
                        const draft = getDraft(selectedStudent);
                        const isSaving = savingId === selectedStudent.id;
                        return (
                          <label key={`${selectedStudent.id}-${field}`} style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{fieldLabels[field] || field}</span>
                            <input
                              type={dateFields.has(field) ? "date" : "text"}
                              value={draft[field]}
                              onChange={(event) => updateDraftField(selectedStudent.id, field, event.target.value, selectedStudent)}
                              style={{ width: "100%", padding: "8px 9px", borderRadius: 6, border: "1px solid #ccd4e2" }}
                              disabled={isSaving}
                            />
                          </label>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => saveStudent(selectedStudent)}
                        disabled={savingId === selectedStudent.id}
                      >
                        {savingId === selectedStudent.id ? "Saving..." : "Save student"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
