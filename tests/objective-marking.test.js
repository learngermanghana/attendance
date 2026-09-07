import test from "node:test";
import assert from "node:assert/strict";

import {
  compareAnswers,
  computeObjectiveScore,
  extractChoiceAnswers,
  extractNumberedVocabularyAnswers,
  extractVocabularyAnswers,
  normalizeAnswer,
} from "../src/utils/objectiveMarking.js";

test("normalizes case, accents, German sharp-s, and punctuation", () => {
  assert.equal(normalizeAnswer(" Füße! "), "fusse");
  assert.equal(normalizeAnswer("Ärztin-Kopf"), "arztin kopf");
});

test("extracts choice answers with Anzeige/Option wording and loose dots", () => {
  const answers = extractChoiceAnswers(`
    1. A Anzeige A
    Frage 2 B Anzeige B
    9 . B Option B
  `);

  assert.equal(answers[1], "A");
  assert.equal(answers[2], "B");
  assert.equal(answers[9], "B");
});

test("extracts vocabulary answer pairs", () => {
  const answers = extractVocabularyAnswers(`
    Head – Kopf
    Arm: Arm
    Foot - Fuß
  `);

  assert.equal(answers.head, "kopf");
  assert.equal(answers.arm, "arm");
  assert.equal(answers.foot, "fuss");
});

test("extracts numbered German-only vocabulary answers from Teil 3", () => {
  const answers = extractNumberedVocabularyAnswers(`
Teil 1:
1. A Anzeige A
2. B Anzeige B

Teil 2:
Liebe Bina,
ich bin krank. Viele Grüße

Teil 3:
1. Kopf
2. Arm
3. Bein
4. Auge
5. Nase
6. Ohr
7. Mund
8 Hand
9. Fuss
10. Bauch
  `);

  assert.deepEqual(answers, ["kopf", "arm", "bein", "auge", "nase", "ohr", "mund", "hand", "fuss", "bauch"]);
});

test("compares nine provided reference answers as 9/9 correct", () => {
  const ref = {
    1: "A",
    2: "B",
    3: "B",
    4: "A",
    5: "A",
    6: "kopf",
    7: "arm",
    8: "bein",
    9: "auge",
  };
  const student = {
    1: "A",
    2: "B",
    3: "B",
    4: "A",
    5: "A",
    6: "Kopf",
    7: "Arm",
    8: "Bein",
    9: "Auge",
  };

  const result = compareAnswers(ref, student);
  assert.equal(result.correctCount, 9);
  assert.equal(result.totalCount, 9);
  assert.ok(Object.values(result.details).every((detail) => detail.correct));
});


test("objective scoring accepts text answers with different capitalization", () => {
  const result = computeObjectiveScore({
    format: "objective",
    answers: {
      Answer1: "Wasser",
      Answer2: "Brot",
    },
  }, "Answer1: wasser\nAnswer2: BROT");

  assert.equal(result.correctCount, 2);
  assert.equal(result.totalCount, 2);
  assert.ok(Object.values(result.details).every((detail) => detail.correct));
});

test("A1-0.2 keeps a missing question gap when vocabulary numbering restarts", () => {
  const reference = { format: "objective", answers: {
    Answer1: "C) 26", Answer2: "A) A, O, U, B", Answer3: "A) Eszett", Answer4: "A) K",
    Answer5: "A) A-Umlaut", Answer6: "A) A, O, U, B", Answer7: "B) 4", Answer8: "Wasser",
    Answer9: "Kaffee", Answer10: "Blume", Answer11: "Schule", Answer12: "Tisch",
  } };
  const submission = `1. A (26)
2. A (ä,ö,ü,ß)
3. A (Eszett)
4. A (K)
5. A (A-Umlaut)
6. A (Ä,Ö,Ü,ß)

1. Wasser
2. Kaffee
3. Blume
4. Stuhle
5. Tisch`;
  const result = computeObjectiveScore(reference, submission);
  assert.equal(result.correctCount, 9);
  assert.equal(result.totalCount, 12);
  assert.equal(result.details[7].student, "");
  assert.equal(result.details[8].student, "Wasser");
  assert.equal(result.details[12].student, "Tisch");
  assert.equal(result.details[2].correct, true);
  assert.equal(result.details[6].correct, true);
});

