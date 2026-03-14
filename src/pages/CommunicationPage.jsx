import { useEffect, useMemo, useState } from "react";
import { listClasses } from "../services/classesService";
import { saveAnnouncementRow } from "../services/communicationService";
import { useToast } from "../context/ToastContext";

const QUICK_TEMPLATES = [
  {
    label: "Class starting soon",
    topic: "Class Reminder",
    announcement: "Hi everyone, class is about to start. Please join on time.",
  },
  {
    label: "Cancel class",
    topic: "Class Cancellation",
    announcement: "Today's class has been cancelled. We will share the replacement schedule shortly.",
  },
  {
    label: "Course complete",
    topic: "Course Completion",
    announcement: "Congratulations! Your course has ended. Your transcript/certificate is ready.",
    attachCertificate: true,
  },
  {
    label: "No class on holiday",
    topic: "Holiday Notice",
    announcement: "No class on {date} due to holiday. Replacement class details will follow.",
  },
  {
    label: "NRW class time update",
    topic: "Class Time Update",
    announcement:
      "Hi NRW class, your class time has been updated to {new_time} starting {date}. Please reply if you have any conflicts.",
  },
  {
    label: "Course material updated",
    topic: "Course Material Update",
    announcement:
      "Hi everyone, today's course material has been updated. Please use the latest version here: {link}",
  },
  {
    label: "Tab bug fixed",
    topic: "Bug Fix Notice",
    announcement: "The tab bug has been fixed. You can now safely use it.",
  },
];

const fieldStyle = { display: "grid", gap: 6 };
const inputStyle = { padding: 10, borderRadius: 8, border: "1px solid #d0d7de" };

export default function CommunicationPage() {
  const toast = useToast();
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [form, setForm] = useState({
    announcement: "",
    className: "",
    date: new Date().toISOString().slice(0, 10),
    link: "",
    topic: "",
    email: "",
    attachCertificate: false,
    certLevel: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClasses(true);
      try {
        const rows = await listClasses();
        setClasses(rows);
      } catch {
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(form.announcement.trim() && form.className.trim() && form.date.trim() && !saving);
  }, [form.announcement, form.className, form.date, saving]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyTemplate(template) {
    setForm((current) => ({
      ...current,
      topic: template.topic,
      announcement: template.announcement,
      attachCertificate: Boolean(template.attachCertificate),
    }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const receipt = await saveAnnouncementRow(form);

      if (receipt?.sheet?.success && receipt?.sheet?.unverified) {
        toast.info(receipt.sheet.message || "Broadcast request was sent, but the browser cannot verify sheet delivery.");
      } else if (receipt?.sheet?.success || receipt?.firestore?.success) {
        toast.success(receipt?.sheet?.message || receipt?.firestore?.message || "Broadcast saved successfully.");
      }

      setForm((current) => ({
        ...current,
        announcement: "",
        link: "",
        topic: "",
        email: "",
        attachCertificate: false,
        certLevel: "",
      }));
    } catch (error) {
      toast.error(error?.message || "Failed to save broadcast.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 16, maxWidth: 860 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Communication</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>
          Save tutor broadcasts in-app and auto-send each entry to your announcement sheet.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {QUICK_TEMPLATES.map((template) => (
          <button key={template.label} type="button" onClick={() => applyTemplate(template)}>
            {template.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={fieldStyle}>
          <span>Announcement *</span>
          <textarea
            style={{ ...inputStyle, minHeight: 90 }}
            value={form.announcement}
            onChange={(event) => updateField("announcement", event.target.value)}
            placeholder="Broadcast message"
            required
          />
        </label>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={fieldStyle}>
            <span>Class *</span>
            <input
              list="communication-class-options"
              style={inputStyle}
              value={form.className}
              onChange={(event) => updateField("className", event.target.value)}
              placeholder={loadingClasses ? "Loading classes..." : "Choose or type class"}
              required
            />
            <datalist id="communication-class-options">
              {classes.map((klass) => (
                <option key={klass.classId} value={klass.name} />
              ))}
            </datalist>
          </label>

          <label style={fieldStyle}>
            <span>Date *</span>
            <input type="date" style={inputStyle} value={form.date} onChange={(event) => updateField("date", event.target.value)} required />
          </label>

          <label style={fieldStyle}>
            <span>Topic</span>
            <input style={inputStyle} value={form.topic} onChange={(event) => updateField("topic", event.target.value)} placeholder="Topic" />
          </label>

          <label style={fieldStyle}>
            <span>Email</span>
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Optional target email"
            />
          </label>

          <label style={fieldStyle}>
            <span>Link</span>
            <input style={inputStyle} value={form.link} onChange={(event) => updateField("link", event.target.value)} placeholder="Meeting/Document link" />
          </label>

          <label style={fieldStyle}>
            <span>Certificate Level</span>
            <input
              style={inputStyle}
              value={form.certLevel}
              onChange={(event) => updateField("certLevel", event.target.value)}
              placeholder="A1, A2, B1..."
            />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.attachCertificate}
            onChange={(event) => updateField("attachCertificate", event.target.checked)}
          />
          Attach certificate
        </label>

        <div>
          <button type="submit" disabled={!canSubmit}>
            {saving ? "Saving..." : "Save broadcast"}
          </button>
        </div>
      </form>
    </div>
  );
}
