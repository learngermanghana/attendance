import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { styles } from "../styles";

const pageWrap = {
  ...styles.container,
  display: "grid",
  gap: 18,
  paddingBottom: 32,
};

const cardStyle = {
  ...styles.card,
  display: "grid",
  gap: 14,
  padding: 16,
};

const boxBase = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 10,
  background: "#fff",
};

const infoBoxStyle = {
  ...boxBase,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
};

const warningBoxStyle = {
  ...boxBase,
  border: "1px solid #fde68a",
  background: "#fffbeb",
};

const successBoxStyle = {
  ...boxBase,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
};

const inputStyle = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
  lineHeight: 1.4,
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 140,
  resize: "vertical",
  fontFamily: "inherit",
};

const chipWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  fontSize: 14,
  lineHeight: 1.3,
};

const primaryActionStyle = {
  ...styles.secondaryButton,
  width: "100%",
  minHeight: 48,
  borderRadius: 12,
  fontSize: 15,
};

const heroImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80";

const articleGenderQuestions = [
  { noun: "Tisch", article: "der", gender: "Masculine (der)", english: "table" },
  { noun: "Auto", article: "das", gender: "Neuter (das)", english: "car" },
  { noun: "Lampe", article: "die", gender: "Feminine (die)", english: "lamp" },
  { noun: "Apfel", article: "der", gender: "Masculine (der)", english: "apple" },
  { noun: "Buch", article: "das", gender: "Neuter (das)", english: "book" },
  { noun: "Katze", article: "die", gender: "Feminine (die)", english: "cat" },
  { noun: "Stuhl", article: "der", gender: "Masculine (der)", english: "chair" },
  { noun: "Haus", article: "das", gender: "Neuter (das)", english: "house" },
  { noun: "Blume", article: "die", gender: "Feminine (die)", english: "flower" },
  { noun: "Hund", article: "der", gender: "Masculine (der)", english: "dog" },
];

const adjectivePairs = [
  ["groß", "klein"],
  ["alt", "neu"],
  ["lang", "kurz"],
  ["schön", "hässlich"],
  ["heiß", "kalt"],
  ["schnell", "langsam"],
  ["laut", "leise"],
  ["teuer", "billig"],
  ["glücklich", "traurig"],
  ["sauber", "schmutzig"],
];

const wWordQuestions = [
  {
    stem: "1. ___ heißt du?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wie",
    explanation: "Use „Wie“ to ask about a name.",
  },
  {
    stem: "2. ___ ist das Buch?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wo",
    explanation: "Use „Wo“ to ask about a place.",
  },
  {
    stem: "3. ___ wohnt er?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wo",
    explanation: "Use „Wo“ for location.",
  },
  {
    stem: "4. ___ kommst du?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Woher",
    explanation: "Use „Woher“ for origin.",
  },
  {
    stem: "5. ___ ist dein Lehrer?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wer",
    explanation: "Use „Wer“ for a person.",
  },
  {
    stem: "6. ___ geht es dir?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wie",
    explanation: "Use „Wie“ for condition.",
  },
  {
    stem: "7. ___ machst du am Wochenende?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Was",
    explanation: "Use „Was“ for an action or thing.",
  },
  {
    stem: "8. ___ ist das Auto?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wo",
    explanation: "Use „Wo“ for location.",
  },
  {
    stem: "9. ___ bist du?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Wer",
    explanation: "Use „Wer“ to ask who a person is.",
  },
  {
    stem: "10. ___ kommt sie?",
    options: ["Wer", "Wie", "Was", "Wo", "Woher"],
    answer: "Woher",
    explanation: "Use „Woher“ for origin.",
  },
];

const personalInfoPrompts = [
  { label: "Familienname", starter: "Mein Familienname ist ..." },
  { label: "Vorname", starter: "Mein Vorname ist ..." },
  { label: "Herkunft", starter: "Ich komme aus ..." },
  { label: "Geburtsort", starter: "Ich bin in ... geboren." },
  { label: "Adresse", starter: "Meine Adresse ist ..." },
  { label: "Postleitzahl", starter: "Meine Postleitzahl ist ..." },
  { label: "Familienstand", starter: "Ich bin ledig / verheiratet / geschieden / verwitwet." },
  { label: "Kinder", starter: "Ich habe ... Kinder. / Ich habe keine Kinder." },
  { label: "Alter", starter: "Ich bin ... Jahre alt." },
];

