import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getCourseLevels,
  getSlideNavigation,
  getSlidesByCourse,
  getTeachingSlideById,
  teachingSlides,
} from "../data/teachingSlides";
import "./TeachingSlidesPage.css";

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
      <p><strong>Topic:</strong> {slide.topic}</p>
      <p><strong>Goal:</strong> {slide.objective}</p>
      <p><strong>Duration:</strong> {slide.estimatedDuration}</p>
    </header>
  );
}

function SlideIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const levels = useMemo(() => getCourseLevels(), []);
  const selectedLevel = searchParams.get("level") || levels[0] || "";
  const selectedSlides = useMemo(() => getSlidesByCourse(selectedLevel), [selectedLevel]);

  return (
    <section className="slides-index">
      <h1>Teaching Slides</h1>
      <p>Projector-friendly speaking slides with bilingual guidance and print-ready layouts.</p>

      <div className="level-toolbar no-print">
        <label htmlFor="level-select">Choose level</label>
        <select
          id="level-select"
          value={selectedLevel}
          onChange={(event) => {
            const level = event.target.value;
            setSearchParams(level ? { level } : {});
          }}
        >
          {levels.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        {selectedLevel && <Link to={`/teaching-slides/print/${selectedLevel}`}>Open printable pack ({selectedLevel})</Link>}
      </div>

      <div className="slide-card-grid">
        {selectedSlides.map((slide) => (
          <article key={slide.id} className="slide-card">
            <p className="slide-meta">{slide.course} · {slide.day}</p>
            <h2>{slide.title}</h2>
            <p>{slide.topic}</p>
            <Link to={`/teaching-slides/${slide.id}`}>Open lesson slide</Link>
          </article>
        ))}
      </div>

      {teachingSlides.length === 0 && <p>No teaching slides available yet.</p>}
      {teachingSlides.length > 0 && selectedSlides.length === 0 && <p>No slides available for {selectedLevel} yet.</p>}
    </section>
  );
}

function SlideDetail({ slide }) {
  const [handoutMode, setHandoutMode] = useState(false);
  const { previous, next } = getSlideNavigation(slide.id);

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

      <nav className="slide-nav no-print" aria-label="Slide navigation">
        {previous ? <Link to={`/teaching-slides/${previous.id}`}>← Previous</Link> : <span />}
        <Link to="/teaching-slides">Back to all slides</Link>
        {next ? <Link to={`/teaching-slides/${next.id}`}>Next →</Link> : <span />}
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
          <Link to="/teaching-slides">Back to slide index</Link>
        </div>
      </header>

      {slides.map((slide) => (
        <article key={slide.id} className="teaching-slide print-pack-slide">
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
  const { slideId, courseId } = useParams();

  if (courseId) {
    return <SlidePrintPack courseId={courseId} />;
  }

  if (!slideId) {
    return <SlideIndex />;
  }

  const slide = getTeachingSlideById(slideId);
  if (!slide) {
    return (
      <section className="slides-index">
        <h1>Slide not found</h1>
        <p>We couldn't find that teaching slide yet.</p>
        <Link to="/teaching-slides">Back to teaching slides</Link>
      </section>
    );
  }

  return <SlideDetail slide={slide} />;
}
