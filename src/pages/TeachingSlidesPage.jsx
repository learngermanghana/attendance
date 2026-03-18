import { useId, useMemo, useState } from "react";
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

function buildEditableSlideDocument(slide) {
  const lines = [
    `# ${slide.title}`,
    "",
    `- Course: ${slide.course}`,
    `- Day: ${slide.day}`,
    `- Assignment: ${slide.assignmentId}`,
    `- Topic: ${getUnifiedTopicLabel(slide.assignmentId, slide.topic)}`,
    `- Goal: ${slide.objective}`,
    `- Duration: ${slide.estimatedDuration}`,
    "",
    "## Warm-up questions (DE)",
    ...slide.warmupQuestionsDe.map((item) => `- ${item}`),
    "",
    "## Key phrases (DE)",
    ...slide.keyPhrasesDe.map((item) => `- ${item}`),
    "",
    "## Student questions (DE)",
    ...slide.studentQuestionsDe.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Teacher notes (EN)",
    ...slide.teacherNotesEn.map((item) => `- ${item}`),
    "",
    "## Interaction flow (EN)",
    ...slide.interactionFlow.map((item) => `- ${item.phase}: ${item.detailEn}`),
    "",
    "## Wrap-up task (DE)",
    slide.wrapUpTaskDe,
  ];

  return lines.join("\n");
}

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

function SlideStatusBanners({ course }) {
  const normalizedCourse = String(course || "").toUpperCase();
  const conversationImage = normalizedCourse === "A2"
    ? "/Conversation A2.png"
    : normalizedCourse === "B1"
      ? "/conversation_time_B1_safe.png"
      : null;

  return (
    <div className="slide-status-banners">
      <img src="/zom.png" alt="Class about to start" className="slide-status-image" />
      {conversationImage && (
        <img
          src={conversationImage}
          alt={`${normalizedCourse} conversation time`}
          className="slide-status-image"
        />
      )}
      <img src="/class_has_ended_banner.png" alt="Class has ended" className="slide-status-image" />
    </div>
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
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSlides = useMemo(() => {
    if (!normalizedSearch) return slides;

    return slides.filter((slide) => {
      const searchHaystack = [
        slide.day,
        String(slide.dayNumber),
        slide.title,
        slide.assignmentId,
        slide.topic,
        getUnifiedTopicLabel(slide.assignmentId, slide.topic),
      ].join(" ").toLowerCase();

      return searchHaystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, slides]);

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
      <p>Search by day, topic, or assignment so missing days are easier to find.</p>

      <div className="slide-toolbar no-print">
        <label className="slide-search-field" htmlFor={`slide-search-${courseId}`}>
          <span>Find a lesson</span>
          <input
            id={`slide-search-${courseId}`}
            type="search"
            placeholder="Search Day 4, 2.5, Freizeit…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="slide-actions">
          <Link to={`/teaching-slides/course/${courseId}/print`}>Open printable pack ({courseId.toUpperCase()})</Link>
        </div>
      </div>

      <div className="slide-day-jump no-print" aria-label="Jump to lesson day">
        {slides.map((slide) => (
          <a key={slide.id} href={`#${slide.id}`} className="slide-day-chip">
            {slide.day}
          </a>
        ))}
      </div>

      <div className="slide-card-grid">
        {filteredSlides.map((slide) => (
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

      {filteredSlides.length === 0 && (
        <p className="slide-empty-state">No lessons match “{search}”. Try a day number, assignment, or topic keyword.</p>
      )}

      <div className="slide-actions no-print">
        <Link to="/teaching-slides">Back to all courses</Link>
      </div>
    </section>
  );
}

function SlideDocumentEditor({ slide }) {
  const textareaId = useId();
  const documentText = useMemo(() => buildEditableSlideDocument(slide), [slide]);
  const [copyState, setCopyState] = useState("idle");

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyState("unavailable");
      return;
    }

    await navigator.clipboard.writeText(documentText);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <section className="slide-editor-panel no-print">
      <div className="slide-editor-header">
        <div>
          <h2>Editable lesson document</h2>
          <p>Copy this outline to quickly improve the questions or edit the lesson outside the slide view.</p>
        </div>
        <button type="button" onClick={handleCopy}>Copy lesson doc</button>
      </div>
      <p className="slide-editor-note">
        Source file: <code>src/data/teachingSlides.js</code>. Search for <code>{slide.assignmentId}</code> to edit this lesson in code.
      </p>
      <label className="slide-editor-field" htmlFor={textareaId}>
        <span>Lesson outline</span>
        <textarea id={textareaId} value={documentText} readOnly rows={18} />
      </label>
      {copyState === "copied" && <p className="slide-editor-feedback">Copied to clipboard.</p>}
      {copyState === "unavailable" && <p className="slide-editor-feedback">Clipboard is unavailable in this browser.</p>}
    </section>
  );
}

function SlideDetail({ slide, courseId }) {
  const [handoutMode, setHandoutMode] = useState(false);
  const { previous, next } = getSlideNavigation(slide.id, courseId);

  return (
    <article className={`teaching-slide ${handoutMode ? "handout-mode" : ""}`}>
      <SlideStatusBanners course={slide.course} />
      <SlideHeader slide={slide} />

      <div className="slide-grid">
        <SlideBlocks slide={slide} handoutMode={handoutMode} />
      </div>

      <SlideDocumentEditor slide={slide} />

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

      <nav className="slide-nav no-print" aria-label="Slide navigation">
        {previous ? <Link to={`/teaching-slides/course/${courseId}/${previous.id}`}>← Previous</Link> : <span />}
        <Link to={`/teaching-slides/course/${courseId}`}>Back to course slides</Link>
        {next ? <Link to={`/teaching-slides/course/${courseId}/${next.id}`}>Next →</Link> : <span />}
      </nav>
    </article>
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
          <SlideStatusBanners course={slide.course} />
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