const SectionCard = ({ title, subtitle, children }) => (
  <section style={cardStyle}>
    <div style={{ display: "grid", gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      {subtitle ? (
        <p style={{ margin: 0, lineHeight: 1.7, color: "#4b5563" }}>{subtitle}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const RevealAnswer = ({ children, buttonLabel = "Show answer" }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        style={primaryActionStyle}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Hide answer" : buttonLabel}
      </button>
      {open ? <div style={successBoxStyle}>{children}</div> : null}
    </div>
  );
};

const MobileSectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: "#1d4ed8",
      letterSpacing: 0.2,
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const A1Day5IntroducingYourselfArticlesWorkbookPage = () => {
  const navigate = useNavigate();

  const [genderSelections, setGenderSelections] = useState(() =>
    articleGenderQuestions.reduce((acc, _, index) => {
      acc[index] = "";
      return acc;
    }, {})
  );

  const [wWordSelections, setWWordSelections] = useState(() =>
    wWordQuestions.reduce((acc, _, index) => {
      acc[index] = "";
      return acc;
    }, {})
  );

  const [adjectiveSentences, setAdjectiveSentences] = useState({
    one: "",
    two: "",
    three: "",
  });

  const [dialogueAnswers, setDialogueAnswers] = useState({
    name: "",
    country: "",
    city: "",
    age: "",
  });

  const [aboutMe, setAboutMe] = useState("");

  const genderScore = useMemo(() => {
    return articleGenderQuestions.filter(
      (item, index) => genderSelections[index] === item.gender
    ).length;
  }, [genderSelections]);

  const wWordScore = useMemo(() => {
    return wWordQuestions.filter(
      (question, index) => wWordSelections[index] === question.answer
    ).length;
  }, [wWordSelections]);

  const completedSections = useMemo(() => {
    let count = 0;
    if (Object.values(genderSelections).some(Boolean)) count += 1;
    if (Object.values(adjectiveSentences).some(Boolean)) count += 1;
    if (Object.values(dialogueAnswers).some(Boolean)) count += 1;
    if (Object.values(wWordSelections).some(Boolean)) count += 1;
    if (aboutMe.trim()) count += 1;
    return count;
  }, [genderSelections, adjectiveSentences, dialogueAnswers, wWordSelections, aboutMe]);

  const handleGenderChange = (index, value) => {
    setGenderSelections((prev) => ({ ...prev, [index]: value }));
  };

  const handleWWordChange = (index, value) => {
    setWWordSelections((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <div style={pageWrap}>
      <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
        <img
          src={heroImage}
          alt="Students learning German together"
          style={{
            width: "100%",
            height: "clamp(180px, 30vw, 240px)",
            objectFit: "cover",
            display: "block",
          }}
        />

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <button
            type="button"
            style={{ ...primaryActionStyle, width: "fit-content", minWidth: 140 }}
            onClick={() => navigate("/campus/course")}
          >
            Back to Course
          </button>

          <MobileSectionLabel>A1 · Day 5</MobileSectionLabel>

          <h1 style={{ ...styles.title, margin: 0, lineHeight: 1.25 }}>
            Introducing Yourself and Articles
          </h1>

          <p style={{ ...styles.subtitle, margin: 0, lineHeight: 1.6 }}>
            Chapter 1.2 · Interactive workbook
          </p>

          <div style={infoBoxStyle}>
            <strong>Progress</strong>
            <div style={{ lineHeight: 1.7 }}>
              <div>Completed sections: {completedSections}/5</div>
              <div>Noun gender: {genderScore}/{articleGenderQuestions.length}</div>
              <div>W-words: {wWordScore}/{wWordQuestions.length}</div>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Teil 1 · Articles"
        subtitle="First learn whether the noun is masculine, feminine, or neuter."
      >
        <div style={infoBoxStyle}>
          <strong>Quick guide</strong>
          <div style={{ lineHeight: 1.8 }}>
            <div><strong>Masculine (der)</strong></div>
            <div><strong>Feminine (die)</strong></div>
            <div><strong>Neuter (das)</strong></div>
          </div>
        </div>

        <div style={warningBoxStyle}>
          <strong>Beginner tip</strong>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            Today, focus on the gender first. Later, you will learn the correct article more easily.
          </p>
        </div>

        <div style={boxBase}>
          <strong>Vocabulary bank</strong>
          <div style={chipWrapStyle}>
            {articleGenderQuestions.map((item) => (
              <span key={item.noun} style={chipStyle}>
                {item.noun} ({item.english})
              </span>
            ))}
          </div>
        </div>

        <div style={boxBase}>
          <strong>Practice: Is it masculine, feminine, or neuter?</strong>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#4b5563" }}>
            Choose the gender first. Then check the full answer.
          </p>

          <div style={{ display: "grid", gap: 14 }}>
            {articleGenderQuestions.map((item, index) => (
              <div
                key={item.noun}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                  background: "#fff",
                }}
              >
                <strong style={{ fontSize: 16 }}>
                  {item.noun}{" "}
                  <span style={{ color: "#6b7280", fontWeight: 500 }}>
                    ({item.english})
                  </span>
                </strong>

                <div style={{ display: "grid", gap: 10 }}>
                  {["Masculine (der)", "Feminine (die)", "Neuter (das)"].map((option) => {
                    const selected = genderSelections[index] === option;

                    return (
                      <label
                        key={option}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          background: selected ? "#f9fafb" : "#fff",
                          minHeight: 52,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={`gender-${index}`}
                          value={option}
                          checked={selected}
                          onChange={() => handleGenderChange(index, option)}
                          style={{ transform: "scale(1.2)" }}
                        />
                        <span style={{ fontSize: 15 }}>{option}</span>
                      </label>
                    );
                  })}
                </div>

                <RevealAnswer buttonLabel="Show answer">
                  <div style={{ lineHeight: 1.8 }}>
                    <div>
                      <strong>Gender:</strong> {item.gender}
                    </div>
                    <div>
                      <strong>Article:</strong> {item.article} {item.noun}
                    </div>
                  </div>
                </RevealAnswer>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Teil 2 · Adjectives"
        subtitle="Use simple adjectives to describe people and things."
      >
        <div style={boxBase}>
          <strong>Adjective pairs</strong>
          <div style={{ display: "grid", gap: 8 }}>
            {adjectivePairs.map(([left, right]) => (
              <div key={`${left}-${right}`} style={{ padding: "6px 0" }}>
                {left} – {right}
              </div>
            ))}
          </div>
        </div>

        <div style={boxBase}>
          <strong>Examples</strong>
          <div style={{ lineHeight: 1.8 }}>
            <div>Der Baum ist groß.</div>
            <div>Das Haus ist klein.</div>
            <div>Die Blume ist schön.</div>
          </div>
        </div>

        <div style={boxBase}>
          <strong>Write your own sentences</strong>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Sentence 1 with <strong>groß</strong></span>
            <input
              type="text"
              value={adjectiveSentences.one}
              onChange={(e) =>
                setAdjectiveSentences((prev) => ({ ...prev, one: e.target.value }))
              }
              placeholder="Der Hund ist groß."
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Sentence 2 with <strong>klein</strong></span>
            <input
              type="text"
              value={adjectiveSentences.two}
              onChange={(e) =>
                setAdjectiveSentences((prev) => ({ ...prev, two: e.target.value }))
              }
              placeholder="Die Katze ist klein."
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Sentence 3 with <strong>neu</strong> or <strong>schön</strong></span>
            <input
              type="text"
              value={adjectiveSentences.three}
              onChange={(e) =>
                setAdjectiveSentences((prev) => ({ ...prev, three: e.target.value }))
              }
              placeholder="Das Buch ist neu."
              style={inputStyle}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Teil 3 · Personal Information"
        subtitle="Complete the German sentence starters with your own details."
      >
        <div style={{ display: "grid", gap: 12 }}>
          {personalInfoPrompts.map((item, index) => (
            <div
              key={item.label}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                display: "grid",
                gap: 6,
                background: "#fff",
              }}
            >
              <strong>
                {index + 1}. {item.label}
              </strong>
              <span style={{ lineHeight: 1.7 }}>{item.starter}</span>
            </div>
          ))}
        </div>

        <div style={warningBoxStyle}>
          <strong>Common mistakes</strong>
          <div style={{ lineHeight: 1.8 }}>
            <div>✅ Ich bin 25 Jahre alt.</div>
            <div>❌ Ich habe 25 Jahre.</div>
            <div>✅ Ich komme aus Ghana.</div>
            <div>❌ Ich komme von Ghana.</div>
            <div>✅ Ich habe keine Kinder.</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Teil 4 · Mini Dialogue"
        subtitle="Complete the short conversation."
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={boxBase}>
            <strong>A: Wie heißt du?</strong>
            <input
              type="text"
              value={dialogueAnswers.name}
              onChange={(e) =>
                setDialogueAnswers((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ich heiße ..."
              style={inputStyle}
            />
          </div>

          <div style={boxBase}>
            <strong>A: Woher kommst du?</strong>
            <input
              type="text"
              value={dialogueAnswers.country}
              onChange={(e) =>
                setDialogueAnswers((prev) => ({ ...prev, country: e.target.value }))
              }
              placeholder="Ich komme aus ..."
              style={inputStyle}
            />
          </div>

          <div style={boxBase}>
            <strong>A: Wo wohnst du?</strong>
            <input
              type="text"
              value={dialogueAnswers.city}
              onChange={(e) =>
                setDialogueAnswers((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="Ich wohne in ..."
              style={inputStyle}
            />
          </div>

          <div style={boxBase}>
            <strong>A: Wie alt bist du?</strong>
            <input
              type="text"
              value={dialogueAnswers.age}
              onChange={(e) =>
                setDialogueAnswers((prev) => ({ ...prev, age: e.target.value }))
              }
              placeholder="Ich bin ... Jahre alt."
              style={inputStyle}
            />
          </div>
        </div>

        <RevealAnswer buttonLabel="Show model dialogue">
          <div style={{ lineHeight: 1.9 }}>
            <div><strong>A:</strong> Wie heißt du?</div>
            <div><strong>B:</strong> Ich heiße Ama.</div>
            <div><strong>A:</strong> Woher kommst du?</div>
            <div><strong>B:</strong> Ich komme aus Ghana.</div>
            <div><strong>A:</strong> Wo wohnst du?</div>
            <div><strong>B:</strong> Ich wohne in Accra.</div>
            <div><strong>A:</strong> Wie alt bist du?</div>
            <div><strong>B:</strong> Ich bin 24 Jahre alt.</div>
          </div>
        </RevealAnswer>
      </SectionCard>

      <SectionCard
        title="Teil 5 · W-Words"
        subtitle="Choose the correct question word."
      >
        <div style={infoBoxStyle}>
          <strong>W-Words</strong>
          <div style={{ lineHeight: 1.8 }}>
            <div><strong>Wer</strong> – Who</div>
            <div><strong>Wie</strong> – How</div>
            <div><strong>Was</strong> – What</div>
            <div><strong>Wo</strong> – Where</div>
            <div><strong>Woher</strong> – From where</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {wWordQuestions.map((question, index) => (
            <div key={question.stem} style={boxBase}>
              <strong style={{ fontSize: 16, lineHeight: 1.6 }}>{question.stem}</strong>

              <div style={{ display: "grid", gap: 10 }}>
                {question.options.map((option) => {
                  const selected = wWordSelections[index] === option;

                  return (
                    <label
                      key={option}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        background: selected ? "#f9fafb" : "#fff",
                        minHeight: 52,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name={`wq-${index}`}
                        value={option}
                        checked={selected}
                        onChange={() => handleWWordChange(index, option)}
                        style={{ transform: "scale(1.2)" }}
                      />
                      <span style={{ fontSize: 15 }}>{option}</span>
                    </label>
                  );
                })}
              </div>

              <RevealAnswer buttonLabel="Show answer">
                <div style={{ lineHeight: 1.8 }}>
                  <div><strong>Correct answer:</strong> {question.answer}</div>
                  <div>{question.explanation}</div>
                </div>
              </RevealAnswer>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Final Task · Write About Yourself"
        subtitle="Write 6 to 8 sentences in German."
      >
        <div style={boxBase}>
          <strong>Use these ideas</strong>
          <div style={{ lineHeight: 1.8 }}>
            <div>• Name</div>
            <div>• Country</div>
            <div>• City</div>
            <div>• Age</div>
            <div>• Marital status</div>
            <div>• Children</div>
            <div>• Address</div>
          </div>
        </div>

        <label style={{ display: "grid", gap: 8 }}>
          <strong>My introduction</strong>
          <textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            placeholder="Ich heiße ... Ich komme aus ... Ich wohne in ..."
            style={textareaStyle}
          />
        </label>

        <RevealAnswer buttonLabel="Show sample paragraph">
          <p style={{ margin: 0, lineHeight: 1.9 }}>
            Ich heiße Kojo Mensah. Ich komme aus Ghana. Ich wohne in Accra.
            Ich bin 28 Jahre alt. Ich bin ledig. Ich habe keine Kinder.
            Meine Adresse ist 12 Mango Street.
          </p>
        </RevealAnswer>
      </SectionCard>

      <div style={{ ...successBoxStyle, gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Self-check</h2>
        <div style={{ lineHeight: 1.9 }}>
          <div>□ I can identify masculine (der), feminine (die), and neuter (das) nouns.</div>
          <div>□ I can describe things with simple adjectives.</div>
          <div>□ I can answer basic personal questions in German.</div>
          <div>□ I can use <strong>Wer, Wie, Was, Wo, Woher</strong>.</div>
          <div>□ I can write a short self-introduction.</div>
        </div>
      </div>
    </div>
  );
};

export default A1Day5IntroducingYourselfArticlesWorkbookPage;
