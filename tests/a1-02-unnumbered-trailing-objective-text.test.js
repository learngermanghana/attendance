import test from "node:test";
import assert from "node:assert/strict";
import { checkDeterministicObjectiveAnswers } from "../src/utils/autoMarking.js";

const choice = (letter, text) => ({
  correctLetter: letter,
  correctText: text,
  rawCorrectAnswer: `${letter}) ${text}`,
});

const textAnswer = (text) => ({
  correctText: text,
  rawCorrectAnswer: text,
});

const referenceEntry = {
  assignmentKey: "A1-0.2",
  level: "A1",
  format: "objective",
  answers: {
    Answer1: choice("C", "26"),
    Answer2: choice("A", "A, O, U, B"),
    Answer3: choice("A", "Eszett"),
    Answer4: choice("A", "K"),
    Answer5: choice("A", "A-Umlaut"),
    Answer6: choice("A", "A, O, U, B"),
    Answer7: choice("B", "4"),
    Answer8: textAnswer("Wasser"),
    Answer9: textAnswer("Kaffee"),
    Answer10: textAnswer("Blume"),
    Answer11: textAnswer("Schule"),
    Answer12: textAnswer("Tisch"),
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
