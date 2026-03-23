const defaultQuestionSet = {
  warmupQuestionsDe: [
    ({ topicDe }) => `Was weißt du schon über das Thema „${topicDe}“?`,
    ({ topicDe }) => `Wann brauchst du ${topicDe.toLowerCase()} im Alltag?`,
    () => "Welche Wörter kennst du schon dazu?",
  ],
  studentQuestionsDe: [
    ({ topicDe }) => `Erkläre das Thema „${topicDe}“ mit einem einfachen Satz.`,
    () => "Gib ein Beispiel aus deinem Alltag.",
    () => "Stelle deinem Partner eine passende Frage.",
    () => "Antworte mit mindestens zwei Sätzen.",
  ],
};

export const teachingSlideQuestionDictionary = {
  /**
   * Add custom prompts per assignment ID:
   * "A2-4.9": { // Day 9 (Chapter 4.9 Urlaub)
   *   warmupQuestionsDe: [
   *     "Wohin möchtest du im nächsten Urlaub fahren?",
   *     "Was ist dir im Urlaub am wichtigsten?",
   *   ],
   *   studentQuestionsDe: [
   *     "Wie planst du einen Urlaub Schritt für Schritt?",
   *     "Was machst du, wenn im Urlaub etwas schiefgeht?",
   *   ],
   * }
   */
  "A2-2.5": {
    warmupQuestionsDe: [
      "Was machst du am liebsten nach der Arbeit oder nach dem Kurs?",
      "Wie oft machst du Sport oder bewegst du dich?",
      "Welches Hobby möchtest du in den nächsten Monaten ausprobieren?",
    ],
    studentQuestionsDe: [
      "Welche Hobbys machen dir am meisten Spaß und warum?",
      "Wie oft machst du diese Hobbys in einer normalen Woche?",
      "Machst du dein Hobby lieber allein oder mit anderen?",
      "Was ist schwierig an deinem Hobby und wie löst du das?",
    ],
  },
  "A2-4.9": {
    warmupQuestionsDe: [
      "Wohin möchtest du als Nächstes in den Urlaub fahren?",
      "Reist du lieber mit Familie, Freunden oder allein? Warum?",
      "Was ist dir im Urlaub wichtiger: Entspannung oder Abenteuer?",
    ],
    studentQuestionsDe: [
      "Wie planst du einen Urlaub von Anfang bis Ende?",
      "Welche drei Dinge nimmst du immer in den Urlaub mit?",
      "Was war dein schönster Urlaub und warum?",
      "Was machst du, wenn im Urlaub ein Problem passiert?",
    ],
  },
};

function resolveQuestionList(templateList, context) {
  return templateList.map((item) => (typeof item === "function" ? item(context) : item));
}

export function getSlideQuestionSet(assignmentId, context) {
  const customQuestionSet = teachingSlideQuestionDictionary[assignmentId] || {};

  return {
    warmupQuestionsDe: customQuestionSet.warmupQuestionsDe || resolveQuestionList(defaultQuestionSet.warmupQuestionsDe, context),
    studentQuestionsDe: customQuestionSet.studentQuestionsDe || resolveQuestionList(defaultQuestionSet.studentQuestionsDe, context),
  };
}
