import { courseDictionary } from "./courseDictionary.js";
import { getSlideQuestionSet } from "./teachingSlideQuestionDictionary.js";
import { a1WorkbookAlignedSlidesDays1To5 } from "./a1WorkbookAlignedSlidesDays1To5.js";
import { a1WorkbookAlignedSlidesDays6To10 } from "./a1WorkbookAlignedSlidesDays6To10.js";
import { a1LaterTeachingSlides } from "./a1LaterTeachingSlides.js";
import { a2WorkbookAlignedSlides } from "./a2WorkbookAlignedSlides.js";
import { a2WorkbookAlignedSlidesDays6To10 } from "./a2WorkbookAlignedSlidesDays6To10.js";
import { a2WorkbookAlignedSlidesDays11To15 } from "./a2WorkbookAlignedSlidesDays11To15.js";
import { a2WorkbookAlignedSlidesDays16To20 } from "./a2WorkbookAlignedSlidesDays16To20.js";
import { a2WorkbookAlignedSlidesDays21To24 } from "./a2WorkbookAlignedSlidesDays21To24.js";
import { a2WorkbookAlignedSlidesDays25To28 } from "./a2WorkbookAlignedSlidesDays25To28.js";
import { b1WorkbookAlignedSlidesDays1To10 } from "./b1WorkbookAlignedSlidesDays1To10.js";
import { b1WorkbookAlignedSlidesDays11To20 } from "./b1WorkbookAlignedSlidesDays11To20.js";
import { b1WorkbookAlignedSlidesDays21To28 } from "./b1WorkbookAlignedSlidesDays21To28.js";
import { b2PresenterSlides } from "./b2PresenterSlides.js";
import { c1PresenterSlides } from "./c1PresenterSlides.js";

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
  const topicContext = {
    topicDe: entry.de,
    topicEn: entry.en,
    level: levelLabel,
    assignmentId: entry.assignment_id,
  };
  const questionSet = getSlideQuestionSet(entry.assignment_id, topicContext);

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
    warmupQuestionsDe: questionSet.warmupQuestionsDe,
    keyPhrasesDe: [
      `${entry.de}: wichtige Redemittel`,
      "Ich denke, dass ...",
      "Kannst du das bitte wiederholen?",
      "Ich brauche ein Beispiel.",
    ],
    studentQuestionsDe: questionSet.studentQuestionsDe,
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

function enhanceA1Day2PronounSlide(slide) {
  const assignmentId = String(slide.assignmentId || "").trim().toUpperCase();
  if (assignmentId !== "A1-1.1") return slide;

  return {
    ...slide,
    objective: "Students connect Day 1 greetings and Day 2 spelling to a first complete self-introduction, recognise the German sentence pattern person + conjugated verb + information, use ich/du/er/sie verb endings with wohnen and kommen, handle heißen correctly, and answer basic personal-information questions.",
    estimatedDuration: "50–65 minutes",
    warmupQuestionsDe: [
      "Wie begrüßt du jemanden?",
      "Wie heißt du?",
      "Wie buchstabierst du deinen Vornamen?",
      "Woher kommst du?",
      "Wo wohnst du?",
    ],
    keyPhrasesDe: [
      "Hallo! Ich heiße Ama. A-M-A. Ich komme aus Ghana. Ich wohne in Accra. Tschüss!",
      "Satzmuster: Person + konjugiertes Verb + Information",
      "Ich wohne in Accra. / Du wohnst in Kumasi. / Ama wohnt in Tema.",
      "wohnen: ich wohne · du wohnst · er/sie wohnt",
      "kommen: ich komme · du kommst · er/sie kommt",
      "heißen: ich heiße · du heißt · er/sie heißt",
      "Wie heißt du? – Ich heiße Ama.",
      "Woher kommst du? – Ich komme aus Ghana.",
      "Wo wohnst du? – Ich wohne in Accra.",
      "Wo arbeitest du? – Ich arbeite in Accra.",
    ],
    studentQuestionsDe: [
      "Wie heißt du?",
      "Wie buchstabierst du deinen Vornamen?",
      "Woher kommst du?",
      "Wo wohnst du?",
      "Wo arbeitest du?",
      "Wie heißt dein Freund oder deine Freundin und wo wohnt er oder sie?",
    ],
    teacherNotesEn: [
      "Begin by recycling Day 1 rather than starting pronouns as a disconnected grammar topic: greeting → name → spelling → origin → residence → farewell.",
      "Write one sentence pattern visibly before the conjugation table: Person + conjugated verb + information. Keep the conjugated verb highlighted in every example.",
      "Teach only the singular pattern needed here first: ich -e, du -st, er/sie -t with wohnen and kommen. Do not overload students with the complete conjugation system yet.",
      "Separate heißen from the regular pattern and explicitly contrast the common error du heißst with the correct form du heißt.",
      "Teach every personal-information statement together with its matching question so students build a conversational toolkit, not isolated grammar knowledge.",
      "Keep the existing workbook bridge intact: Teil 1 Hören followed by Teil 2 Schreiben.",
    ],
    interactionFlow: [
      { phase: "Day 1 + alphabet bridge", detailEn: "7 min: build the complete model together: Hallo! → Ich heiße Ama. → A-M-A. → Ich komme aus Ghana. → Ich wohne in Accra. → Tschüss! Students then substitute their own information." },
      { phase: "First German sentence formula", detailEn: "8 min: place Person + Verb + Information on the board. Compare Ich wohne in Accra, Du wohnst in Kumasi and Ama wohnt in Tema; students identify the changing verb." },
      { phase: "Visual conjugation pattern", detailEn: "10 min: build wohnen as ich wohne / du wohnst / er-sie wohnt, then transfer the same pattern to kommen. Focus on -e, -st and -t only." },
      { phase: "heißen special pattern", detailEn: "7 min: contrast ich heiße / du heißt / er-sie heißt and correct the deliberate error Du heißst Felix → Du heißt Felix." },
      { phase: "Question → answer toolkit", detailEn: "10 min: practise Wie heißt du?, Woher kommst du?, Wo wohnst du? and Wo arbeitest du? with complete answers before switching roles." },
      { phase: "Workbook bridge", detailEn: "8 min: rehearse the same name, origin, residence and workplace information needed for the Hören and short self-introduction writing task." },
    ],
    wrapUpTaskDe: "Stell dich in 5–6 kurzen Sätzen vor: Begrüßung, Name, Buchstabieren, Herkunft, Wohnort und Verabschiedung. Beantworte danach: Wie heißt du? Woher kommst du? Wo wohnst du?",
    teacherSupport: {
      ...(slide.teacherSupport || {}),
      lessonOverviewEn: "The second half of Day 2 should feel like the next step after greetings and the alphabet, not a new disconnected grammar unit. Students recycle the Day 1 greeting/farewell, spell their name from the alphabet lesson, then learn how subject + conjugated verb + information lets them introduce themselves and ask another person the same questions.",
      grammarFocusEn: [
        "First sentence formula: person + conjugated verb + information. Keep the verb visibly highlighted in examples.",
        "Regular singular pattern with wohnen: ich wohne, du wohnst, er/sie wohnt.",
        "Transfer the same basic endings to kommen: ich komme, du kommst, er/sie kommt.",
        "Treat heißen separately: ich heiße, du heißt, er/sie heißt. Do not form *du heißst.",
        "Pair statements with questions: Wie heißt du? → Ich heiße ...; Woher kommst du? → Ich komme aus ...; Wo wohnst du? → Ich wohne in ...; Wo arbeitest du? → Ich arbeite ...",
      ],
      modelExamplesDe: [
        "Hallo! Ich heiße Ama. A-M-A. Ich komme aus Ghana. Ich wohne in Accra. Tschüss!",
        "Ich wohne in Accra. – Du wohnst in Kumasi. – Ama wohnt in Tema.",
        "Ich komme aus Ghana. – Du kommst aus Nigeria. – Er kommt aus Deutschland.",
        "Ich heiße Ama. – Du heißt Felix. – Sie heißt Sarah.",
        "Wie heißt du? – Ich heiße Ama.",
        "Woher kommst du? – Ich komme aus Ghana.",
        "Wo wohnst du? – Ich wohne in Accra.",
        "Wo arbeitest du? – Ich arbeite in Accra.",
      ],
      commonMistakesEn: [
        "Using an infinitive after the subject: ich wohnen / du kommen instead of ich wohne / du kommst.",
        "Using the same verb form for every person instead of changing -e, -st and -t.",
        "Writing du heißst instead of du heißt.",
        "Using ich heißt instead of ich heiße.",
        "Learning statements without being able to ask the matching personal-information question.",
        "Treating the alphabet, greetings and pronouns as separate topics instead of combining them in one short self-introduction.",
      ],
    },
  };
}

