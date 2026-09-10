import test from "node:test";
import assert from "node:assert/strict";
import { checkDeterministicObjectiveAnswers } from "../src/utils/autoMarking.js";

const referenceEntry = {
  assignmentKey: "A1-0.2",
  level: "A1",
  format: "objective",
  answers: {
    Answer1: "C) 26",
    Answer2: "A) A, O, U, B",
    Answer3: "A) Eszett",
    Answer4: "A) K",
    Answer5: "A) A-Umlaut",
    Answer6: "A) A, O, U, B",
    Answer7: "B) 4",
    Answer8: "Wasser",
    Answer9: "Kaffee",
    Answer10: "Blume",
    Answer11: "Schule",
    Answer12: "Tisch",
  },
};

const submissionText = `1.D (27)
2. A (Ä Ö Ü β)
3. A (Eszett)
4. A (K)
5 A-(umlaut)
6 (Ä Ö Üβ )
7 B (four)

Wasser
Kaffei
Blume
Schule
Tisch`;

test("A1-0.2 recovers trailing unnumbered text answers in sequence", () => {
  const result = checkDeterministicObjectiveAnswers({ referenceEntry, submissionText });

  assert.equal(result.objectiveTotal, 12);
  assert.equal(result.objectiveCorrect, 11);
  assert.equal(result.objectiveScore, 92);
  assert.deepEqual(
    result.wrongAnswers.map(({ question, expected, student }) => ({ question, expected, student })),
    [{ question: 1, expected: "C", student: "D" }],
  );
  assert.equal(result.missingAnswers.length, 0);
});
