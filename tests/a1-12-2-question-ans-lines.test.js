import test from "node:test";
import assert from "node:assert/strict";

import { computeObjectiveScore } from "../src/utils/objectiveMarking.js";

const referenceEntry = {
  assignmentKey: "A1-12.2",
  format: "objective",
  expectedParts: ["teil1", "teil2", "teil3"],
  answers: {
    "Teil 1": {
      Answer1: "In Berlin",
      Answer2: "Mit seiner Frau und seinen drei Kindern",
      Answer3: "Mit seinem Auto",
      Answer4: "Um 7:30 Uhr",
      Answer5: "a) Barzahlung (cash)",
    },
    "Teil 2": {
      Answer1: "B) Um 9:00 Uhr",
      Answer2: "B) Um 12:00 Uhr",
      Answer3: "B) Um 18:00 Uhr",
      Answer4: "B) Um 21:00 Uhr",
      Answer5: "D) Alles Genannte",
    },
    "Teil 3": {
      Answer1: "B) Um 9 Uhr",
      Answer2: "B) Um 12 Uhr",
      Answer3: "A) ein Computer und ein Drucker",
      Answer4: "C) in einer Bar",
      Answer5: "C) bar",
    },
  },
};

const submissionText = `Teil I

1) wo wohnt Felix?
Ans Berlin.
2) mit wem wohnt Felix?
Ans mit seiner Frau und seine drei kindern.
3) wie Fährt Felix zur Arbeit?
Ans jeden morgen fährt er mit seinem Auto zur Arbeit.
4) wann beginnt Felix Arbeitstag?
Ans 7:30 Uhr.
5) wie bezahlt Felix gerne beim Einkaufen?
Ans A.

Teil 2
1)Wann fährt der zug von Hamburg nach Berlin ab?
Ans 9:00 Uhr B
2) Wann kommt der zug von Hamburg nach Berlin an?
Ans B 12:00 Uhr.
3) Wann fährt der Rückzug von Berlin nach Hamburg ab?
Ans 18:00 Uhr
4) Wann kommt der Rückzug von Berlin nach Hamburg an?
Ans B  21:00 Uhr
5) Was kann man in dem Bürogeschäft kaufen?
Ans C Bürobedarf für eine producktive Arbeitstsumgebung.

Teil 3

1) Wan fährt Felix zug von Hamburg nach Berlin ab?
Ans B
2) Wann kommt Felix zug in Berlin an?
Ans 12:00 Uhr
3) Welche objekete stehen auf Felix schreibtisch im Büro?
Ans C.
4) wo bewahrt Felix wichtig Dokumente auf?
Ans C
5) Wie bezahlt Felix gerne wenn er Büroartikel kauft?
Ans C.`;

test("A1-12.2 parses numbered question lines followed by Ans lines", () => {
  const result = computeObjectiveScore(referenceEntry, submissionText);
  const wrong = Object.entries(result.details)
    .filter(([, detail]) => !detail.correct)
    .map(([question]) => question);

  assert.equal(result.totalCount, 15);
  assert.equal(result.correctCount, 13);
  assert.deepEqual(wrong, ["teil2.5", "teil3.3"]);

  assert.equal(result.details["teil2.1"].correct, true);
  assert.equal(result.details["teil2.2"].correct, true);
  assert.equal(result.details["teil2.3"].correct, true);
  assert.equal(result.details["teil2.4"].correct, true);
  assert.equal(result.details["teil3.2"].correct, true);
  assert.equal(result.details["teil2.5"].correct, false);
  assert.equal(result.details["teil3.3"].correct, false);
});
