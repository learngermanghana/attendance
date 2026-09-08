import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TeachingSlidePresenter from "../components/TeachingSlidePresenter.jsx";
import A1GrammarPresenter from "../components/A1GrammarPresenter.jsx";
import TeacherLessonBlocks from "../components/TeacherLessonBlocks.jsx";
import StudentCourseSlides from "../components/StudentCourseSlides.jsx";
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
      <p>Teacher lesson guides with objectives, language focus, guided practice, common mistakes, and a classroom-ready Presenter Mode.</p>
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
        <div className="slide-actions"><Link to="/teaching-slides">Back to all courses</Link></div>
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
            <div className="slide-card-actions">
              <Link to={`/teaching-slides/course/${courseId}/${slide.id}`}>Open lesson</Link>
              <Link to={`/teaching-slides/course/${courseId}/${slide.id}?present=1`}>Present</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SlideDetail({ slide, courseId }) {
  const [handoutMode, setHandoutMode] = useState(false);
  const [presenterMode, setPresenterMode] = useState(() => new URLSearchParams(window.location.search).get("present") === "1");
  const { previous, next } = getSlideNavigation(slide.id, courseId);
  const topicLabel = getUnifiedTopicLabel(slide.assignmentId, slide.topic);
  const a1GrammarLesson = String(slide.course || "").trim().toUpperCase() === "A1"
    && String(slide.assignmentId || "").trim().toUpperCase() !== "A1-TUTORIAL";

  if (presenterMode) {
    if (a1GrammarLesson) {
      return <A1GrammarPresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} />;
    }
    return <TeachingSlidePresenter slide={slide} topicLabel={topicLabel} onExit={() => setPresenterMode(false)} />;
  }

  return (
    <article className={`teaching-slide ${handoutMode ? "handout-mode" : ""}`}>
      <SlideHeader slide={slide} />
      <div className="slide-grid"><TeacherLessonBlocks slide={slide} handoutMode={handoutMode} /></div>

      <footer className="slide-actions no-print">
        <button type="button" className="slide-present-button" onClick={() => setPresenterMode(true)}>Start Presenter Mode</button>
        <button type="button" onClick={() => window.print()}>Print this teacher guide / Download PDF</button>
        <label className="handout-toggle">
          <input type="checkbox" checked={handoutMode} onChange={(event) => setHandoutMode(event.target.checked)} />
          Preview student handout
        </label>
      </footer>
      <p className="slide-presenter-help no-print">Presenter controls: ← / →, Page Up / Page Down, Space, Home and End.</p>
      <div className="no-print"><SlideEmailShare courseId={courseId} /></div>

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
        setClassOptions(classes.map((entry) => String(entry?.classId || entry?.name || "").trim()).filter(Boolean));
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
        setRecipientEmails([...new Set(students.map((student) => String(student?.email || "").trim()).filter(Boolean))]);
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
      <a href={shareMailtoLink || undefined} onClick={(event) => { if (!shareMailtoLink) event.preventDefault(); }} className="slide-mailto-link" aria-disabled={!shareMailtoLink}>
        Email PDF link to selected class
      </a>
      <p className="slide-email-help">{loadingRecipients ? "Loading student emails..." : `Recipients with email: ${recipientEmails.length}`}</p>
    </div>
  );
}

function SlidePrintPack({ courseId, publicView = false }) {
  const slides = getSlidesByCourse(courseId);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const classes = await listClasses();
        setClassOptions(classes.map((entry) => String(entry?.classId || entry?.name || "").trim()).filter(Boolean));
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
        setRecipientEmails([...new Set(students.map((student) => String(student?.email || "").trim()).filter(Boolean))]);
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
        <p>{publicView ? "Public student view. Use print to save the student-facing lesson pages as one PDF." : "Teacher teaching pack. Use print to save the full lesson guides as one PDF."}</p>
        <div className="slide-actions">
          <button type="button" onClick={() => window.print()}>Print all {courseId.toUpperCase()} slides</button>
          {!publicView && <Link to={`/teaching-slides/course/${courseId}`}>Back to course slide index</Link>}
        </div>
        <div className="slide-email-share">
          <label>
            Share PDF with class:
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
              <option value="">Select class</option>
              {classOptions.map((classId) => <option key={classId} value={classId}>{classId}</option>)}
            </select>
          </label>
          <a href={shareMailtoLink || undefined} onClick={(event) => { if (!shareMailtoLink) event.preventDefault(); }} className="slide-mailto-link" aria-disabled={!shareMailtoLink}>
            Email PDF link to selected class
          </a>
          <p className="slide-email-help">{loadingRecipients ? "Loading student emails..." : `Recipients with email: ${recipientEmails.length}`}</p>
        </div>
        <div className="slide-pack-toc">
          <strong>Jump to a day:</strong>
          <div className="slide-day-jump">
            {slides.map((slide) => <a key={slide.id} href={`#print-${slide.id}`} className="slide-day-chip">{slide.day}</a>)}
          </div>
        </div>
      </header>

      {slides.map((slide) => (
        <article key={slide.id} id={`print-${slide.id}`} className="teaching-slide print-pack-slide">
          <SlideHeader slide={slide} />
          <div className="slide-grid"><TeacherLessonBlocks slide={slide} handoutMode={publicView} /></div>
        </article>
      ))}
    </section>
  );
}

export default function TeachingSlidesPage({ publicView = false }) {
  const { slideId, courseId, legacySlideId } = useParams();
  if (publicView && courseId) return <StudentCourseSlides courseId={courseId} />;

  if (publicView) {
    return (
      <section className="slides-index">
        <h1>Public slide pack not found</h1>
        <p>This public teaching-slide URL is invalid.</p>
      </section>
    );
  }

  if (!courseId && !slideId && !legacySlideId) return <SlideCoursesIndex />;
  if (courseId && slideId === "print") return <SlidePrintPack courseId={courseId} />;
  if (courseId && !slideId) return <CourseSlidesIndex courseId={courseId} />;

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
  return <SlideDetail slide={resolvedSlide} courseId={resolvedCourseId} />;
}