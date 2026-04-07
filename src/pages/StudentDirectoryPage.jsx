import { useEffect, useMemo, useState } from "react";
import { listAllStudents, updateStudentById } from "../services/studentsService";
import { useToast } from "../context/ToastContext";

const editableFields = ["name", "email", "studentCode", "className", "status", "phone", "role"];

function normalizeEditableValue(value) {
  return String(value ?? "");
}

export default function StudentDirectoryPage() {
  const { pushToast } = useToast();
  const [students, setStudents] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [query, setQuery] = useState("");
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
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [students, query]);

  const getDraft = (student) => {
    const currentDraft = drafts[student.id];
    if (currentDraft) return currentDraft;

    return editableFields.reduce((acc, field) => {
      acc[field] = normalizeEditableValue(student[field]);
      return acc;
    }, {});
  };

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
      const originalValue = normalizeEditableValue(student[field]).trim();
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
          Search and edit student records directly from Firestore without opening the Firebase console.
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

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff", overflowX: "auto" }}>
        {loading && <p>Loading students...</p>}
        {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

        {!loading && !error && (
          <>
            <p style={{ marginTop: 0 }}>
              Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> student records.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Email</th>
                  <th style={{ padding: "8px 6px" }}>Student Code</th>
                  <th style={{ padding: "8px 6px" }}>Class</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Phone</th>
                  <th style={{ padding: "8px 6px" }}>Role</th>
                  <th style={{ padding: "8px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const draft = getDraft(student);
                  const isSaving = savingId === student.id;

                  return (
                    <tr key={student.id} style={{ borderBottom: "1px solid #f0f2f7" }}>
                      {editableFields.map((field) => (
                        <td key={`${student.id}-${field}`} style={{ padding: "8px 6px", verticalAlign: "top" }}>
                          <input
                            value={draft[field]}
                            onChange={(event) => updateDraftField(student.id, field, event.target.value, student)}
                            style={{ width: "100%", minWidth: 120, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccd4e2" }}
                            disabled={isSaving}
                          />
                        </td>
                      ))}
                      <td style={{ padding: "8px 6px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => saveStudent(student)} disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
