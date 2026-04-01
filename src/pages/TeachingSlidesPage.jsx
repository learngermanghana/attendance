import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getAvailableSlideCourses,
  getSlideNavigation,
  getSlidesByCourse,
  getTeachingSlideById,
  teachingSlides,
} from "../data/teachingSlides";
import "./TeachingSlidesPage.css";
import { getUnifiedTopicLabel } from "../data/courseDictionary.js";
import { listClasses } from "../services/classesService.js";
import { listStudentsByClass } from "../services/studentsService.js";

function SlideBlocks({ slide, handoutMode = false }) {
  return (
    <>
      <section className="slide-panel slide-panel-highlight">
        <h2>Warm-up (DE)</h2>
        <ul>
          {slide.warmupQuestionsDe.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="slide-panel">
        <h2>Key phrases (DE)</h2>
        <ul>
          {slide.keyPhrasesDe.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="slide-panel">
        <div className="slide-panel-heading">
          <div>
            <h2>Student questions (DE)</h2>
            <p className="slide-panel-subtitle">Improved prompts are grouped here so they are easy to review and edit.</p>
          </div>
          <span className="slide-question-count">{slide.studentQuestionsDe.length} prompts</span>
        </div>
        <ol>
          {slide.studentQuestionsDe.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      {!handoutMode && (
        <>
          <section className="slide-panel">
            <h2>Teacher notes (EN)</h2>
            <ul>
              {slide.teacherNotesEn.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="slide-panel">
            <h2>Interaction flow (EN)</h2>
            <ol>
              {slide.interactionFlow.map((item) => (
                <li key={item.phase}>
                  <strong>{item.phase}:</strong> {item.detailEn}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <section className="slide-panel">
        <h2>Wrap-up task (DE)</h2>
        <p>{slide.wrapUpTaskDe}</p>
      </section>
    </>
  );
}

function SlideHeader({ slide }) {
  return (
    <header className="slide-header">
      <div className="slide-title-row">
        <p className="slide-meta">{slide.course} · {slide.day}</p>
        <span className="slide-day-badge">{slide.day}</span>
      </div>
      <h1>{slide.title}</h1>
      <p><strong>Topic:</strong> {getUnifiedTopicLabel(slide.assignmentId, slide.topic)}</p>
      <p><strong>Goal:</strong> {slide.objective}</p>
      <p><strong>Duration:</strong> {slide.estimatedDuration}</p>
    </header>
  );
}

function SlideCoursesIndex() {
  const courses = useMemo(() => getAvailableSlideCourses(), []);

  return (
    <section className="slides-index">
      <h1>Teaching Slides</h1>
      <p>Projector-friendly speaking slides with bilingual guidance, searchable lesson indexes, and copy-ready lesson documents.</p>

      <div className="slide-card-grid">
        {courses.map((courseId) => {
          const slides = getSlidesByCourse(courseId);
          return (
            <article key={courseId} className="slide-card">
              <p className="slide-meta">{courseId}</p>
              <h2>{courseId} Teaching Pack</h2>
              <p>{slides.length} lessons ready</p>
              <Link to={`/teaching-slides/course/${courseId}`}>Open {courseId} slides</Link>
            </article>
          );
        })}
      </div>

      {teachingSlides.length === 0 && <p>No teaching slides available yet.</p>}
    </section>
  );
}

function CourseSlidesIndex({ courseId }) {
  const slides = useMemo(() => getSlidesByCourse(courseId), [courseId]);

  if (!slides.length) {
    return (
      <section className="slides-index">
        <h1>No slide pack found</h1>
        <p>We could not find slides for {courseId}.</p>
        <Link to="/teaching-slides">Back to teaching slides</Link>
      </section>
    );
  }

  return (
    <section className="slides-index">
      <h1>{courseId.toUpperCase()} Teaching Slides</h1>

      <div className="slide-toolbar no-print">
        <div className="slide-actions">
          <Link to="/teaching-slides">Back to all courses</Link>
        </div>
      </div>

      <div className="slide-card-grid">
        {slides.map((slide) => (
          <article key={slide.id} id={slide.id} className="slide-card slide-card-lesson">
            <div className="slide-card-topline">
              <p className="slide-meta">{slide.course} · {slide.day}</p>
              <span className="slide-day-badge">{slide.day}</span>
            </div>
            <h2>{slide.title}</h2>
            <p className="slide-topic-line">{getUnifiedTopicLabel(slide.assignmentId, slide.topic)}</p>
            <p className="slide-assignment-id">Assignment: {slide.assignmentId}</p>
            <Link to={`/teaching-slides/course/${courseId}/${slide.id}`}>Open lesson slide</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function SlideDetail({ slide, courseId }) {
  const [handoutMode, setHandoutMode] = useState(false);
  const { previous, next } = getSlideNavigation(slide.id, courseId);

  return (
    <article className={`teaching-slide ${handoutMode ? "handout-mode" : ""}`}>
      <SlideHeader slide={slide} />

      <div className="slide-grid">
        <SlideBlocks slide={slide} handoutMode={handoutMode} />
      </div>

      <footer className="slide-actions no-print">
        <button type="button" onClick={() => window.print()}>Print this slide / Download PDF</button>
        <label className="handout-toggle">
          <input
            type="checkbox"
            checked={handoutMode}
            onChange={(event) => setHandoutMode(event.target.checked)}
          />
          Student handout mode
        </label>
      </footer>
      <div className="no-print">
        <SlideEmailShare courseId={courseId} />
      </div>

      <nav className="slide-nav no-print" aria-label="Slide navigation">
        {previous ? <Link to={`/teaching-slides/course/${courseId}/${previous.id}`}>← Previous</Link> : <span />}
        <Link to={`/teaching-slides/course/${courseId}`}>Back to course slides</Link>
        {next ? <Link to={`/teaching-slides/course/${courseId}/${next.id}`}>Next →</Link> : <span />}
      </nav>
    </article>
  );
}

function SlideEmailShare({ courseId }) {
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const classes = await listClasses();
        const normalized = classes
          .map((entry) => String(entry?.classId || entry?.name || "").trim())
          .filter(Boolean);
        setClassOptions(normalized);
      } catch {
        setClassOptions([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setRecipientEmails([]);
      return;
    }

    (async () => {
      setLoadingRecipients(true);
      try {
        const students = await listStudentsByClass(selectedClassId);
        const emails = [...new Set(
          students
            .map((student) => String(student?.email || "").trim())
            .filter(Boolean),
        )];
        setRecipientEmails(emails);
      } catch {
        setRecipientEmails([]);
      } finally {
        setLoadingRecipients(false);
      }
    })();
  }, [selectedClassId]);

  const shareMailtoLink = useMemo(() => {
    if (recipientEmails.length === 0 || !selectedClassId) return "";

    const subject = `${courseId.toUpperCase()} teaching slides PDF`;
    const body = [
      "Hi class,",
      "",
      `Please find attached the ${courseId.toUpperCase()} teaching slides PDF.`,
      "",
      `Class: ${selectedClassId}`,
      `Printable slide pack: ${window.location.href}`,
      "",
      "Best regards,",
      "Teacher",
    ].join("\n");

    return `mailto:${recipientEmails.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [courseId, recipientEmails, selectedClassId]);

  return (
    <div className="slide-email-share">
      <label>
        Share PDF with class:
        <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
          <option value="">Select class</option>
          {classOptions.map((classId) => <option key={classId} value={classId}>{classId}</option>)}
        </select>
      </label>
      <a
        href={shareMailtoLink || undefined}
        onClick={(event) => {
          if (!shareMailtoLink) event.preventDefault();
        }}
        className="slide-mailto-link"
        aria-disabled={!shareMailtoLink}
      >
        Email PDF link to selected class
      </a>
      <p className="slide-email-help">
        {loadingRecipients
          ? "Loading student emails..."
          : `Recipients with email: ${recipientEmails.length}`}
      </p>
    </div>
  );
}

function SlidePrintPack({ courseId }) {
  const slides = getSlidesByCourse(courseId);
  if (!slides.length) {
    return (
      <section className="slides-index">
        <h1>No slide pack found</h1>
        <p>We could not find slides for {courseId}.</p>
        <Link to="/teaching-slides">Back to teaching slides</Link>
      </section>
    );
  }

  return (
    <section className="print-pack">
      <header className="print-pack-header no-print">
        <h1>{courseId.toUpperCase()} Printable Teaching Pack</h1>
        <p>Use print to save all slides as one PDF for students/teachers.</p>
        <div className="slide-actions">
          <button type="button" onClick={() => window.print()}>Print all {courseId.toUpperCase()} slides</button>
          <Link to={`/teaching-slides/course/${courseId}`}>Back to course slide index</Link>
        </div>
        <SlideEmailShare courseId={courseId} />
        <div className="slide-pack-toc">
          <strong>Jump to a day:</strong>
          <div className="slide-day-jump">
            {slides.map((slide) => (
              <a key={slide.id} href={`#print-${slide.id}`} className="slide-day-chip">
                {slide.day}
              </a>
            ))}
          </div>
        </div>
      </header>

      {slides.map((slide) => (
        <article key={slide.id} id={`print-${slide.id}`} className="teaching-slide print-pack-slide">
          <SlideHeader slide={slide} />
          <div className="slide-grid">
            <SlideBlocks slide={slide} handoutMode />
          </div>
        </article>
      ))}
    </section>
  );
}

export default function TeachingSlidesPage() {
  const { slideId, courseId, legacySlideId } = useParams();
  if (!courseId && !slideId && !legacySlideId) {
    return <SlideCoursesIndex />;
  }

  if (courseId && slideId === "print") {
    return <SlidePrintPack courseId={courseId} />;
  }

  if (courseId && !slideId) {
    return <CourseSlidesIndex courseId={courseId} />;
  }

  const resolvedSlide = getTeachingSlideById(slideId || legacySlideId);

  if (!resolvedSlide) {
    return (
      <section className="slides-index">
        <h1>Slide not found</h1>
        <p>We could not find the requested lesson slide.</p>
        <Link to="/teaching-slides">Back to teaching slides</Link>
      </section>
    );
  }

  const resolvedCourseId = courseId || resolvedSlide.course;

  return (
    <SlideDetail
      slide={resolvedSlide}
      courseId={resolvedCourseId}
    />
  );
}