test("partial final answer block numbered 1 to 5 aligns with questions 11 to 15", () => {
  const reference = { format: "objective", answers: {
    Answer1: "Falsch", Answer2: "Wahr", Answer3: "Falsch", Answer4: "Wahr", Answer5: "Wahr",
    Answer6: "Falsch", Answer7: "Wahr", Answer8: "Falsch", Answer9: "Falsch", Answer10: "Falsch",
    Answer11: "B) Einmal pro Woche", Answer12: "C) Apfel und Bananen", Answer13: "A) Ein halbes Kilo",
    Answer14: "B) 10 Euro", Answer15: "B) Einen schönen Tag",
  } };
  const submission = `Question 1.B) Jede Woche
Question 2.C) Äpfel und Bananen
Question 3.B) Ein kilo
Question 4.B) 10 Euro
Question 5. B) Einen schönen Tag`;

  const result = computeObjectiveScore(reference, submission);

  assert.equal(result.correctCount, 4);
  assert.equal(result.totalCount, 15);
  assert.equal(result.details[1].student, "");
  assert.equal(result.details[10].student, "");
  assert.equal(result.details[11].student, "B) Jede Woche");
  assert.equal(result.details[15].student, "B) Einen schönen Tag");
  assert.equal(result.details[13].correct, false);
});

test("A1-0.2 accepts slash-separated option letters with umlaut details", () => {
  const reference = {
    assignmentKey: "A1-0.2",
    answers: {
      Answer1: "C) 26",
      Answer2: "A) A, O, U, B",
      Answer3: "A) Eszett",
      Answer4: "A) K",
      Answer5: "A) A-Umlaut",
      Answer6: "A) A, O, U, B",
      Answer7: "B 4",
      Answer8: "Wasser",
      Answer9: "Kaffee",
      Answer10: "Blume",
      Answer11: "Schule",
      Answer12: "Tisch",
    },
  };
  const submission = `TEIL 1
1.C/26
2.A/Ä,Ö,Ü,SS
3.A/Eszett
4.A/K
5.A/ A-umlaut
6.A/ Ä,Ö,Ü,SS
7.B/ 4

TEIL 3
1. Wasser
2. Kaffee
3. Blume
4. Schule
5. Tisch`;

  const result = computeObjectiveScore(reference, submission);

  assert.equal(result.correctCount, 12);
  assert.equal(result.totalCount, 12);
  assert.equal(result.details[2].student, "A/Ä,Ö,Ü,SS");
  assert.equal(result.details[2].correct, true);
  assert.equal(result.details[6].correct, true);
});

test("computes A1-14.1 objective score from choices and vocabulary pairs", () => {
  const result = computeObjectiveScore("A1-14.1", `
    1. A Anzeige A
    2. B Anzeige B
    3. B
    4. A
    5. A
    Head – Kopf
    Arm – Arm
    Leg – Bein
    Eye – Auge
    Nose – Nase
    Ear – Ohr
    Mouth – Mund
    Hand – Hand
    Foot – Fuß
    Belly – Bauch
  `);

  assert.equal(result.correctCount, 15);
  assert.equal(result.totalCount, 15);
});

test("accepts German articles in A1-14.1 body-part vocabulary answers", () => {
  const result = computeObjectiveScore("A1-14.1", `
Frage 1.
1. Anzeige A

Frage 2
2. Anzeige B

Frage 3.
2. Anzeige B

Frage 4
1. Anzeige B

Frage 5
1. Anzeige A

Head - Der Kopf
Arm - Der Arm
Leg - Das Bein
Eye - Das Auge
Nose - Die Nase
Ear - Das Ohr
Mouth - Der Mund
Hand - Die Hand
Foot - Der Fuß
Stomach/Belly - Der Bauch
  `);

  assert.equal(result.correctCount, 14);
  assert.equal(result.totalCount, 15);
  assert.equal(result.details[4].correct, false);
  assert.ok(Object.entries(result.details).filter(([question]) => Number(question) >= 6).every(([, detail]) => detail.correct));
});

