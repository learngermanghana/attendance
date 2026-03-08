import { courseDictionary } from "./courseDictionary";

const curatedSlides = [
  {
    id: "a2-day-1-small-talk",
    course: "A2",
    day: "Day 1",
    dayNumber: 1,
    assignmentId: "A2-1.1",
    title: "A2 Day 1 · Small Talk",
    topic: "1.1 Small Talk",
    objective: "Students confidently start, continue, and close short conversations in German.",
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: ["Wie geht's dir heute?", "Was war heute Morgen dein erster Gedanke?", "Sprichst du lieber morgens oder abends mit Freunden? Warum?"],
    keyPhrasesDe: ["Hallo! Wie geht's?", "Woher kommst du?", "Was machst du beruflich / Was studierst du?", "Was machst du gern in deiner Freizeit?", "War schön, mit dir zu sprechen!"],
    studentQuestionsDe: ["Wie heißt du und woher kommst du?", "Was machst du beruflich oder was studierst du?", "Was machst du gern am Wochenende?", "Trinkst du lieber Kaffee oder Tee? Warum?", "Welche Musik hörst du zurzeit gern?"],
    teacherNotesEn: ["Model the first dialogue with one volunteer before pair work.", "Push follow-up language: Warum?, Echt?, Und du?, Interessant!", "Focus on confidence and fluency over perfect grammar."],
    interactionFlow: [
      { phase: "Demo", detailEn: "5 min: teacher + volunteer conversation with opening, follow-up, and closing." },
      { phase: "Pair Round A", detailEn: "8 min: students ask guided questions with one follow-up each." },
      { phase: "Wrap-up", detailEn: "5 min: learners write one sentence on what they learned today." },
    ],
    wrapUpTaskDe: "Schreibe: 'Heute habe ich gelernt, wie man ein Gespräch beginnt und weiterführt.'",
  },
  {
    id: "a2-day-2-personen-beschreiben",
    course: "A2",
    day: "Day 2",
    dayNumber: 2,
    assignmentId: "A2-1.2",
    title: "A2 Day 2 · Personen beschreiben",
    topic: "1.2 Personen beschreiben",
    objective: "Students describe people using appearance, personality, and habits.",
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: ["Welche drei Wörter beschreiben dich heute?", "Ist es wichtiger: freundlich oder pünktlich?", "Kennst du eine sehr humorvolle Person?"],
    keyPhrasesDe: ["Er/Sie ist sehr ...", "Er/Sie hat ... Haare.", "Er/Sie wirkt ...", "Ich finde, dass ..."],
    studentQuestionsDe: ["Wie sieht dein bester Freund / deine beste Freundin aus?", "Welche Eigenschaften sind dir wichtig?", "Bist du eher ruhig oder offen? Warum?"],
    teacherNotesEn: ["Give one model with sentence frames before asking free production.", "Encourage adjectives with reasons, not single-word answers."],
    interactionFlow: [
      { phase: "Vocabulary activation", detailEn: "8 min: brainstorm adjectives (positive + neutral)." },
      { phase: "Guided pairs", detailEn: "10 min: students ask first 3 questions with sentence frames." },
      { phase: "Mini-presentations", detailEn: "10 min: each learner describes one person for 30-45 seconds." },
    ],
    wrapUpTaskDe: "Nenne 3 Adjektive über eine Person in deiner Klasse und begründe sie kurz.",
  },
  {
    id: "a2-day-3-vergleichen",
    course: "A2",
    day: "Day 3",
    dayNumber: 3,
    assignmentId: "A2-1.3",
    title: "A2 Day 3 · Dinge und Personen vergleichen",
    topic: "1.3 Vergleichen",
    objective: "Students compare people/things using Komparativ and simple opinions.",
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: ["Ist Reisen mit dem Zug besser als mit dem Bus?", "Was ist interessanter: Filme oder Bücher?", "Wer ist sportlicher in deiner Familie?"],
    keyPhrasesDe: ["... ist größer/schneller/interessanter als ...", "Im Vergleich zu ...", "Meiner Meinung nach ..."],
    studentQuestionsDe: ["Was ist einfacher: online lernen oder im Kurs lernen?", "Welche Stadt ist teurer als deine Heimatstadt?", "Was ist gesünder: selbst kochen oder bestellen?"],
    teacherNotesEn: ["Keep a visible board list of comparative forms learners produce.", "Ask for justification after each comparison: Warum?"],
    interactionFlow: [
      { phase: "Board race", detailEn: "7 min: teams create comparative sentences from prompts." },
      { phase: "Pair interviews", detailEn: "12 min: students ask all guided questions and add one follow-up." },
      { phase: "Wrap-up", detailEn: "6 min: class shares best comparative sentence heard today." },
    ],
    wrapUpTaskDe: "Schreibe 3 Sätze mit '... als ...' über dein Leben.",
  },
  {
    id: "a2-day-4-treffen",
    course: "A2",
    day: "Day 4",
    dayNumber: 4,
    assignmentId: "A2-2.4",
    title: "A2 Day 4 · Wo möchten wir uns treffen?",
    topic: "2.4 Treffen vereinbaren",
    objective: "Students suggest meeting places/times and agree on a plan.",
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: ["Wo triffst du normalerweise Freunde?", "Wann hast du diese Woche Zeit?", "Lieber Café oder Park?"],
    keyPhrasesDe: ["Hast du am ... Zeit?", "Wollen wir uns um ... treffen?", "Passt dir das?", "Tut mir leid, da kann ich nicht."],
    studentQuestionsDe: ["Wann hast du am Wochenende Zeit?", "Welcher Ort ist für dich am besten?", "Was können wir dort machen?"],
    teacherNotesEn: ["Teach accepting and rejecting politely as equal skills.", "Use role-cards with constraints (busy schedule, low budget, distance)."],
    interactionFlow: [
      { phase: "Prompted dialogue", detailEn: "8 min: teacher models planning with one student." },
      { phase: "Role-play", detailEn: "20 min: partners negotiate place/time and present final plan." },
      { phase: "Wrap-up", detailEn: "5 min: learners say one phrase they will reuse in real life." },
    ],
    wrapUpTaskDe: "Schreibe eine kurze Nachricht: Ort, Uhrzeit und Aktivität für ein Treffen.",
  },
  {
    id: "a2-day-5-freizeit",
    course: "A2",
    day: "Day 5",
    dayNumber: 5,
    assignmentId: "A2-2.5",
    title: "A2 Day 5 · Was machst du in deiner Freizeit?",
    topic: "2.5 Freizeit",
    objective: "Students discuss hobbies, frequency, and preferences in extended turns.",
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: ["Was machst du am liebsten nach der Arbeit / nach dem Kurs?", "Wie oft machst du Sport?", "Was möchtest du neu ausprobieren?"],
    keyPhrasesDe: ["In meiner Freizeit ...", "Ich mache das einmal/zweimal pro Woche.", "Am liebsten ...", "Ich würde gern ..."],
    studentQuestionsDe: ["Welche Hobbys hast du?", "Wie oft machst du dieses Hobby?", "Warum gefällt dir dieses Hobby?"],
    teacherNotesEn: ["Push adverbs of frequency (oft, manchmal, selten, nie).", "Require one follow-up question after each answer."],
    interactionFlow: [
      { phase: "Warm-up mingle", detailEn: "8 min: students ask warm-up questions to three classmates." },
      { phase: "Pair interview", detailEn: "12 min: complete all guided questions in pairs." },
      { phase: "Spotlight share", detailEn: "10 min: introduce partner's hobby profile to class." },
    ],
    wrapUpTaskDe: "Schreibe 4 Sätze über deine Freizeit mit Häufigkeit (z. B. zweimal pro Woche).",
  },
];

