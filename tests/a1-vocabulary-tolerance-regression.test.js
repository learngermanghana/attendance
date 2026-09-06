import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkDeterministicObjectiveAnswers } from "../src/utils/autoMarking.js";

const dictionary = JSON.parse(fs.readFileSync(new URL("../src/data/answers_dictionary.json", import.meta.url), "utf8"));

function entryByAssignmentId(id) {
  return Object.values(dictionary).find((entry) => String(entry?.assignment_id || entry?.assignmentId || "").trim().toUpperCase() === id);
}

test("A1-6 accepts the correct German headword even when the English gloss has a typo", () => {
  const referenceEntry = entryByAssignmentId("A1-6");
  assert.ok(referenceEntry);

  const submissionText = `Teil 1
1.das Wohnzimmer- f. the livingroom
2.die Küche- a. the kitchen
3.das Schlafzimmer- b. the bedroom
4.das Badezimmer- d. the bathroom
5.der Balkon- c. the balcony
6.der Flur- e. the hallroom
7.das Bett- i. the bed
8.der Tisch- h. the table
9.der Stuhl- g. the chair
10.der Schrank- j. the wardrobe

teil 2
1.b) Vier
2.a) Ein Sofa und ein Fernseher
3.b) Einen Herd, einen Kühlschrank und einen Tisch mit vier Stühlen
4.c) Ein großes Bett
5.d) Eine Dusche, eine Badewanne und ein Waschbecken
6.b) Klein und schön
7.c) Blumen und einen kleinen Tisch mit zwei Stühlen

Teil 3
1.b) Vier
2.b) Ein Sofa und ein Fernseher
3.b) Einen Herd, einen Kühlschrank und einen Tisch mit vier Stühlen
4.c) Ein großes Bett
5.d) Eine Dusche, eine Badewanne und ein Waschbecken
6.b) Klein und schön
7.c) Blumen und einen kleinen Tisch mit zwei Stühlen`;

  const result = checkDeterministicObjectiveAnswers({ referenceEntry, submissionText });
  assert.equal(result.objectiveCorrect, 24);
  assert.equal(result.objectiveTotal, 24);
  assert.equal(result.wrongAnswers.length, 0);
});

test("A1-14.1 accepts one-character spelling slips in otherwise correct body-part vocabulary", () => {
  const referenceEntry = entryByAssignmentId("A1-14.1");
  assert.ok(referenceEntry);

  const submissionText = `Teil 1
Frage 1
1.Anzeige A

Frage 2
2.Anzeige B

Frage 3
2.Anzeige B

Frage 4
1.Anzeige A

Frage 5
1.Anzeige A

Teil 2 schreiben
Lieber Felix,
danke für deine Einladung,ich kann leider nicht zu deinem Geburtstag kommen,veil ich krank bin.Mein Kopt tut sehr weh.kömmen wir uns nächste woche sehen?
Liebe Grüße,
Mary

Teil 3
A.Head-der Kopt
B.Arm-der Arm
C.leg-das Bein
D.Eye-das Auge
E.Nose-die Nase
F.Ear-das Ohr
G.mouth-der Mund
H.hand -die hand
I. foot-der fuß
J.stomach/Belly-der Bauch`;

  const result = checkDeterministicObjectiveAnswers({ referenceEntry, submissionText });
  assert.equal(result.objectiveCorrect, 15);
  assert.equal(result.objectiveTotal, 15);
  assert.equal(result.wrongAnswers.length, 0);
});