test("computes A1-14.1 objective score from the Reuben numbered German-only sample", () => {
  const result = computeObjectiveScore("A1-14.1", `
Teil 1:
1. A  Anzeige A
2. B  Anzeige B
3. B  Anzeige B
4. A  Anzeige A
5. A  Anzeige A

Teil 2:
Lieber Felix,
ich hoffe, es geht dir gut. Ich schreibe dir wegen deiner Einladung zu deinem Geburtstag. Vielen Dank für die Einladung, aber leider kann ich nicht kommen. Ich bin krank und habe Halsschmerzen. Es tut mir leid, dass ich nicht kommen kann. Können wir uns ein anderes Mal treffen und zusammen feiern? Ich freue mich auf deine Antwort.
Viele Grüße
Reuben

Teil 3:
1. Kopf
2. Arm
3. Bein
4. Auge
5. Nase
6. Ohr
7. Mund
8 Hand
9. Fuss
10. Bauch
  `);

  assert.equal(result.correctCount, 15);
  assert.equal(result.totalCount, 15);
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 0);
});

test("computes partial A1-14.1 objective score for real typo/wrong-answer variants", () => {
  const result = computeObjectiveScore("A1-14.1", `
Teil 1:
1.Anzeige A
2.Anzeige B
Frage 3.
2.Anzeige B
Frage 4.
Anzeige A
Frage 5.
2.Anzeige B

Teil 3:
Head-kopf
Arm -Arm.
Leg - Beine.
Eye-Auge.
Nose-Nase.
Ear- Ohr.
Mouth-Mund.
Hand-Hand.
Foot-Fuß.
Stomach /Belly -Magen
  `);

  assert.equal(result.totalCount, 15);
  assert.equal(result.correctCount, 12);
  assert.equal(result.details[5].correct, false);
  assert.equal(result.details[8].correct, false);
  assert.equal(result.details[15].correct, false);
});

test("loads dynamic multipart answer keys from answers_dictionary by assignment id", () => {
  const result = computeObjectiveScore("A2-1.1", `
Teil 2:
Hallo Anna,
ich komme heute später, weil ich arbeiten muss. Viele Grüße

Teil 3:
1. C
2. B
3. A
4. B
5. B
6. B
7. C

Teil 4:
1. B
2. A
3. A
4. B
5. C
  `);

  assert.equal(result.correctCount, 12);
  assert.equal(result.totalCount, 12);
  assert.equal(Object.values(result.details).filter((detail) => detail.partId === "teil2").length, 0);
});

test("dynamic multipart answer keys catch wrong answers in the right part", () => {
  const result = computeObjectiveScore("A2-1.1", `
Teil 3:
1. C
2. B
3. A
4. B
5. B
6. B
7. C

Teil 4:
1. A
2. A
3. A
4. B
5. C
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 11);
  assert.equal(result.details["teil4.1"].student, "A");
  assert.equal(result.details["teil4.1"].expected, "B");
  assert.equal(result.details["teil4.1"].correct, false);
});

test("A1-4 flat answer key supports restarted numbering across objective parts", () => {
  const result = computeObjectiveScore("A1-4", `
Teil 1
1.Ich komme aus Deutschland.Ich spreche Deutsch.
2.Sie kommt aus Frankreich.Sie spricht Französisch.
3.Ihr kommen aus Russland. Ihr sprechen Russisch.
4.Wir kommen aus Japan.Wir sprechen Japanisch.
5.Er kommt aus England. Er spricht Englisch.

Teil 2
1.c
2.b
3.d.
4.a
5.c
6.b
7.c

Teil 3
1.c
2.b
3.c
4.b
5.Madrid
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 9);
  assert.equal(result.details[9].correct, false);
  assert.equal(result.details[10].correct, false);
  assert.equal(result.details[12].correct, true);
});

