import test from "node:test";
import assert from "node:assert/strict";

import { checkDeterministicObjectiveAnswers } from "../src/utils/autoMarking.js";

const referenceEntry = {
  assignmentKey: "A1-12.2",
  format: "objective",
  answers: {
    "Teil 1": {
      Answer1: "In Berlin",
      Answer2: "Mit seiner Frau und seinen drei Kindern",
      Answer3: "Mit seinem Auto",
      Answer4: "Um 7:30 Uhr",
      Answer5: "A) Barzahlung (cash)",
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

const submissionText = `Teil 1
1.In Berlin
2.Mit Seiner frau und seinen drei Kindern
3.Mit dem Auto /Mit seinem Auto
4.Um 7:00 Uhr/Von 7:30 Uhr bis 17:00Uhr
5.A.Barzahlung (cash)

Teil 2
1.B.Um 9:00 Uhr
2.B.Um 12:00 Uhr
3.B.Um 18:00 Uhr
4.B.Um 21:00 Uhr
5.D.Alles Genannte

Teil 3
1.B.Um 9:00 Uhr
2.C.Um 13:00 uhr
3.C.Ein Computer und ein Telefon
4.C.in einem Aktenschrank
5.C.Bar`;

test("A1-12.2 keeps objective Teil 2 and Teil 3 review findings under their real part IDs", () => {
  const result = checkDeterministicObjectiveAnswers({ referenceEntry, submissionText });

  assert.equal(result.objectiveTotal, 15);
  assert.equal(result.objectiveCorrect, 11);

  const wrong = result.wrongAnswers.map((row) => `${row.partId}.${row.question}`);
  assert.deepEqual(wrong, ["teil1.4", "teil3.2", "teil3.3", "teil3.4"]);
  assert.equal(result.wrongAnswers.some((row) => row.partId === "teil2"), false);
  assert.equal(result.wrongAnswers.some((row) => row.partId === "teil3" && row.question === 5), false);
});
