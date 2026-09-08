function check(questionDe, answerDe, noteEn = "") {
  return { questionDe, answerDe, noteEn };
}

export const A1_GRAMMAR_CHECKS = {
  "A1-0.1": [
    check("Du sprichst mit einem Freund. Ergänze: Wie geht es ___?", "dir"),
    check("Du sprichst höflich mit einer Lehrerin. Ergänze: Wie geht es ___?", "Ihnen"),
    check("Es ist 19:00 Uhr. Welche Begrüßung passt: Guten Morgen, Guten Tag oder Guten Abend?", "Guten Abend."),
    check("Du verabschiedest dich informell von einem Freund. Welche Form passt?", "Tschüss!"),
  ],
  "A1-0.2": [
    check("Wie viele Buchstaben hat das deutsche Standardalphabet?", "26 Buchstaben."),
    check("Wie heißt das Zeichen ß?", "Eszett oder scharfes S."),
    check("Buchstabiere: Wasser.", "W-A-S-S-E-R."),
    check("Wie heißen Ä, Ö und Ü?", "A-Umlaut, O-Umlaut und U-Umlaut."),
  ],
  "A1-1.1": [
    check("Korrigiere: Ich wohnen in Accra.", "Ich wohne in Accra."),
    check("Korrigiere: Du kommen aus Ghana.", "Du kommst aus Ghana."),
    check("Korrigiere: Er wohnen in Tema.", "Er wohnt in Tema."),
    check("Wie lautet die du-Form von heißen?", "du heißt"),
  ],
  "A1-1.1-PRACTICE": [
    check("Ergänze das W-Wort: ___ heißt du?", "Wie heißt du?"),
    check("Ergänze das W-Wort: ___ kommst du?", "Woher kommst du?"),
    check("Ergänze den Artikel: Das ist ___ Mann.", "Das ist ein Mann."),
    check("Ergänze den Artikel: Das ist ___ Frau.", "Das ist eine Frau."),
  ],
  "A1-1.2": [
    check("Konjugiere lernen mit ich.", "ich lerne"),
    check("Konjugiere spielen mit du.", "du spielst"),
    check("Konjugiere machen mit er.", "er macht"),
    check("Konjugiere wohnen mit wir.", "wir wohnen"),
  ],
  "A1-2": [
    check("Schreibe 21 auf Deutsch.", "einundzwanzig"),
    check("Schreibe 47 auf Deutsch.", "siebenundvierzig"),
    check("Wie fragst du nach einer Telefonnummer?", "Wie ist deine Telefonnummer?"),
    check("Wie fragst du nach einer Adresse?", "Wie ist deine Adresse? / Wie lautet deine Adresse?"),
  ],
  "A1-1.3": [
    check("Ergänze den Artikel: Das ist ___ Tisch.", "Das ist ein Tisch."),
    check("Ergänze den Artikel: Das ist ___ Lampe.", "Das ist eine Lampe."),
    check("Ergänze den Artikel: Das ist ___ Kind.", "Das ist ein Kind."),
    check("Ordne richtig: aus Ghana / komme / ich.", "Ich komme aus Ghana."),
  ],
  "A1-2.3": [
    check("Ergänze: Das ist ___ Mutter. (ich)", "Das ist meine Mutter."),
    check("Ergänze das Verb: Mein Bruder ___ Fußball. (spielen)", "Mein Bruder spielt Fußball."),
    check("Ergänze das Verb: Ich ___ gern Musik. (hören)", "Ich höre gern Musik."),
    check("Ergänze das Verb: Meine Eltern ___ in Accra. (wohnen)", "Meine Eltern wohnen in Accra."),
  ],
  "A1-3": [
    check("Ergänze: Wie viel ___ das T-Shirt?", "Wie viel kostet das T-Shirt?"),
    check("Ergänze: Wie viel ___ die Schuhe?", "Wie viel kosten die Schuhe?"),
    check("Ergänze: Ich ___ Kaffee. (mögen)", "Ich mag Kaffee."),
    check("Ergänze: Ich ___ gern Tee trinken. (möchten)", "Ich möchte gern Tee trinken."),
  ],
  "A1-4": [
    check("Ergänze die Präposition: Ich komme ___ Ghana.", "Ich komme aus Ghana."),
    check("Ergänze das Verb: Ich ___ Deutsch. (sprechen)", "Ich spreche Deutsch."),
    check("Ergänze: Er ___ aus Deutschland. (kommen)", "Er kommt aus Deutschland."),
    check("Ergänze: Sie ___ Englisch. (sprechen)", "Sie spricht Englisch."),
  ],
  "A1-5": [
    check("Ergänze: ___ Mann kauft den Apfel.", "Der Mann kauft den Apfel."),
    check("Ergänze den Akkusativ: Ich sehe ___ Hund.", "Ich sehe einen Hund."),
    check("Ergänze den Akkusativ: Sie kauft ___ Tasche.", "Sie kauft eine Tasche."),
    check("Ergänze den Akkusativ: Wir haben ___ Auto.", "Wir haben ein Auto."),
  ],
  "A1-6": [
    check("Ergänze: Das ist ___ Buch. (ich)", "Das ist mein Buch."),
    check("Ergänze: Das ist ___ Tasche. (ich)", "Das ist meine Tasche."),
    check("Ergänze: Ist das ___ Stift? (du)", "Ist das dein Stift?"),
    check("Welche Form ist richtig: Das Auto ist rot / rotes?", "Das Auto ist rot."),
  ],
  "A1-7": [
    check("Wie sagt man 7:30 Uhr mit halb?", "Es ist halb acht."),
    check("Wie sagt man 3:15 Uhr?", "Es ist Viertel nach drei."),
    check("Wie sagt man 3:45 Uhr?", "Es ist Viertel vor vier."),
    check("Ergänze: Der Kurs beginnt ___ 18 Uhr.", "Der Kurs beginnt um 18 Uhr."),
  ],
  "A1-8": [
    check("Wie liest man 14:30 Uhr in der 24-Stunden-Uhr?", "vierzehn Uhr dreißig"),
    check("Wie liest man 09:05 Uhr?", "neun Uhr fünf"),
    check("Ergänze: Der Kurs ist ___ 5. Mai.", "Der Kurs ist am 5. Mai."),
    check("Ergänze: Heute ist ___ 8. September.", "Heute ist der 8. September."),
  ],
  "A1-3.5": [
    check("Schreibe 32 auf Deutsch.", "zweiunddreißig"),
    check("Wie sagt man 6:30 Uhr mit halb?", "halb sieben"),
    check("Wie sagt man 12,50 €?", "zwölf Euro fünfzig"),
    check("Ergänze bei einem einzelnen Produkt: Wie viel ___ das?", "Wie viel kostet das?"),
  ],
  "A1-3.6": [
    check("Ergänze: Ich kann Deutsch ___.", "Ich kann Deutsch sprechen."),
    check("Ergänze: Du musst heute ___.", "Du musst heute arbeiten."),
    check("Ergänze: Er möchte Kaffee ___.", "Er möchte Kaffee trinken."),
    check("Wo steht der Infinitiv in einem einfachen Satz mit Modalverb?", "Am Satzende: Ich kann heute Deutsch lernen."),
  ],
  "A1-4.7": [
    check("Was macht man in Teil 1 der Goethe-A1-Sprechprüfung?", "Man stellt sich kurz vor."),
    check("Was macht man in Teil 2?", "Man stellt Fragen und beantwortet Fragen."),
    check("Was macht man in Teil 3?", "Man formuliert Bitten/Aufforderungen und reagiert darauf."),
    check("Welche Frage ist korrekt: Wo du wohnst? / Wo wohnst du?", "Wo wohnst du?"),
  ],
  "A1-9": [
    check("Ergänze die Negation: Ich esse ___ Käse.", "Ich esse keinen Käse."),
    check("Ergänze die Negation: Ich trinke ___ Milch.", "Ich trinke keine Milch."),
    check("Ergänze die Negation: Ich habe ___ Brot.", "Ich habe kein Brot."),
    check("Ergänze: Das Essen ist ___ teuer.", "Das Essen ist nicht teuer."),
  ],
  "A1-10": [
    check("Ergänze: Ich ___ morgens Brot. (essen)", "Ich esse morgens Brot."),
    check("Ergänze: Er ___ um 7 Uhr. (frühstücken)", "Er frühstückt um 7 Uhr."),
    check("Ergänze: Ich trinke ___ Kaffee.", "Ich trinke gern Kaffee."),
    check("Setze das Verb richtig: Morgens ___ ich Tee. (trinken)", "Morgens trinke ich Tee."),
  ],
  "A1-11": [
    check("Bilde den Imperativ mit du: kommen.", "Komm!"),
    check("Bilde den Imperativ mit ihr: kommen.", "Kommt!"),
    check("Bilde den höflichen Imperativ mit Sie: kommen.", "Kommen Sie!"),
    check("Bilde einen Imperativ mit du: die Tür öffnen.", "Öffne die Tür! / Öffne bitte die Tür!"),
  ],
  "A1-12.1": [
    check("Ort oder Bewegung? Das Buch liegt ___ Tisch.", "Das Buch liegt auf dem Tisch. (Dativ)"),
    check("Ort oder Bewegung? Ich lege das Buch ___ Tisch.", "Ich lege das Buch auf den Tisch. (Akkusativ)"),
    check("Ergänze: Das Bild hängt ___ Wand.", "Das Bild hängt an der Wand."),
    check("Ergänze: Ich hänge das Bild ___ Wand.", "Ich hänge das Bild an die Wand."),
  ],
  "A1-12.2": [
    check("Ergänze: Ich arbeite ___ Lehrer.", "Ich arbeite als Lehrer."),
    check("Ergänze: Ich arbeite ___ Siemens.", "Ich arbeite bei Siemens."),
    check("Ergänze: Ich arbeite ___ einem Krankenhaus.", "Ich arbeite in einem Krankenhaus."),
    check("Ergänze: Ich fahre ___ Arbeit.", "Ich fahre zur Arbeit."),
  ],
  "A1-5.9": [
    check("Bilde eine W-Frage mit wohnen.", "Wo wohnst du?"),
    check("Bilde eine Ja/Nein-Frage mit haben und Geschwister.", "Hast du Geschwister?"),
    check("Formuliere eine höfliche Bitte mit können.", "Kannst du mir bitte helfen?"),
    check("Wie kannst du positiv auf eine Bitte reagieren?", "Ja, gern. / Natürlich."),
  ],
  "A1-12.3": [
    check("Welche Anrede passt zu einer informellen Nachricht an Anna?", "Liebe Anna, / Hallo Anna,"),
    check("Welche Anrede passt zu einem formellen Brief ohne Namen?", "Sehr geehrte Damen und Herren,"),
    check("Welche Schlussformel ist informell?", "Liebe Grüße / Viele Grüße"),
    check("Welche Schlussformel ist formell?", "Mit freundlichen Grüßen"),
  ],
  "A1-13": [
    check("Ergänze: Heute ___ es kalt.", "Heute ist es kalt."),
    check("Ergänze: Es ___ heute. (regnen)", "Es regnet heute."),
    check("Ergänze: Es sind 30 ___.", "Es sind 30 Grad."),
    check("Setze das Verb richtig: Im Winter ___ es oft kalt.", "Im Winter ist es oft kalt."),
  ],
  "A1-14.1": [
    check("Ergänze: Ich habe ___. (Kopf)", "Ich habe Kopfschmerzen."),
    check("Ergänze: Mein Kopf ___ weh.", "Mein Kopf tut weh."),
    check("Ergänze: Ich habe Schmerzen ___ Rücken.", "Ich habe Schmerzen im Rücken."),
    check("Ergänze den Akkusativ: Ich brauche ___ Arzt.", "Ich brauche einen Arzt."),
  ],
  "A1-14.2": [
    check("helfen + Dativ: Ich helfe ___ Mann.", "Ich helfe dem Mann."),
    check("sehen + Akkusativ: Ich sehe ___ Mann.", "Ich sehe den Mann."),
    check("geben + Dativ: Sie gibt ___ Kind einen Apfel.", "Sie gibt dem Kind einen Apfel."),
    check("danken + Dativ: Ich danke ___ Frau.", "Ich danke der Frau."),
  ],
  "A1-5.10": [
    check("Verbinde mit und: Ich lerne Deutsch. Ich mache die Hausaufgaben.", "Ich lerne Deutsch und ich mache die Hausaufgaben."),
    check("Welcher Konnektor zeigt einen Gegensatz: aber oder oder?", "aber"),
    check("Welcher Konnektor zeigt eine Wahl: denn oder oder?", "oder"),
    check("Verbinde mit denn: Ich lerne Deutsch. Ich möchte in Deutschland arbeiten.", "Ich lerne Deutsch, denn ich möchte in Deutschland arbeiten."),
  ],
};

export function getA1GrammarChecks(assignmentId, slide = {}) {
  const key = String(assignmentId || "").trim().toUpperCase();
  const direct = A1_GRAMMAR_CHECKS[key];
  if (Array.isArray(direct) && direct.length) return direct;

  const support = slide.teacherSupport || {};
  const grammar = Array.isArray(support.grammarFocusEn) ? support.grammarFocusEn : [];
  const models = Array.isArray(support.modelExamplesDe) ? support.modelExamplesDe : [];
  const mistakes = Array.isArray(support.commonMistakesEn) ? support.commonMistakesEn : [];

  return [
    check("Welche Grammatik- oder Sprachregel ist heute besonders wichtig?", grammar[0] || "Use the target structure from today's lesson correctly."),
    check("Nenne einen korrekten Beispielsatz aus der heutigen Struktur.", models[0] || slide.keyPhrasesDe?.[0] || "Build one correct A1 sentence."),
    check("Welchen typischen Fehler musst du heute vermeiden?", mistakes[0] || "Check subject, verb form and word order."),
    check("Baue einen zweiten korrekten Satz mit der heutigen Struktur.", models[1] || models[0] || slide.keyPhrasesDe?.[1] || "Build one more correct A1 sentence."),
  ];
}
