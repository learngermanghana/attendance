import { useEffect, useMemo, useState } from "react";
import { buildTeacherSlideSupport } from "../data/teacherSlideSupport.js";
import { getA1GrammarChecks } from "../data/a1GrammarChecks.js";
import PresenterStudentPicker from "./PresenterStudentPicker.jsx";
import "./TeachingSlidePresenter.css";

const FALOWEN_BASE_URL = "https://www.falowen.app";

function lessonUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${FALOWEN_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function stageList(slide, topicLabel) {
  const support = buildTeacherSlideSupport(slide);
  const checks = getA1GrammarChecks(slide.assignmentId, slide);
  const mainChecks = checks.slice(0, Math.max(1, checks.length - 1));
  const exitChecks = checks.slice(Math.max(1, checks.length - 1));
  const workbookParts = Array.isArray(slide.workbookConnection?.parts) ? slide.workbookConnection.parts : [];

  return [
    {
      id: "intro",
      type: "intro",
      kicker: `${slide.course || "A1"}${slide.day ? ` · ${slide.day}` : ""}`,
      title: slide.title || "A1 lesson",
      topic: topicLabel || slide.topic || "",
      objective: slide.objective || "",
      duration: slide.estimatedDuration || "",
    },
    {
      id: "rule",
      type: "list",
      kicker: "Grammatik",
      title: "Regel verstehen",
      items: Array.isArray(support.grammarFocusEn) ? support.grammarFocusEn : [],
    },
    {
      id: "examples",
      type: "list",
      kicker: "Beispiele",
      title: "Beispiele analysieren",
      items: Array.isArray(support.modelExamplesDe) ? support.modelExamplesDe : [],
    },
    {
      id: "grammar-check",
      type: "check",
      kicker: "Grammatik-Check",
      title: "Zeig, dass du die Regel verstanden hast",
      items: mainChecks,
    },
    {
      id: "mistakes",
      type: "list",
      kicker: "Fehlerkorrektur",
      title: "Typische Fehler erkennen",
      items: Array.isArray(support.commonMistakesEn) ? support.commonMistakesEn : [],
    },
    {
      id: "workbook",
      type: "workbook",
      kicker: "Transfer",
      title: "Jetzt ins Workbook übertragen",
      items: workbookParts.map((part) => ({ label: part.label, detail: part.detailEn })),
      grammarUrl: slide.workbookConnection?.grammarUrl || "",
      workbookUrl: slide.workbookConnection?.workbookUrl || "",
    },
    {
      id: "exit-check",
      type: "check",
      kicker: "Abschluss",
      title: "Exit Check · ohne Hilfe beantworten",
      items: exitChecks,
      exitCheck: true,
    },
  ].filter((stage) => {
    if (stage.type === "intro") return true;
    return Array.isArray(stage.items) && stage.items.length > 0;
  });
}

export default function A1GrammarPresenter({
  slide,
  topicLabel,
  onExit,
  nextLessonHref = "",
  nextLessonLabel = "",
}) {
  const stages = useMemo(() => stageList(slide, topicLabel), [slide, topicLabel]);
  const [stageIndex, setStageIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [participationQuestion, setParticipationQuestion] = useState(null);
  const stage = stages[stageIndex] || stages[0];

  const checkMode = stage?.type === "check";
  const participationCheckMode = stage?.id === "grammar-check";
  const manualCheckMode = checkMode && !participationCheckMode;
  const activeCheck = participationCheckMode
    ? participationQuestion
    : checkMode
      ? stage.items[itemIndex]
      : null;
  const progress = stages.length ? ((stageIndex + 1) / stages.length) * 100 : 0;

  function resetQuestionState() {
    setItemIndex(0);
    setShowAnswer(false);
    setParticipationQuestion(null);
  }

  function goTo(index) {
    const last = Math.max(0, stages.length - 1);
    setStageIndex(Math.min(last, Math.max(0, index)));
    resetQuestionState();
  }

  function next() {
    if (manualCheckMode && itemIndex < stage.items.length - 1) {
      setItemIndex((current) => current + 1);
      setShowAnswer(false);
      return;
    }
    goTo(stageIndex + 1);
  }

  function previous() {
    if (manualCheckMode && itemIndex > 0) {
      setItemIndex((current) => current - 1);
      setShowAnswer(false);
      return;
    }
    goTo(stageIndex - 1);
  }

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    } catch {
      // Presenter remains usable when fullscreen is blocked.
    }
  }

  useEffect(() => {
    setShowAnswer(false);
  }, [participationQuestion?.id]);

  useEffect(() => {
    function onKeyDown(event) {
      const tagName = event.target?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(stages.length - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stageIndex, itemIndex, stage?.id, stages.length, manualCheckMode]);

  if (!stage) return null;

  const atStart = stageIndex === 0 && (!manualCheckMode || itemIndex === 0);
  const atEnd = stageIndex === stages.length - 1 && (!manualCheckMode || itemIndex === stage.items.length - 1);

  return (
    <div className="presenter-shell" role="dialog" aria-modal="true" aria-label="A1 grammar teaching presenter">
      <div className="presenter-stage">
        <header className="presenter-topbar">
          <div>
            <span className="presenter-kicker">{stage.kicker}</span>
            <span className="presenter-lesson-label">A1 · Grammar-first</span>
          </div>

          <div className="presenter-v2-tools">
            <label className="presenter-stage-jump">
              <span>Jump to</span>
              <select value={stageIndex} onChange={(event) => goTo(Number(event.target.value))}>
                {stages.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}</option>)}
              </select>
            </label>
          </div>

          <div className="presenter-top-actions">
            <button type="button" onClick={enterFullscreen}>Fullscreen</button>
            <button type="button" onClick={onExit}>Exit presenter</button>
          </div>
        </header>

        <PresenterStudentPicker
          slide={slide}
          questions={participationCheckMode ? stage.items : []}
          questionContext={participationCheckMode ? stage.id : ""}
          onQuestionChange={setParticipationQuestion}
          renderQuestionExternally
        />

        <main className={`presenter-content presenter-content-${stage.type}`}>
          {stage.type === "intro" ? (
            <>
              <h1>{stage.title}</h1>
              {stage.topic ? <p className="presenter-topic">{stage.topic}</p> : null}
              {stage.objective ? <p className="presenter-objective">{stage.objective}</p> : null}
              {stage.duration ? <p className="presenter-duration">{stage.duration}</p> : null}
              <div className="presenter-model-support" style={{ marginTop: 24 }}>
                <strong>A1 teaching method</strong>
                <p>Rule → examples → concept check → error correction → workbook transfer → exit check.</p>
                <small>The live concept check gives each learner a unique question. Workbook gap-fill and form drills stay in the workbook.</small>
              </div>
            </>
          ) : stage.type === "check" ? (
            <section className="presenter-question-reveal">
              <div className="presenter-question-counter">
                {participationCheckMode
                  ? activeCheck
                    ? `Unique question ${activeCheck.poolPosition} of ${activeCheck.poolSize}`
                    : "Unique class questions"
                  : `Aufgabe ${itemIndex + 1} von ${stage.items.length}`}
              </div>
              <h1>{stage.title}</h1>
              {participationCheckMode && !activeCheck ? (
                <div className="presenter-model-support">
                  <strong>Pick the first student above</strong>
                  <p>Falowen will match the question pool to the class roster and assign an unused concept question to each learner in this round.</p>
                  <small>Record Correct, Needs help, Skip or Absent before moving to the next student.</small>
                </div>
              ) : (
                <>
                  <p className="presenter-question">{activeCheck?.questionDe}</p>
                  <div className="presenter-question-actions">
                    <button type="button" onClick={() => setShowAnswer((current) => !current)} disabled={!activeCheck}>
                      {showAnswer ? "Antwort ausblenden" : "Antwort anzeigen"}
                    </button>
                  </div>
                  {showAnswer ? (
                    <div className="presenter-model-support">
                      <strong>Richtige Antwort / teacher guide</strong>
                      <p>{activeCheck?.answerDe}</p>
                      {participationCheckMode ? <small>Accept a short correct explanation or a suitable simple German example. This is a teacher-judged participation check, not an automatic grade.</small> : null}
                      {activeCheck?.noteEn ? <small>{activeCheck.noteEn}</small> : null}
                    </div>
                  ) : (
                    <div className="presenter-model-support" style={{ opacity: 0.8 }}>
                      <strong>{stage.exitCheck ? "Exit rule" : "Teacher instruction"}</strong>
                      <p>{stage.exitCheck
                        ? "The student answers first. Reveal only after the answer is complete."
                        : "Let the selected student answer first. Use Correct or Needs help above only after the response."}</p>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : stage.type === "workbook" ? (
            <>
              <h1>{stage.title}</h1>
              <div className="presenter-workbook-list">
                {stage.items.map((item) => (
                  <article key={`${item.label}-${item.detail}`}>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="presenter-workbook-actions">
                {stage.grammarUrl ? <a href={lessonUrl(stage.grammarUrl)} target="_blank" rel="noreferrer">Open grammar notes</a> : null}
                {stage.workbookUrl ? <a href={lessonUrl(stage.workbookUrl)} target="_blank" rel="noreferrer">Open workbook</a> : null}
              </div>
            </>
          ) : (
            <>
              <h1>{stage.title}</h1>
              <ul className="presenter-list">
                {stage.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </>
          )}
        </main>

        <footer className="presenter-footer">
          <button type="button" onClick={previous} disabled={atStart}>← Previous</button>
          <div className="presenter-progress-wrap" aria-label={`Stage ${stageIndex + 1} of ${stages.length}`}>
            <span>{stageIndex + 1} / {stages.length}</span>
            <div className="presenter-progress-track"><div className="presenter-progress-bar" style={{ width: `${progress}%` }} /></div>
          </div>
          <button type="button" onClick={next} disabled={atEnd}>
            {manualCheckMode && itemIndex < stage.items.length - 1 ? "Nächste Aufgabe →" : "Next →"}
          </button>
          {nextLessonHref ? (
            <a
              className="presenter-next-lesson"
              href={nextLessonHref}
              title={nextLessonLabel || "Open next lesson in Presenter Mode"}
            >
              Next lesson{nextLessonLabel ? ` · ${nextLessonLabel}` : ""} →
            </a>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
