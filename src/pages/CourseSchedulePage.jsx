import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  DEFAULT_TEACHING_DAYS,
  buildScheduleExports,
  generateCourseSchedule,
  getHolidayWindow,
} from "../utils/courseScheduleGenerator.js";
import { WEEKDAY_OPTIONS, courseLevels } from "../data/courseTemplates.js";

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toggleOption(list, value) {
  if (list.includes(value)) return list.filter((item) => item !== value);
  return [...list, value];
}

export default function CourseSchedulePage() {
  const [level, setLevel] = useState("A1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [holidayDates, setHolidayDates] = useState([]);
  const [holidayCandidate, setHolidayCandidate] = useState(dayjs().format("YYYY-MM-DD"));
  const [useAdvancedWeekdays, setUseAdvancedWeekdays] = useState(false);
  const [defaultWeekdays, setDefaultWeekdays] = useState([...DEFAULT_TEACHING_DAYS]);
  const [weekDaysMap, setWeekDaysMap] = useState({});

  const holidayWindow = useMemo(() => getHolidayWindow(startDate, 120), [startDate]);
  const weeklyTemplate = courseLevels[level] || [];

  const scheduleRows = useMemo(
    () =>
      generateCourseSchedule({
        level,
        startDate,
        holidayDates,
        defaultWeekdays,
        useAdvancedWeekdays,
        weekDaysMap,
      }),
    [level, startDate, holidayDates, defaultWeekdays, useAdvancedWeekdays, weekDaysMap],
  );

  const exportsData = useMemo(
    () => buildScheduleExports({ level, startDate, holidayDates, rows: scheduleRows }),
    [level, startDate, holidayDates, scheduleRows],
  );

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h2>Course Schedule Generator</h2>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>Step 1: Level</h3>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {Object.keys(courseLevels).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>Step 2: Start date + holidays</h3>
        <label>
          Start Date{" "}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>

        <div style={{ marginTop: 8 }}>
          <label>
            Holiday in 120-day window{" "}
            <select value={holidayCandidate} onChange={(e) => setHolidayCandidate(e.target.value)}>
              {holidayWindow.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <button
            style={{ marginLeft: 8 }}
            type="button"
            onClick={() => {
              if (!holidayDates.includes(holidayCandidate)) {
                setHolidayDates([...holidayDates, holidayCandidate].sort());
              }
            }}
          >
            Add Holiday
          </button>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {holidayDates.map((holiday) => (
            <button key={holiday} type="button" onClick={() => setHolidayDates(holidayDates.filter((d) => d !== holiday))}>
              {holiday} ✕
            </button>
          ))}
          {holidayDates.length === 0 && <span style={{ opacity: 0.7 }}>No holidays selected.</span>}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>Step 3: Teaching days</h3>
        <label style={{ display: "block", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={useAdvancedWeekdays}
            onChange={(e) => setUseAdvancedWeekdays(e.target.checked)}
          />{" "}
          Advanced mode (different weekdays per week)
        </label>

        <div style={{ marginBottom: 8 }}>
          <b>Default weekdays:</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {WEEKDAY_OPTIONS.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={defaultWeekdays.includes(day)}
                  onChange={() => setDefaultWeekdays(toggleOption(defaultWeekdays, day))}
                />{" "}
                {day}
              </label>
            ))}
          </div>
        </div>

        {useAdvancedWeekdays && (
          <div style={{ display: "grid", gap: 10 }}>
            {weeklyTemplate.map(([weekLabel]) => {
              const weekDays = weekDaysMap[weekLabel] || [];
              return (
                <div key={weekLabel} style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <div style={{ marginBottom: 4 }}>{weekLabel}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {WEEKDAY_OPTIONS.map((day) => (
                      <label key={`${weekLabel}-${day}`}>
                        <input
                          type="checkbox"
                          checked={weekDays.includes(day)}
                          onChange={() =>
                            setWeekDaysMap({
                              ...weekDaysMap,
                              [weekLabel]: toggleOption(weekDays, day),
                            })
                          }
                        />{" "}
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3>Preview ({scheduleRows.length} sessions)</h3>
        <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                `course-schedule-${level}-${dayjs().format("YYYYMMDD-HHmmss")}.txt`,
                exportsData.txt,
                "text/plain;charset=utf-8",
              )
            }
          >
            Export TXT
          </button>
          <button
            type="button"
            onClick={() =>
              downloadFile(
                `course-schedule-${level}-${dayjs().format("YYYYMMDD-HHmmss")}.json`,
                JSON.stringify(exportsData.json, null, 2),
                "application/json;charset=utf-8",
              )
            }
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => {
              const popup = window.open("", "_blank", "width=900,height=700");
              if (!popup) return;
              popup.document.write(`<html><head><title>Course Schedule ${level}</title></head><body>`);
              popup.document.write(`<h1>Course Schedule (${level})</h1><p>Start date: ${exportsData.json.start_date}</p>`);
              popup.document.write("<ol>");
              scheduleRows.forEach((row) => {
                popup.document.write(`<li><strong>${row.day}</strong> - ${row.week} - ${row.date} - ${row.topic}</li>`);
              });
              popup.document.write("</ol></body></html>");
              popup.document.close();
              popup.focus();
              popup.print();
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Week</th>
                <th align="left">Day</th>
                <th align="left">Date</th>
                <th align="left">Topic</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => (
                <tr key={`${row.day}-${row.dateIso}`}>
                  <td>{row.week}</td>
                  <td>{row.day}</td>
                  <td>{row.date}</td>
                  <td>{row.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