test("option-only student answers match full answer text in A2-5.14", () => {
  const referenceEntry = {
    assignmentKey: "A2-5.14",
    answers: {
      teil3: {
        Answer1: "B) Die Kollegen und die Arbeit",
        Answer2: "C) Mit „Sie“",
        Answer3: "C) Eine Arbeitnehmervertretung",
        Answer4: "C) Arbeitskleidung, Pausen und feste Arbeitszeiten",
        Answer5: "C) Man kann Arbeitsbeginn und -ende flexibel wählen",
        Answer6: "C) 38–40 Stunden",
        Answer7: "B) Den Urlaub eintragen und genehmigen lassen",
      },
      teil4: {
        Answer1: "D) Weiter das Gehalt oder den Lohn",
        Answer2: "C) Sofort den Arbeitgeber informieren und zum Arzt gehen",
        Answer3: "C) Auf der Baustelle oder am Flughafen",
        Answer4: "C) Die Kündigung schriftlich und mit Frist einreichen",
        Answer5: "C) In der Volkshochschule",
      },
    },
  };

  const result = computeObjectiveScore(referenceEntry, `
Lieber Felix,
ich hoffe, es geht dir gut.
Viele Grüße
Fred

Lesen
1. b
2. c
3. c
4. c
5. c
6. c
7. b
8. d
9. c
10. c
11. c
12. c
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 12);
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 0);
});

test("A1-4 blank-line separated objective blocks ignore first numbered writing block", () => {
  const result = computeObjectiveScore("A1-4", `
1) Ich komme aus Deutschland. Ich spreche Deutsch.
2) Sie kommt aus Frankreich. Sie spricht Französisch
3) Sie kommen aus Russland. Sie sprechen Russisch
4) Wir kommen aus Japan. Wir sprechen Japanisch.
5) Er kommt aus England.Er spricht Englisch.



1) C
2) B
3) D
4) A
5) C
6) D
7) C


1) C
2) C
3) B
4) B
5) Barcelona oder Madrid
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 11);
  assert.equal(result.details[6].student, "D");
  assert.equal(result.details[6].correct, false);
  assert.equal(result.details[12].student, "Barcelona oder Madrid");
  assert.equal(result.details[12].correct, false);
});
test("A1-5 flat text answer key supports restarted numbering across Teil sections", () => {
  const result = computeObjectiveScore("A1-5", `
Teil 1
1.Der Tisch=the table
2.Die Lampe=the lamp
3.Das Buch=the book
4.Der Stuhl=the chair
5.Die Katze= the cat
6.Das Auto= the car
7.Der Hund=the dog
8.Die Blume=the flower
9.Das Fenster=the window
10.Der Computer =the Computer

Teil 2
1.Der Tisch ist groß.
2.Die Lampe ist neu.
3.Das Buch ist interessant.
4.Der Stuhl ist bequem.
5.Die Katze ist süß.
6.Das Auto ist schnell.
7.Der Hund ist freundlich.
8.Die Blume ist schön.
9.Das Fenster ist offen.
10.Der Computer ist teuer.

Teil 3
1.Ich sehe den Tisch.
2.Sie kauft die Lampe.
3.Er liest das Buch.
4.Wir brauchen den Stuhl.
5.Du fütterst die Katze.
6.Ich fahre das Auto.
7.Sie streichelt den Hund.
8.Er pflückt die Blume.
9.Wir putzen das Fenster.
10.Sie benutzen den Computer.
  `);

  assert.equal(result.totalCount, 30);
  assert.equal(result.correctCount, 30);
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 0);
});

