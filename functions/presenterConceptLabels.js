function clean(value) {
  return String(value ?? "").trim();
}

function textFrom(value) {
  if (value && typeof value === "object") {
    return clean(
      value.conceptLabel
        || value.sourceQuestion
        || value.question
        || value.questionDe
        || value.questionText
        || value.questionContext,
    );
  }
  return clean(value);
}

const RULES = [
  { label: "W‑Fragen — word order", test: (text) => /\b(w[- ]?(frage|fragen|word|words|wörter)|wer|was|wann|wo|woher|wohin|warum|wie)\b/i.test(text) && /(word order|wortstellung|position|comes? (first|second|after)|verb.*(second|position)|subject.*verb)/i.test(text) },
  { label: "W‑Fragen — question words", test: (text) => /\b(w[- ]?(frage|fragen|word|words|wörter)|wer|was|wann|wo|woher|wohin|warum|wie)\b/i.test(text) },
  { label: "Ja/Nein‑Fragen — verb-first word order", test: (text) => /(yes\s*\/\s*no|yes-no|ja\s*\/\s*nein|ja-nein|decision question|entscheidungsfrage)/i.test(text) },
  { label: "Personal pronouns", test: (text) => /(personal pronoun|personalpronomen|\bich\b.*\bdu\b|\ber\b.*\bsie\b.*\bes\b)/i.test(text) },
  { label: "Verb conjugation — present tense", test: (text) => /(conjugat|konjug|verb ending|verbendung|verb stem|verbstamm|present tense|präsens)/i.test(text) },
  { label: "Word order — verb in position 2", test: (text) => /(\bv2\b|verb.*(position 2|second position|zweite position|zweiter stelle)|time expression.*verb|sentence.*verb.*second)/i.test(text) },
  { label: "Indefinite articles — ein/eine", test: (text) => /(indefinite article|unbestimmt.*artikel|\bein\b.*\beine\b)/i.test(text) },
  { label: "Possessive articles", test: (text) => /(possessive|possessiv|\bmein\b.*\bdein\b|\bsein\b.*\bihr\b)/i.test(text) },
  { label: "Negation — kein vs nicht", test: (text) => /(kein.*nicht|nicht.*kein|negation|vernein)/i.test(text) },
  { label: "Modal verbs — sentence structure", test: (text) => /(modal verb|modalverb|\bkönnen\b|\bmüssen\b|\bdürfen\b|\bsollen\b|\bwollen\b|\bmögen\b|\bmöchten\b)/i.test(text) },
  { label: "Two-way prepositions — dative vs accusative", test: (text) => /(two-way preposition|wechselpräposition|an,? auf,? hinter|wo\??.*wohin|dative.*accusative|dativ.*akkusativ)/i.test(text) },
  { label: "Nominative & accusative", test: (text) => /(nominative.*accusative|nominativ.*akkusativ)/i.test(text) },
  { label: "Reflexive verbs", test: (text) => /(reflexive|reflexiv|\bsich\b)/i.test(text) },
  { label: "Dative case", test: (text) => /(\bdative\b|\bdativ\b)/i.test(text) },
  { label: "Accusative case", test: (text) => /(\baccusative\b|\bakkusativ\b)/i.test(text) },
  { label: "Imperative", test: (text) => /(imperative|imperativ|command form|aufforder)/i.test(text) },
  { label: "Separable verbs", test: (text) => /(separable verb|trennbar.*verb)/i.test(text) },
  { label: "Perfekt — past tense", test: (text) => /(\bperfekt\b|past participle|partizip ii|haben.*sein.*past)/i.test(text) },
  { label: "Adjective endings", test: (text) => /(adjective ending|adjektivendung|adjective declension|adjektivdeklination)/i.test(text) },
  { label: "Subordinate clauses — verb at the end", test: (text) => /(subordinate clause|nebensatz|\bweil\b|\bdass\b|verb.*(at the end|am ende))/i.test(text) },
  { label: "Time & dates", test: (text) => /(clock|time expression|uhrzeit|\bhalb\b|\bviertel\b|\bnach\b.*\buhr|\bvor\b.*\buhr|date|datum|wochentag)/i.test(text) },
  { label: "Prices — kostet/kosten", test: (text) => /(price|preis|kostet|kosten|euro|cedi)/i.test(text) },
  { label: "Numbers", test: (text) => /(number|zahlen|zahlwort)/i.test(text) },
  { label: "Greetings — formal vs informal", test: (text) => /(formal.*informal|informal.*formal|greeting|begrüß|\bsie\b.*\bdu\b)/i.test(text) },
  { label: "Alphabet & spelling", test: (text) => /(alphabet|spell|buchstab|umlaut|\bß\b)/i.test(text) },
  { label: "Countries, origin & languages", test: (text) => /(country|countries|land|länder|origin|herkunft|woher|language|sprache|sprachen)/i.test(text) },
  { label: "Work & professions — prepositions", test: (text) => /(profession|beruf|workplace|arbeitsplatz|\bals\b.*\bbei\b|zur arbeit)/i.test(text) },
  { label: "Weather expressions", test: (text) => /(weather|wetter|temperatur|regnet|schneit|sonnig|bewölkt)/i.test(text) },
];

function presenterConceptLabel(value, options = {}) {
  if (value && typeof value === "object" && clean(value.conceptLabel)) return clean(value.conceptLabel);
  const text = textFrom(value);
  const fallback = clean(options.fallback) || "Lesson concept";
  if (!text) return fallback;
  const match = RULES.find((rule) => rule.test(text));
  return match ? match.label : fallback;
}

function reviewConceptLabels(responses = [], options = {}) {
  const labels = (Array.isArray(responses) ? responses : [])
    .filter((response) => response?.result === "needs_review" || response?.result === "needsHelp" || response?.result === "needs_help")
    .map((response) => presenterConceptLabel(response, options))
    .filter(Boolean);
  return [...new Set(labels)];
}

module.exports = {
  presenterConceptLabel,
  reviewConceptLabels,
};