function buildLevelSlides(level) {
  const entries = Object.values(courseDictionary[level] || {}).sort((left, right) => compareChapter(left.chapter, right.chapter));
  return entries.map((entry, index) => createTemplateSlide(level, entry, index + 1));
}

const upgradedA1WorkbookAlignedSlidesDays1To5 = a1WorkbookAlignedSlidesDays1To5.map(enhanceA1Day2PronounSlide);

const curatedSlidesByAssignment = Object.fromEntries(
  [
    ...curatedSlides,
    ...upgradedA1WorkbookAlignedSlidesDays1To5,
    ...a1WorkbookAlignedSlidesDays6To10,
    ...a1LaterTeachingSlides,
    ...a2WorkbookAlignedSlides,
    ...a2WorkbookAlignedSlidesDays6To10,
    ...a2WorkbookAlignedSlidesDays11To15,
    ...a2WorkbookAlignedSlidesDays16To20,
    ...a2WorkbookAlignedSlidesDays21To24,
    ...a2WorkbookAlignedSlidesDays25To28,
    ...b1WorkbookAlignedSlidesDays1To10,
    ...b1WorkbookAlignedSlidesDays11To20,
    ...b1WorkbookAlignedSlidesDays21To28,
  ].map((slide) => [slide.assignmentId, slide]),
);

const a1Slides = buildLevelSlides("A1").map((slide) => curatedSlidesByAssignment[slide.assignmentId] || slide);
const generatedA2Slides = buildLevelSlides("A2").map((slide) => curatedSlidesByAssignment[slide.assignmentId] || slide);
const b1Slides = buildLevelSlides("B1").map((slide) => curatedSlidesByAssignment[slide.assignmentId] || slide);

export const teachingSlides = [...a1Slides, ...generatedA2Slides, ...b1Slides, ...b2PresenterSlides, ...c1PresenterSlides];

export function getTeachingSlideById(id) {
  return teachingSlides.find((slide) => slide.id === id) || null;
}

export function getTeachingSlideByAssignmentId(assignmentId) {
  const normalized = String(assignmentId || "").trim().toUpperCase();
  if (!normalized) return null;
  return teachingSlides.find((slide) => String(slide.assignmentId || "").trim().toUpperCase() === normalized) || null;
}

export function getSlidesByCourse(courseId) {
  const normalized = String(courseId || "").trim().toUpperCase();
  return teachingSlides
    .filter((slide) => String(slide.course || "").trim().toUpperCase() === normalized)
    .sort((a, b) => Number(a.dayNumber || 0) - Number(b.dayNumber || 0));
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
  return [...new Set(teachingSlides.map((slide) => slide.course).filter(Boolean))].sort();
}