test("A1-5 flat text answer key accepts an unnumbered first answer in a restarted Teil section", () => {
  const result = computeObjectiveScore("A1-5", `
Teil 1
1.der Tisch = the table
2.die Lampe = the lamp
3.das Buch = the book
4.der Stuhl = the chair
5.die Katze = the cat
6.das Auto = the car
7.der Hund = the dog
8.die Blume = the flower
9.das Fenster = the window
10.der Computer = the computer

Teil 2
1.Der Tisch ist groß.
2.Die Lampe ist neu.
3.Das Buch ist interessant.
4.Der Stuhl ist bequem.
5.Die Katze ist süß.
6.Das Auto ist schnell.
7.Der Hund ist freundlich.
8.Die Blume ist schön.
9.Das Fenster ist offen.
10.Der Computer ist teuer.

Teil 3
${"\u00a0"}Ich sehe den Tisch.
2. Sie kauft die Lampe.
3. Er liest das Buch.
4. Wir brauchen den Stuhl.
5. Du fütterst die Katze.
6. Ich fahre das Auto.
7. Sie streichelt den Hund.
8. Er pflückt die Blume.
9. Wir putzen das Fenster.
10. Sie benutzen den Computer.
  `);

  assert.equal(result.totalCount, 30);
  assert.equal(result.correctCount, 30);
  assert.equal(result.details[21].student, "Ich sehe den Tisch.");
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 0);
});

test("A2-4.11 choices keep explicit option letters before F-leading German answer text", () => {
  const result = computeObjectiveScore("A2-4.11", `
LESEN
1. B
2. B
3. A
4. B
5. B
6. A
7. B

HÖREN
1. B
2. B
3. B
4. C
5. B

SCHREIBEN
Sehr geehrte Damen und Herren,
ich möchte ein Auto mieten.
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 12);
  assert.equal(result.details["teil3.4"].expected, "B");
  assert.equal(result.details["teil3.4"].correct, true);
  assert.equal(result.details["teil4.4"].expected, "C");
  assert.equal(result.details["teil4.4"].correct, true);
});

test("A2-1.3 recognizes parenthesized part labels and compact same-line choices", () => {
  const result = computeObjectiveScore("A2-1.3", `
Teil 2
Lieber Thomas,
Kumasi gefällt mir besser als Accra. Pizza schmeckt mir besser als Hamburger.

Teil 3 (Lesen)
1.b 2.b 3.c 4.c 5.b 6.a 7.b

Teil 4 (Horen)
1.C
2.B
3.C
4.A
5.A
  `);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 8);
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 4);
  assert.equal(result.details["teil3.7"].correct, true);
  assert.equal(result.details["teil4.1"].student, "C");
});

test("A1-6 maps restarted numbered choice sections after vocabulary answers", () => {
  const result = computeObjectiveScore("A1-6", `
Teil 1
1.Das Wohnzimmer-the living room
2.Die Küche -the kitchen
3.Das Schlafzimmer - the bedroom
4.Das Badezimmer-the bathroom
5.Der Balkon -the balcony
6.Der Flur -the hallway
7.Das Bett - the bed
8.Der Tisch - the table
9.Der Stuhl-the chair
10.Der Schrank - the wardrobe

Teil 2
1.b
2.a
3.b
4.c
5.d
6.b
7.c

Teil 3
1.b
2.a
3.b
4.c
5.d
6.b
7.c
  `);

  assert.equal(result.totalCount, 24);
  assert.equal(result.correctCount, 23);
  assert.equal(Object.values(result.details).filter((detail) => !detail.correct).length, 1);
  assert.equal(result.details["19"].student, "a");
  assert.equal(result.details["19"].expected, "B");
});


test("A1-6 ignores matching letters embedded in numbered bilingual vocabulary answers", () => {
  const result = computeObjectiveScore("A1-6", `
1. das Wohnzimmer f. the living room
2. die Küche - a. the kitchen
3. das Schlafzimmer -b. the bedroom
4. das Badezimmer -d. the bathroom
5. der Balkon - c. the balcony
6. der Flur - e. the hallway
7. das Bett - i. the bed
8. der Tisch - h. the table
9. der Stuhl - g. the chair
10. der Schrank - j. the wardrobe

Teil 2
1. b) Vier
2. a) Ein Sofa und ein Fernseher
3. b) Einen Herd, einen Kühlschrank und einen Tisch mit vier Stühlen
4. c) Ein großes Bett
5. d) Eine Dusche, eine Badewanne und ein Waschbecken
6. b) Klein und schön
7. c) Blumen und einen kleinen Tisch mit zwei Stühlen

