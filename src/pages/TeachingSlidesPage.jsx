import { useEffect, useId, useMemo, useState } from "react";
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
        <h2>Student questions (DE)</h2>
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
      <p className="slide-meta">{slide.course} · {slide.day}</p>
      <h1>{slide.title}</h1>
      <p><strong>Topic:</strong> {getUnifiedTopicLabel(slide.assignmentId, slide.topic)}</p>
      <p><strong>Goal:</strong> {slide.objective}</p>
      <p><strong>Duration:</strong> {slide.estimatedDuration}</p>
    </header>
  );
}

function formatDateTimeLocal(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getDefaultStartTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15, 0, 0);
  return formatDateTimeLocal(now);
}

function getStoredStartTime() {
  if (typeof window === "undefined") return getDefaultStartTime();
  const storedValue = window.localStorage.getItem("teachingSlides.classStartTime");
  return storedValue || getDefaultStartTime();
}

function resolveConversationBanner(course) {
  const normalizedCourse = String(course || "").toUpperCase();
  if (normalizedCourse === "A2") return "/Conversation A2.png";
  if (normalizedCourse === "B1") return "/conversation_time_B1_safe.png";
  return null;
}

function SlideStatusBanners({ course, classStartTime, onClassStartTimeChange }) {
  const normalizedCourse = String(course || "").toUpperCase();
  const conversationImage = resolveConversationBanner(normalizedCourse);
  const [now, setNow] = useState(() => Date.now());
  const timeInputId = useId();

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const targetTime = new Date(classStartTime);
  const hasValidTargetTime = classStartTime && !Number.isNaN(targetTime.getTime());
  const minuteDelta = hasValidTargetTime
    ? Math.ceil((targetTime.getTime() - now) / 60000)
    : null;

  const countdownMessage = minuteDelta === null
    ? "Set class start time"
    : minuteDelta > 0
      ? `Class starts in ${minuteDelta} minute${minuteDelta === 1 ? "" : "s"}`
      : minuteDelta === 0
        ? "Class is starting now"
        : `Class started ${Math.abs(minuteDelta)} minute${Math.abs(minuteDelta) === 1 ? "" : "s"} ago`;

  const banners = [
    { src: "/zom.png", alt: "Class about to start", label: "Before class starts" },
    conversationImage
      ? { src: conversationImage, alt: `${normalizedCourse} conversation time`, label: `${normalizedCourse} conversation time` }
      : null,
    { src: "/class_has_ended_banner.png", alt: "Class has ended", label: "After class ends" },
  ].filter(Boolean);

  return (
    <section className="slide-status-banners" aria-label="Class visual aids">
      <div className="slide-start-time-panel">
        <p className="slide-status-title">Class visuals</p>
        <label htmlFor={timeInputId} className="slide-start-time-label no-print">
          Set class start time
        </label>
        <input
          id={timeInputId}
          className="slide-start-time-input no-print"
          type="datetime-local"
          value={classStartTime}
          onChange={(event) => onClassStartTimeChange(event.target.value)}
        />
        <p className="slide-countdown-text">{countdownMessage}</p>
      </div>

      {banners.map((banner) => (
        <figure key={banner.src} className="slide-status-item">
          <img src={banner.src} alt={banner.alt} className="slide-status-image" />
          <figcaption className="slide-status-caption">{banner.label}</figcaption>
        </figure>
      ))}
    </section>
  );
}

function SlideCoursesIndex() {
  const courses = useMemo(() => getAvailableSlideCourses(), []);

  return (
    <section className="slides-index">
      <h1>Teaching Slides</h1>
      <p>Projector-friendly speaking slides with bilingual guidance and print-ready layouts.</p>

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
      <p>Open individual lessons or print the full pack.</p>

      <div className="slide-actions no-print">
        <Link to={`/teaching-slides/course/${courseId}/print`}>Open printable pack ({courseId.toUpperCase()})</Link>
      </div>

      <div className="slide-card-grid">
        {slides.map((slide) => (
          <article key={slide.id} className="slide-card">
            <p className="slide-meta">{slide.course} · {slide.day}</p>
            <h2>{slide.title}</h2>
            <p>{getUnifiedTopicLabel(slide.assignmentId, slide.topic)}</p>
            <Link to={`/teaching-slides/course/${courseId}/${slide.id}`}>Open lesson slide</Link>
          </article>
        ))}
      </div>

      <div className="slide-actions no-print">
        <Link to="/teaching-slides">Back to all courses</Link>
      </div>
    </section>
  );
}

function SlideDetail({ slide, courseId, classStartTime, onClassStartTimeChange }) {
  const [handoutMode, setHandoutMode] = useState(false);
  const { previous, next } = getSlideNavigation(slide.id, courseId);

  return (
    <article className={`teaching-slide ${handoutMode ? "handout-mode" : ""}`}>
      <SlideStatusBanners
        course={slide.course}
        classStartTime={classStartTime}
        onClassStartTimeChange={onClassStartTimeChange}
      />
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

      <nav className="slide-nav no-print" aria-label="Slide navigation">
        {previous ? <Link to={`/teaching-slides/course/${courseId}/${previous.id}`}>← Previous</Link> : <span />}
        <Link to={`/teaching-slides/course/${courseId}`}>Back to course slides</Link>
        {next ? <Link to={`/teaching-slides/course/${courseId}/${next.id}`}>Next →</Link> : <span />}
      </nav>
    </article>
  );
}

function SlidePrintPack({ courseId, classStartTime, onClassStartTimeChange }) {
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
      </header>

      {slides.map((slide) => (
        <article key={slide.id} className="teaching-slide print-pack-slide">
          <SlideStatusBanners
            course={slide.course}
            classStartTime={classStartTime}
            onClassStartTimeChange={onClassStartTimeChange}
          />
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
  const [classStartTime, setClassStartTime] = useState(getStoredStartTime);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("teachingSlides.classStartTime", classStartTime);
  }, [classStartTime]);

  if (!courseId && !slideId && !legacySlideId) {
    return <SlideCoursesIndex />;
  }

  const activeCourseId = courseId || getTeachingSlideById(legacySlideId)?.course;

  if (!activeCourseId) {
    return (
      <section className="slides-index">
        <h1>Slide not found</h1>
        <p>We couldn't find that teaching slide yet.</p>
        <Link to="/teaching-slides">Back to teaching slides</Link>
      </section>
    );
  }

  if (slideId === "print") {
    return (
      <SlidePrintPack
        courseId={activeCourseId}
        classStartTime={classStartTime}
        onClassStartTimeChange={setClassStartTime}
      />
    );
  }

  if (!slideId && !legacySlideId) {
    return <CourseSlidesIndex courseId={activeCourseId} />;
  }

  const resolvedSlideId = slideId || legacySlideId;
  const slide = getTeachingSlideById(resolvedSlideId);

  if (!slide || slide.course !== activeCourseId.toUpperCase()) {
    return (
      <section className="slides-index">
        <h1>Slide not found</h1>
        <p>We couldn't find that teaching slide in {activeCourseId}.</p>
        <Link to={`/teaching-slides/course/${activeCourseId}`}>Back to course slides</Link>
      </section>
    );
  }

  return (
    <SlideDetail
      slide={slide}
      courseId={activeCourseId.toUpperCase()}
      classStartTime={classStartTime}
      onClassStartTimeChange={setClassStartTime}
    />
  );
}
