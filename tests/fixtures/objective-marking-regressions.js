export const objectiveMarkingRegressions = [
  {
    name: "accepts common Frage and Anzeige numbering formats",
    referenceEntry: {
      assignmentKey: "fixture-anzeige-formats",
      level: "A1",
      format: "objective",
      answers: {
        Answer1: "Anzeige A",
        Answer2: "Anzeige B",
        Answer3: "Anzeige C",
        Answer4: "Anzeige D",
      },
    },
    submissionText: "Frage1: 1. Anzeige A\nFrage 2: Anzeige B\n3. C\n4D",
    expectedCorrect: 4,
    expectedTotal: 4,
  },
  {
    name: "accepts German or English vocabulary answers",
    referenceEntry: {
      assignmentKey: "fixture-bilingual-vocabulary",
      level: "A1",
      format: "objective",
      answers: {
        Answer1: "a. Head – Kopf",
        Answer2: "b. Foot – Fuß",
        Answer3: "c. Stomach / Belly – Bauch",
      },
    },
    submissionText: "1. Head\n2. Fuss\n3. Belly",
    expectedCorrect: 3,
    expectedTotal: 3,
  },
  {
    name: "accepts letter plus matching text through J",
    referenceEntry: {
      assignmentKey: "fixture-letter-text-j",
      level: "A1",
      format: "objective",
      answers: {
        Answer1: "J) the table",
        Answer2: "I) the computer",
      },
    },
    submissionText: "1. J - the table\n2. I the computer",
    expectedCorrect: 2,
    expectedTotal: 2,
  },
];