Teil 3
1. b) Vier
2. b) Ein Sofa und ein Fernseher
3. b) Einen Herd, einen Kühlschrank und einen Tisch mit vier Stühlen
4. c) Ein großes Bett
5. d) Eine Dusche, eine Badewanne und ein Waschbecken
6. b) Klein und schön
7. c) Blumen und einen kleinen Tisch mit zwei Stühlen
  `);

  assert.equal(result.totalCount, 24);
  assert.equal(result.correctCount, 24);
  assert.deepEqual(Object.entries(result.details).filter(([, detail]) => !detail.correct), []);
});

test("German prose containing an does not bypass writing-block detection", () => {
  const reference = {
    assignmentKey: "TEST-PROSE",
    rawAnswers: {
      Answer1: "A) Das Essen",
      Answer2: "A) Die Musik",
      Answer3: "A) Der Unterricht",
      Answer4: "A) Das Buch",
      Answer5: "A) Die Familie",
    },
  };
  const result = computeObjectiveScore(reference, `
1. Das Essen ist an Feiertagen besonders wichtig.
2. Die Musik erinnert an schöne Momente.
3. Der Unterricht beginnt an jedem Montag.
4. Das Buch liegt an seinem Platz.
5. Die Familie denkt an die Reise.
  `);

  assert.equal(result.totalCount, 5);
  assert.equal(result.correctCount, 0);
  assert.deepEqual(Object.values(result.details).map((detail) => detail.student), ["", "", "", "", ""]);
});

test("A1-6 maps unnumbered Teil 1 vocabulary before restarted choice sections", () => {
  const result = computeObjectiveScore("A1-6", `
Teil 1:
das Wohnzimmer – the living room
die Küche - the kitchen
das Schlafzimmer – the bedroom
das Badezimmer – the bathroom
der Balkon – the balcony
der Flur – the hallway
das Bett – the bedder
Tisch – the table
der Stuhl – the chair
der Schrank – the wardrobe

Teil 2
1. b) Vier
2. a) Ein Sofa und ein Fernseher
3. d) Eine Dusche und eine Badewanne
4. c) Ein großes Bett
5. d) Eine Dusche, eine Badewanne und ein Waschbecken
6. c) Groß und schön
7. d) Eine Dusche und eine Badewanne

Teil 3:
1.b) Vier
2.b) Ein Sofa und ein Fernseher
3.b) Einen Herd, einen Kühlschrank und einen Tisch mit vier Stühlen
4.c) Ein großes Bett
5.d) Eine Dusche, eine Badewanne und ein Waschbecken
6.b) Klein und schön
7.c) Blumen und einen kleinen Tisch mit zwei Stühlen
  `);

  assert.equal(result.totalCount, 24);
  assert.equal(result.correctCount, 21);
  assert.deepEqual(
    Object.entries(result.details)
      .filter(([, detail]) => !detail.correct)
      .map(([question]) => question),
    ["13", "16", "17"],
  );
  assert.equal(result.details[1].student, "das Wohnzimmer – the living room");
  assert.equal(result.details[10].student, "der Schrank – the wardrobe");
});


test("A1-0.2 aligns a second 1-5 answer group without a Teil heading", () => {
  const submission = `1 c
2 A
3 A
4 A
5 B
6 A
7 B
1 Wasser
2 Kaffee
3 Blume
4 Schule
5 Tis`;

  const result = computeObjectiveScore("A1-0.2", submission);

  assert.equal(result.totalCount, 12);
  assert.equal(result.correctCount, 11);
  assert.equal(result.details[1].student.toLowerCase(), "c");
  assert.equal(result.details[2].student.toLowerCase(), "a");
  assert.equal(result.details[5].correct, false);
  assert.equal(result.details[8].student.toLowerCase(), "wasser");
  assert.equal(result.details[8].correct, true);
  assert.equal(result.details[11].student.toLowerCase(), "schule");
  assert.equal(result.details[11].correct, true);
  assert.equal(result.details[12].student.toLowerCase(), "tis");
  assert.equal(result.details[12].correct, true);
});