function compareChapter(a, b) {
  const aParts = String(a).split(".").map((part) => Number(part));
  const bParts = String(b).split(".").map((part) => Number(part));
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = aParts[index] ?? 0;
    const right = bParts[index] ?? 0;
    if (left !== right) return left - right;
  }

  return 0;
}

function createTemplateSlide(level, entry, lessonNumber) {
  const levelLabel = level.toUpperCase();

  return {
    id: entry.assignment_id.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    course: levelLabel,
    day: `Lesson ${lessonNumber}`,
    dayNumber: lessonNumber,
    assignmentId: entry.assignment_id,
    title: `${levelLabel} Lesson ${lessonNumber} · ${entry.de}`,
    topic: `${entry.chapter} ${entry.de}`,
    objective: `Students can communicate about ${entry.en.toLowerCase()} with clear ${levelLabel} sentence patterns.`,
    estimatedDuration: "45–60 minutes",
    warmupQuestionsDe: [
      `Was weißt du schon über das Thema „${entry.de}“?`,
      `Wann brauchst du ${entry.de.toLowerCase()} im Alltag?`,
      "Welche Wörter kennst du schon dazu?",
    ],
    keyPhrasesDe: [
      `${entry.de}: wichtige Redemittel`,
      "Ich denke, dass ...",
      "Kannst du das bitte wiederholen?",
      "Ich brauche ein Beispiel.",
    ],
    studentQuestionsDe: [
      `Erkläre das Thema „${entry.de}“ mit einem einfachen Satz.`,
      "Gib ein Beispiel aus deinem Alltag.",
      "Stelle deinem Partner eine passende Frage.",
      "Antworte mit mindestens zwei Sätzen.",
    ],
    teacherNotesEn: [
      `Keep the lesson focused on high-frequency ${levelLabel} language for ${entry.en}.`,
      "Model one full exchange before pair speaking.",
      "Use short correction slots after each speaking phase.",
    ],
    interactionFlow: [
      { phase: "Input", detailEn: "8 min: activate vocabulary and useful sentence frames." },
      { phase: "Guided pairs", detailEn: "12 min: students use prompts with controlled answers." },
      { phase: "Free practice", detailEn: "12 min: switch partners and expand answers." },
      { phase: "Reflection", detailEn: "8 min: class feedback + correction recap." },
    ],
    wrapUpTaskDe: `Schreibe 3 Sätze zum Thema „${entry.de}“ und nutze neue Wörter von heute.`,
  };
}

