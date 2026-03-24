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
  "A2-1.1": {
    warmupQuestionsDe: [
      "Mit wem machst du oft Small Talk im Alltag?",
      "Welche Fragen stellst du am Anfang eines Gesprächs?",
      "Wann ist Small Talk für dich leicht oder schwierig?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem netten Small-Talk-Gespräch in letzter Zeit.",
      "Welche Themen benutzt du, wenn du eine neue Person triffst?",
      "Wie reagierst du, wenn im Gespräch eine lange Pause kommt?",
      "Was ist in deinem Land beim Small Talk höflich oder unhöflich?",
    ],
  },
  "A2-1.2": {
    warmupQuestionsDe: [
      "Welche drei Wörter beschreiben deinen Charakter gut?",
      "Achten Menschen zuerst auf Kleidung oder auf das Gesicht?",
      "Wie beschreibst du eine Person kurz und freundlich?",
    ],
    studentQuestionsDe: [
      "Beschreibe eine wichtige Person in deinem Leben genauer.",
      "Wie sieht deine ideale Lehrerin oder dein idealer Lehrer aus?",
      "Welche inneren Eigenschaften sind dir bei Freunden wichtig?",
      "Erzähl von einer Person, die dich positiv überrascht hat.",
    ],
  },
  "A2-1.3": {
    warmupQuestionsDe: [
      "Was ist größer: dein Wohnort oder die nächste Großstadt?",
      "Vergleichst du oft Preise vor einem Kauf?",
      "Wer ist in deiner Familie am sportlichsten?",
    ],
    studentQuestionsDe: [
      "Vergleiche zwei Restaurants in deiner Nähe.",
      "Welche Stadt findest du schöner: deine Heimatstadt oder Berlin?",
      "Vergleiche dein Leben heute mit deinem Leben vor zwei Jahren.",
      "Was ist besser für dich: früh aufstehen oder spät arbeiten?",
    ],
  },
  "A2-2.4": {
    warmupQuestionsDe: [
      "Wo triffst du Freunde am liebsten und warum?",
      "Ist ein Treffpunkt im Zentrum immer besser?",
      "Welche Uhrzeit passt dir für Treffen am besten?",
    ],
    studentQuestionsDe: [
      "Plant ein Treffen für Samstag mit Ort, Zeit und Aktivität.",
      "Welche Probleme gibt es oft bei Verabredungen?",
      "Wie findest du einen guten Treffpunkt für eine Gruppe?",
      "Erzähl von einem Treffen, das sehr gut geklappt hat.",
    ],
  },
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
  "A2-3.6": {
    warmupQuestionsDe: [
      "Welcher Raum in deiner Wohnung ist dein Lieblingsraum?",
      "Welche Möbel brauchst du wirklich jeden Tag?",
      "Magst du eine moderne oder gemütliche Einrichtung mehr?",
    ],
    studentQuestionsDe: [
      "Beschreibe dein Zimmer mit mindestens fünf Möbeln.",
      "Wie würdest du dein Traumwohnzimmer einrichten?",
      "Welche Möbel kaufst du lieber neu und welche gebraucht?",
      "Erzähl, wie du einen kleinen Raum praktisch nutzt.",
    ],
  },
  "A2-3.7": {
    warmupQuestionsDe: [
      "Was ist dir bei einer Wohnung am wichtigsten?",
      "Möchtest du lieber in der Stadt oder am Stadtrand wohnen?",
      "Wie viel Miete findest du noch okay?",
    ],
    studentQuestionsDe: [
      "Welche drei Kriterien hast du bei der Wohnungssuche?",
      "Erzähl von einer guten oder schlechten Wohnungsanzeige.",
      "Wie bereitest du dich auf einen Besichtigungstermin vor?",
      "Was fragst du den Vermieter bei der Besichtigung?",
    ],
  },
  "A2-3.8": {
    warmupQuestionsDe: [
      "Kochst du lieber selbst oder bestellst du Essen?",
      "Welches Gericht aus deiner Heimat magst du besonders?",
      "Welche Zutaten hast du fast immer zu Hause?",
    ],
    studentQuestionsDe: [
      "Erklär ein einfaches Rezept Schritt für Schritt.",
      "Was kochst du, wenn du wenig Zeit hast?",
      "Wie kann man ein Rezept gesünder machen?",
      "Erzähl von einem Gericht, das einmal nicht gelungen ist.",
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
  "A2-4.10": {
    warmupQuestionsDe: [
      "Welches Fest in deinem Land feierst du am liebsten?",
      "Was zeigt man Touristen in deiner Region zuerst?",
      "Reist du lieber zu bekannten Orten oder zu Geheimtipps?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem traditionellen Fest und seinem Ablauf.",
      "Wie kann deine Stadt für Touristen attraktiver werden?",
      "Welche Regeln sollten Touristen bei Festen respektieren?",
      "Plane einen Tagesausflug für Gäste aus dem Ausland.",
    ],
  },
  "A2-4.11": {
    warmupQuestionsDe: [
      "Welches Verkehrsmittel nutzt du am häufigsten?",
      "Was ist in deiner Stadt schneller: Bus oder Fahrrad?",
      "Worauf achtest du: Preis, Zeit oder Komfort?",
    ],
    studentQuestionsDe: [
      "Vergleiche Zug und Auto für eine Reise von 200 Kilometern.",
      "Welches Verkehrsmittel ist für Familien mit Kindern praktisch?",
      "Wie änderst du deinen Weg bei schlechtem Wetter?",
      "Erzähl von einer Fahrt, die besonders angenehm war.",
    ],
  },
  "A2-5.12": {
    warmupQuestionsDe: [
      "Wann beginnt dein Tag normalerweise?",
      "Welche Routine am Morgen hilft dir am meisten?",
      "Hast du abends genug Zeit für dich?",
    ],
    studentQuestionsDe: [
      "Beschreibe deinen typischen Tag von morgens bis abends.",
      "Welche Aufgaben machen deinen Alltag stressig?",
      "Wie organisierst du Pausen an einem langen Tag?",
      "Was würdest du an deinem Tagesablauf gern ändern?",
    ],
  },
  "A2-5.13": {
    warmupQuestionsDe: [
      "Bist du vor einem Gespräch eher ruhig oder nervös?",
      "Welche Kleidung passt zu einem Vorstellungsgespräch?",
      "Welche Frage im Interview findest du schwierig?",
    ],
    studentQuestionsDe: [
      "Stell dich vor, als wärst du im Bewerbungsgespräch.",
      "Welche Stärken kannst du mit Beispielen erklären?",
      "Wie antwortest du auf die Frage nach deinen Schwächen?",
      "Welche Fragen stellst du am Ende eines Interviews?",
    ],
  },
  "A2-5.14": {
    warmupQuestionsDe: [
      "Welcher Beruf war dein Kindheitstraum?",
      "Was ist dir im Job am wichtigsten?",
      "Möchtest du später eine Weiterbildung machen?",
    ],
    studentQuestionsDe: [
      "Erzähl, wie du deinen Wunschberuf ausgewählt hast.",
      "Welche Fähigkeiten braucht man in deinem Berufsfeld?",
      "Wie sieht für dich eine gute Karriereentwicklung aus?",
      "Was motiviert dich, langfristig bei der Arbeit dranzubleiben?",
    ],
  },
  "A2-6.15": {
    warmupQuestionsDe: [
      "Welchen Sport machst du gern und wie oft?",
      "Trainierst du lieber allein oder im Team?",
      "Was hilft dir, regelmäßig aktiv zu bleiben?",
    ],
    studentQuestionsDe: [
      "Beschreibe deinen Lieblingssport und die wichtigsten Regeln.",
      "Wie fühlst du dich vor und nach dem Training?",
      "Welche Sportart möchtest du neu lernen und warum?",
      "Erzähl von einem sportlichen Ziel, das du erreicht hast.",
    ],
  },
  "A2-6.16": {
    warmupQuestionsDe: [
      "Was machst du, um nach einem stressigen Tag zu entspannen?",
      "Welche Musik oder Geräusche beruhigen dich?",
      "Wie wichtig ist Schlaf für dein Wohlbefinden?",
    ],
    studentQuestionsDe: [
      "Erzähl von deiner besten Methode gegen Stress.",
      "Wie baust du kleine Entspannungsmomente in den Tag ein?",
      "Was tust du, wenn du dich müde und unkonzentriert fühlst?",
      "Welche Rolle spielen Bewegung und frische Luft für dich?",
    ],
  },
  "A2-6.17": {
    warmupQuestionsDe: [
      "Gehst du bei kleinen Beschwerden zuerst in die Apotheke?",
      "Welche Medikamente hast du meistens zu Hause?",
      "Ist es leicht für dich, Symptome auf Deutsch zu erklären?",
    ],
    studentQuestionsDe: [
      "Spielt einen Dialog zwischen Kunde und Apotheker.",
      "Wie beschreibst du Kopfschmerzen oder Husten genau?",
      "Welche Fragen stellst du vor dem Kauf eines Medikaments?",
      "Erzähl von einer Situation, in der eine Apotheke dir geholfen hat.",
    ],
  },
  "A2-7.18": {
    warmupQuestionsDe: [
      "Rufst du deine Bank oft an oder nutzt du lieber die App?",
      "Welche Bankfragen sind am Telefon schwierig?",
      "Was bereitest du vor, bevor du bei der Bank anrufst?",
    ],
    studentQuestionsDe: [
      "Erklär Schritt für Schritt, wie du ein Problem mit der Karte meldest.",
      "Welche Informationen musst du am Telefon sicher nennen?",
      "Spielt ein Gespräch: Termin in der Bankfiliale vereinbaren.",
      "Erzähl von einer positiven oder negativen Erfahrung mit Bankservice.",
    ],
  },
  "A2-7.19": {
    warmupQuestionsDe: [
      "Wo kaufst du Lebensmittel am liebsten ein?",
      "Achtest du beim Einkauf mehr auf Qualität oder auf Angebote?",
      "Welche Produkte bestellst du lieber online?",
    ],
    studentQuestionsDe: [
      "Vergleiche Supermarkt, Wochenmarkt und Online-Shop.",
      "Wie planst du einen Einkauf für eine ganze Woche?",
      "Welche Tipps helfen dir, beim Einkaufen Geld zu sparen?",
      "Erzähl von einem Einkauf, bei dem du ein tolles Produkt gefunden hast.",
    ],
  },
  "A2-7.20": {
    warmupQuestionsDe: [
      "Was machst du zuerst, wenn ein Produkt kaputt ist?",
      "Findest du Reklamieren unangenehm oder normal?",
      "Welche Unterlagen braucht man bei einer Reklamation?",
    ],
    studentQuestionsDe: [
      "Beschreibe eine Reklamation von Anfang bis Lösung.",
      "Welche Formulierungen sind bei Beschwerden höflich und klar?",
      "Spielt ein Gespräch im Laden über einen Umtausch.",
      "Was tust du, wenn der Kundenservice nicht sofort hilft?",
    ],
  },
  "A2-8.21": {
    warmupQuestionsDe: [
      "Wie sieht für dich ein perfektes Wochenende aus?",
      "Planst du dein Wochenende früh oder spontan?",
      "Welche Aktivität machst du am Sonntag besonders gern?",
    ],
    studentQuestionsDe: [
      "Plant als Paar ein Wochenende mit kleinem Budget.",
      "Welche drei Aktivitäten passen bei Regenwetter?",
      "Wie teilst du Zeit zwischen Erholung und Pflichten auf?",
      "Erzähl von einem Wochenende, das unvergesslich war.",
    ],
  },
  "A2-8.22": {
    warmupQuestionsDe: [
      "Schreibst du deine Termine in einen Kalender?",
      "Welcher Tag in der Woche ist bei dir am vollsten?",
      "Wann erledigst du Hausarbeit und Einkäufe?",
    ],
    studentQuestionsDe: [
      "Erklär deinen Wochenplan mit Arbeit, Lernen und Freizeit.",
      "Wie priorisierst du wichtige und weniger wichtige Aufgaben?",
      "Welche festen Gewohnheiten helfen dir in der Woche?",
      "Was machst du, wenn dein Plan plötzlich nicht mehr klappt?",
    ],
  },
  "A2-9.23": {
    warmupQuestionsDe: [
      "Wie kommst du normalerweise zur Arbeit oder zur Schule?",
      "Wie lange dauert dein Weg jeden Tag?",
      "Was ist auf deinem Arbeitsweg oft anstrengend?",
    ],
    studentQuestionsDe: [
      "Beschreibe deinen Weg mit allen Verkehrsmitteln und Zeiten.",
      "Welche Alternative hast du, wenn ein Zug ausfällt?",
      "Wie könntest du deinen Weg günstiger oder schneller machen?",
      "Erzähl von einem besonderen Erlebnis auf dem Arbeitsweg.",
    ],
  },
  "A2-9.24": {
    warmupQuestionsDe: [
      "Planst du Urlaub lieber allein oder mit anderen zusammen?",
      "Was ist bei einer Reiseplanung der erste Schritt?",
      "Lieber Meer, Berge oder Stadturlaub?",
    ],
    studentQuestionsDe: [
      "Plane eine einwöchige Reise mit Budget und Programm.",
      "Wie suchst du Unterkunft und vergleichst Angebote?",
      "Welche Dokumente und Reservierungen prüfst du vor der Reise?",
      "Was machst du, wenn kurz vor dem Urlaub etwas dazwischenkommt?",
    ],
  },
  "A2-9.25": {
    warmupQuestionsDe: [
      "Bist du morgens sofort aktiv oder langsam wach?",
      "Welche feste Gewohnheit hat dein Tag?",
      "Wann hast du im Alltag die meiste Energie?",
    ],
    studentQuestionsDe: [
      "Erzähl deinen Tagesablauf an einem Werktag im Detail.",
      "Welche Unterschiede gibt es zwischen Montag und Freitag bei dir?",
      "Wie sieht dein Tagesablauf aus, wenn du frei hast?",
      "Was möchtest du in deiner Routine in Zukunft verbessern?",
    ],
  },
  "A2-10.26": {
    warmupQuestionsDe: [
      "Wie zeigst du gute Laune im Alltag?",
      "Welche Situationen machen dich schnell nervös?",
      "Sprichst du offen über deine Gefühle?",
    ],
    studentQuestionsDe: [
      "Beschreibe einen Moment, in dem du sehr stolz warst.",
      "Wie beruhigst du dich, wenn du dich ärgerst?",
      "Welche Worte nutzt du, um Gefühle genauer zu erklären?",
      "Erzähl von einem Tag mit vielen verschiedenen Emotionen.",
    ],
  },
  "A2-10.27": {
    warmupQuestionsDe: [
      "Welche App benutzt du am häufigsten zum Schreiben?",
      "Rufst du lieber an oder schreibst du Nachrichten?",
      "Wann ist eine Sprachnachricht praktischer als Text?",
    ],
    studentQuestionsDe: [
      "Vergleiche Chat, E-Mail und Videoanruf im Alltag.",
      "Welche Regeln findest du wichtig in Gruppenchats?",
      "Erzähl von einem Missverständnis in digitaler Kommunikation.",
      "Wie schützt du deine Zeit vor zu vielen Nachrichten?",
    ],
  },
  "A2-10.28": {
    warmupQuestionsDe: [
      "Was möchtest du nächstes Jahr unbedingt lernen?",
      "Welche Pläne hast du für die nächsten sechs Monate?",
      "Wo siehst du dich in fünf Jahren?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem realistischen Zukunftsplan und den Schritten dorthin.",
      "Welche Ziele hast du privat und beruflich?",
      "Was könnte deine Pläne ändern, und wie reagierst du dann?",
      "Welche Unterstützung brauchst du für deine Zukunftsideen?",
    ],
  },
  "B1-1.1": {
    warmupQuestionsDe: [
      "An welchen Traum aus deiner Kindheit erinnerst du dich noch?",
      "Tagträumst du eher morgens oder abends?",
      "Welche Traumwelt aus einem Film findest du spannend?",
    ],
    studentQuestionsDe: [
      "Beschreibe eine ideale Traumwelt mit Regeln und Alltag.",
      "Erzähl von einem Traum, der dich lange beschäftigt hat.",
      "Welche Wünsche aus deiner Traumwelt könntest du real umsetzen?",
      "Wie verändert Fantasie deine Stimmung in stressigen Zeiten?",
    ],
  },
  "B1-1.2": {
    warmupQuestionsDe: [
      "Was macht für dich eine echte Freundschaft aus?",
      "Wie oft hast du Kontakt mit deinen engsten Freunden?",
      "Kann man online genauso gut Freundschaften pflegen?",
    ],
    studentQuestionsDe: [
      "Erzähl, wie du deinen besten Freund oder deine beste Freundin kennengelernt hast.",
      "Welche Konflikte gibt es in Freundschaften und wie löst man sie?",
      "Was würdest du für einen guten Freund sofort tun?",
      "Wie haben sich deine Freundschaften in den letzten Jahren verändert?",
    ],
  },
  "B1-1.3": {
    warmupQuestionsDe: [
      "Welche persönliche Erfolgsgeschichte inspiriert dich?",
      "Feierst du lieber kleine oder große Erfolge?",
      "Welche Rolle spielt Glück beim Erfolg?",
    ],
    studentQuestionsDe: [
      "Berichte von einem Ziel, das du mit viel Mühe erreicht hast.",
      "Welche Gewohnheiten helfen dir, erfolgreich zu sein?",
      "Erzähl die Erfolgsgeschichte einer Person aus deinem Umfeld.",
      "Was bedeutet Erfolg für dich heute im Vergleich zu früher?",
    ],
  },
  "B1-2.4": {
    warmupQuestionsDe: [
      "Wie sieht deine ideale Wohnung aus?",
      "Worauf achtest du zuerst in einer Wohnungsanzeige?",
      "Welche Lage ist für dich perfekt und warum?",
    ],
    studentQuestionsDe: [
      "Erkläre deine Strategie bei der Wohnungssuche Schritt für Schritt.",
      "Welche Kompromisse würdest du bei Größe oder Preis machen?",
      "Vergleiche zwei Wohnungen, die du interessant findest.",
      "Erzähl von einer schwierigen oder lustigen Erfahrung bei der Suche.",
    ],
  },
  "B1-2.5": {
    warmupQuestionsDe: [
      "Bist du bei Besichtigungen eher ruhig oder neugierig?",
      "Welche Fragen darf man beim Termin nicht vergessen?",
      "Wie wichtig ist der erste Eindruck vom Haus?",
    ],
    studentQuestionsDe: [
      "Spiele einen Besichtigungstermin mit Vermieter und Interessent.",
      "Welche Details prüfst du in Küche, Bad und Keller?",
      "Wie überzeugst du den Vermieter, dass du gut passt?",
      "Erzähl von einem Termin, der besser oder schlechter war als erwartet.",
    ],
  },
  "B1-2.6": {
    warmupQuestionsDe: [
      "Wo lebst du lieber: mitten in der Stadt oder im Dorf?",
      "Was fehlt dir auf dem Land am meisten?",
      "Welche Vorteile hat das Stadtleben für junge Leute?",
    ],
    studentQuestionsDe: [
      "Vergleiche deinen Alltag in der Stadt und auf dem Land.",
      "Für wen ist das Landleben besser geeignet und warum?",
      "Welche Probleme in Großstädten sollten zuerst gelöst werden?",
      "Erzähl von einem Umzug, der deinen Blick auf Wohnen verändert hat.",
    ],
  },
  "B1-3.7": {
    warmupQuestionsDe: [
      "Isst du eher schnell unterwegs oder in Ruhe zu Hause?",
      "Welches Fast-Food-Gericht magst du trotzdem gern?",
      "Wer kocht bei dir häufiger: du oder jemand anderes?",
    ],
    studentQuestionsDe: [
      "Vergleiche eine typische Fast-Food-Mahlzeit mit Hausmannskost.",
      "Wie beeinflusst Essen deine Konzentration bei Arbeit oder Lernen?",
      "Erzähl von einem Familienrezept, das dir wichtig ist.",
      "Was müsste passieren, damit du seltener Fast Food isst?",
    ],
  },
  "B1-3.8": {
    warmupQuestionsDe: [
      "Welche gesunde Gewohnheit klappt bei dir gut?",
      "Wie oft denkst du bewusst an deine Gesundheit?",
      "Was tust du, wenn du dich schlapp fühlst?",
    ],
    studentQuestionsDe: [
      "Erzähl, wie du in einer normalen Woche fit bleibst.",
      "Welche Rolle spielen Schlaf, Bewegung und Ernährung für dich?",
      "Welche Gesundheits-Tipps aus dem Internet findest du sinnvoll?",
      "Beschreibe eine Veränderung, die deiner Gesundheit geholfen hat.",
    ],
  },
  "B1-3.9": {
    warmupQuestionsDe: [
      "Wann schaltest du nach der Arbeit wirklich ab?",
      "Wie viel Freizeit brauchst du, um dich gut zu fühlen?",
      "Nimmst du Arbeit manchmal mit nach Hause?",
    ],
    studentQuestionsDe: [
      "Beschreibe deinen Alltag zwischen Job, Familie und Erholung.",
      "Welche Grenzen setzt du, damit Arbeit nicht alles bestimmt?",
      "Erzähl von einer Phase, in der deine Balance nicht gut war.",
      "Welche Ideen könnten Firmen für bessere Work-Life-Balance umsetzen?",
    ],
  },
  "B1-4.10": {
    warmupQuestionsDe: [
      "Wie lange bist du täglich am Handy?",
      "Fällt dir eine digitale Pause leicht oder schwer?",
      "Welche offline Aktivität tut dir besonders gut?",
    ],
    studentQuestionsDe: [
      "Plane eine Woche mit festen Zeiten ohne Bildschirm.",
      "Wie merkst du, dass dir eine digitale Auszeit guttut?",
      "Welche Apps kosten dich zu viel Zeit und warum?",
      "Erzähl von einem Tag, an dem du bewusst offline warst.",
    ],
  },
  "B1-4.11": {
    warmupQuestionsDe: [
      "Welche Teamspiele machen dir Spaß?",
      "Bist du im Team eher Organisator oder Unterstützer?",
      "Was nervt dich manchmal bei Gruppenaktivitäten?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem Teamprojekt, das gut funktioniert hat.",
      "Welche Regeln helfen, damit Kooperation fair bleibt?",
      "Wie löst ihr Konflikte, wenn zwei Ideen konkurrieren?",
      "Welche kooperative Aktivität würdest du für den Kurs planen?",
    ],
  },
  "B1-4.12": {
    warmupQuestionsDe: [
      "Welche Naturorte besuchst du gern am Wochenende?",
      "Was war dein letztes kleines Abenteuer draußen?",
      "Lieber wandern, klettern oder paddeln?",
    ],
    studentQuestionsDe: [
      "Beschreibe ein Naturabenteuer von der Planung bis zur Rückkehr.",
      "Welche Ausrüstung ist für einen sicheren Ausflug wichtig?",
      "Wie reagierst du, wenn beim Outdoor-Trip etwas schiefgeht?",
      "Warum sind Naturerlebnisse für viele Menschen so motivierend?",
    ],
  },
  "B1-4.13": {
    warmupQuestionsDe: [
      "Liest du lieber Filmkritiken oder schaust du direkt den Film?",
      "Welche Filmart gefällt dir am meisten?",
      "Worauf achtest du zuerst: Handlung, Musik oder Schauspiel?",
    ],
    studentQuestionsDe: [
      "Stell einen Film vor und gib eine begründete Bewertung.",
      "Welche Elemente gehören für dich in eine gute Filmkritik?",
      "Vergleiche zwei Filme mit ähnlichem Thema.",
      "Erzähl, bei welchem Film du deine Meinung später geändert hast.",
    ],
  },
  "B1-5.14": {
    warmupQuestionsDe: [
      "Lernst du lieber mit Buch oder mit App?",
      "Welche Lernform motiviert dich länger?",
      "Was stört dich am digitalen Lernen manchmal?",
    ],
    studentQuestionsDe: [
      "Vergleiche einen klassischen Kurs mit einem Onlinekurs.",
      "Welche Lernziele erreichst du offline besser und welche online?",
      "Erzähl von einer Lernmethode, die bei dir überraschend gut war.",
      "Wie könnte man beide Lernformen sinnvoll kombinieren?",
    ],
  },
  "B1-5.15": {
    warmupQuestionsDe: [
      "Welche Medien nutzt du im Homeoffice am meisten?",
      "Arbeitest du zu Hause konzentrierter als im Büro?",
      "Was hilft dir gegen Ablenkung daheim?",
    ],
    studentQuestionsDe: [
      "Beschreibe deinen idealen Arbeitsplatz im Homeoffice.",
      "Welche Kommunikationsregeln sind im Remote-Team wichtig?",
      "Erzähl von einem Problem im Homeoffice und deiner Lösung.",
      "Welche Medienkanäle passen für kurze Infos und welche für Details?",
    ],
  },
  "B1-5.16": {
    warmupQuestionsDe: [
      "Wie fühlst du dich kurz vor einer Prüfung?",
      "Welche Stresszeichen merkst du zuerst bei dir?",
      "Hast du ein kleines Ritual gegen Nervosität?",
    ],
    studentQuestionsDe: [
      "Erzähl von einer Prüfungssituation, die dich stark belastet hat.",
      "Welche Strategien helfen dir in den letzten Tagen vor der Prüfung?",
      "Wie unterstützt du Freunde, die Prüfungsangst haben?",
      "Was sollten Schulen oder Kurse tun, um Prüfungsstress zu senken?",
    ],
  },
  "B1-5.17": {
    warmupQuestionsDe: [
      "Zu welcher Tageszeit lernst du am effektivsten?",
      "Lernst du lieber allein oder in einer Gruppe?",
      "Welche Technik hilft dir beim Vokabellernen?",
    ],
    studentQuestionsDe: [
      "Beschreibe eine Lernroutine, die bei dir zuverlässig funktioniert.",
      "Wie gehst du mit schwierigen Themen um, wenn du feststeckst?",
      "Welche Rolle spielen Wiederholung und Pausen beim Lernen?",
      "Erzähl, wie du dich für ein langfristiges Lernziel motivierst.",
    ],
  },
  "B1-6.18": {
    warmupQuestionsDe: [
      "Welcher Wunschberuf begleitet dich schon lange?",
      "Was ist wichtiger: Talent oder Ausbildung?",
      "Wer hat dich bei deiner Berufswahl beeinflusst?",
    ],
    studentQuestionsDe: [
      "Erkläre deinen Weg vom Interesse zum konkreten Berufsziel.",
      "Welche Stationen sind nötig, um deinen Wunschberuf zu erreichen?",
      "Erzähl von einer Person mit einem ungewöhnlichen Karriereweg.",
      "Welche Hindernisse erwartest du und wie willst du damit umgehen?",
    ],
  },
  "B1-6.19": {
    warmupQuestionsDe: [
      "Welche Interviewfrage findest du am schwierigsten?",
      "Wie bereitest du dich auf ein Gespräch vor?",
      "Was macht bei Bewerbungen einen professionellen Eindruck?",
    ],
    studentQuestionsDe: [
      "Spiele ein Vorstellungsgespräch mit Rückfragen und Antworten.",
      "Wie präsentierst du deine Stärken ohne zu übertreiben?",
      "Erzähl von einer Bewerbung, die dich etwas gelehrt hat.",
      "Welche Fragen stellst du, um die Firma besser kennenzulernen?",
    ],
  },
  "B1-6.20": {
    warmupQuestionsDe: [
      "Welchen Beruf würdest du gern einmal ausprobieren?",
      "Welche Qualifikation ist heute besonders gefragt?",
      "Wie wichtig sind Praktika für den Berufseinstieg?",
    ],
    studentQuestionsDe: [
      "Erkläre, welche Ausbildung man für einen konkreten Beruf braucht.",
      "Vergleiche zwei Wege: Studium und berufliche Ausbildung.",
      "Welche Zusatzqualifikationen machen Bewerber attraktiver?",
      "Erzähl, welche Weiterbildung du in den nächsten Jahren planst.",
    ],
  },
  "B1-7.21": {
    warmupQuestionsDe: [
      "Welche Wohnform passt gerade zu deinem Leben?",
      "Was ist in einer WG besonders praktisch?",
      "Wie wichtig ist dir Privatsphäre zu Hause?",
    ],
    studentQuestionsDe: [
      "Vergleiche Familienleben und Wohngemeinschaft im Alltag.",
      "Welche Regeln braucht eine WG, damit das Zusammenleben klappt?",
      "Erzähl von einer positiven oder schwierigen Wohnsituation.",
      "Welche Lebensform ist für ältere Menschen sinnvoll und warum?",
    ],
  },
  "B1-7.22": {
    warmupQuestionsDe: [
      "Welche Eigenschaften sind dir in einer Beziehung wichtig?",
      "Wie zeigt man im Alltag Wertschätzung?",
      "Kann eine Beziehung ohne gemeinsame Hobbys funktionieren?",
    ],
    studentQuestionsDe: [
      "Beschreibe, was Vertrauen in einer Beziehung für dich bedeutet.",
      "Wie löst man Streit respektvoll, wenn Meinungen verschieden sind?",
      "Erzähl von einem Rat, der dir in Beziehungen geholfen hat.",
      "Welche Erwartungen an Partnerschaft haben sich bei dir verändert?",
    ],
  },
  "B1-7.23": {
    warmupQuestionsDe: [
      "Was macht ein erstes Date angenehm?",
      "Welcher Ort passt gut für ein lockeres Kennenlernen?",
      "Über welche Themen sprichst du beim ersten Treffen gern?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem ersten Date, das dir in Erinnerung geblieben ist.",
      "Wie reagierst du, wenn beim Date peinliche Stille entsteht?",
      "Welche Grenzen sollte man beim ersten Treffen respektieren?",
      "Plant gemeinsam ein erstes Date mit Zeit, Ort und Aktivität.",
    ],
  },
  "B1-8.24": {
    warmupQuestionsDe: [
      "Kaufst du eher spontan oder geplant ein?",
      "Wie oft achtest du auf nachhaltige Produkte?",
      "Was bedeutet bewusster Konsum für dich persönlich?",
    ],
    studentQuestionsDe: [
      "Beschreibe deine Einkaufsentscheidungen bei Kleidung oder Technik.",
      "Welche nachhaltigen Alternativen nutzt du schon im Alltag?",
      "Erzähl von einem Kauf, den du später bereut hast.",
      "Wie könnte man Konsum in Städten umweltfreundlicher gestalten?",
    ],
  },
  "B1-8.25": {
    warmupQuestionsDe: [
      "Was bestellst du am häufigsten online?",
      "Liest du Bewertungen vor dem Kauf genau?",
      "Welche Risiken siehst du beim Onlineeinkauf?",
    ],
    studentQuestionsDe: [
      "Erkläre deine wichtigsten Rechte bei Rückgabe und Garantie.",
      "Wie erkennst du, ob ein Onlineshop seriös ist?",
      "Erzähl von einer guten oder schlechten Erfahrung beim Bestellen.",
      "Welche Schritte machst du, wenn eine Lieferung nicht ankommt?",
    ],
  },
  "B1-9.26": {
    warmupQuestionsDe: [
      "Welches Reiseproblem ist dir schon passiert?",
      "Bleibst du in Stressmomenten auf Reisen ruhig?",
      "Was hast du immer im Gepäck für Notfälle?",
    ],
    studentQuestionsDe: [
      "Erzähl von einer Reise, bei der etwas unerwartet schiefging.",
      "Wie löst du Probleme wie Zugausfall oder verlorenes Gepäck?",
      "Welche Sätze helfen dir, im Ausland schnell Unterstützung zu bekommen?",
      "Plane einen Notfallplan für eine mehrtägige Reise.",
    ],
  },
  "B1-10.27": {
    warmupQuestionsDe: [
      "Welche umweltfreundliche Gewohnheit hast du schon fest?",
      "Wo verschwendest du im Alltag manchmal Energie?",
      "Wie leicht ist nachhaltiges Handeln in deiner Stadt?",
    ],
    studentQuestionsDe: [
      "Beschreibe drei konkrete Schritte für einen grüneren Alltag.",
      "Wie kannst du beim Einkaufen Verpackung reduzieren?",
      "Erzähl, welche Umweltidee du mit Freunden umgesetzt hast.",
      "Welche Unterstützung brauchst du, um dauernd umweltfreundlich zu leben?",
    ],
  },
  "B1-10.28": {
    warmupQuestionsDe: [
      "Welche klimafreundliche Entscheidung fällt dir am leichtesten?",
      "Worauf könntest du fürs Klima eher verzichten?",
      "Sprechen Menschen in deinem Umfeld oft über Klimaschutz?",
    ],
    studentQuestionsDe: [
      "Erzähl von einem Plan, wie du deinen CO2-Ausstoß senken willst.",
      "Welche Veränderungen wären für deine Nachbarschaft besonders wirksam?",
      "Wie kann man andere motivieren, klimafreundlicher zu leben?",
      "Welche Kompromisse zwischen Komfort und Klimaschutz findest du realistisch?",
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