function buildLevelSlides(level) {
  const entries = Object.values(courseDictionary[level] || {}).sort((left, right) => compareChapter(left.chapter, right.chapter));
  return entries.map((entry, index) => createTemplateSlide(level, entry, index + 1));
}

const curatedSlidesByAssignment = Object.fromEntries(curatedSlides.map((slide) => [slide.assignmentId, slide]));

const a1Slides = buildLevelSlides("A1");
const generatedA2Slides = buildLevelSlides("A2").map((slide) => curatedSlidesByAssignment[slide.assignmentId] || slide);
const b1Slides = buildLevelSlides("B1");

export const teachingSlides = [...a1Slides, ...generatedA2Slides, ...b1Slides];

export function getTeachingSlideById(id) {
  return teachingSlides.find((slide) => slide.id === id) || null;
}

export function getSlidesByCourse(courseId) {
  const normalized = String(courseId || "").trim().toUpperCase();
  return teachingSlides
    .filter((slide) => slide.course.toUpperCase() === normalized)
    .sort((a, b) => a.dayNumber - b.dayNumber);
}

export function getSlideNavigation(id, courseId) {
  const courseSlides = courseId ? getSlidesByCourse(courseId) : teachingSlides;
  const index = courseSlides.findIndex((slide) => slide.id === id);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: courseSlides[index - 1] || null,
    next: courseSlides[index + 1] || null,
  };
}

export function getAvailableSlideCourses() {
  return [...new Set(teachingSlides.map((slide) => slide.course))].sort();
}
