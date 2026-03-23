import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadSubmissions } from "../services/markingService";
import { loadPendingTutorReviews } from "../services/tutorReviewService";
import { loadGrammarIssueReports } from "../services/grammarIssueService";
import { loadWhatsappReminderDashboard } from "../services/whatsappRemindersService";
import { loadSocialMediaData } from "../services/socialMediaService";
import { listUpcomingHolidayReminders } from "../services/holidayService";

export default function DashboardPage() {
  const [incomingAssignments, setIncomingAssignments] = useState([]);
  const [pendingTutorReviewsCount, setPendingTutorReviewsCount] = useState(0);
  const [grammarIssueReports, setGrammarIssueReports] = useState([]);
  const [contractEndingSoon, setContractEndingSoon] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [socialMetrics, setSocialMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [submissionRows, tutorReviewRows, grammarIssueRows, reminderData, socialData] = await Promise.all([
          loadSubmissions(),
          loadPendingTutorReviews(),
          loadGrammarIssueReports(),
          loadWhatsappReminderDashboard(),
          loadSocialMediaData(),
        ]);

        setIncomingAssignments(submissionRows);
        setPendingTutorReviewsCount(tutorReviewRows.length);
        setGrammarIssueReports(grammarIssueRows);
        setContractEndingSoon(reminderData.contractEndingSoon);
        setUpcomingHolidays(listUpcomingHolidayReminders({ daysAhead: 30 }));
        setSocialMetrics(socialData.metrics || null);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const incomingAssignmentPreview = useMemo(
    () => incomingAssignments.slice(0, 5),
    [incomingAssignments],
  );
  const grammarIssuePreview = useMemo(() => grammarIssueReports.slice(0, 5), [grammarIssueReports]);
  const contractEndingSoonPreview = useMemo(() => contractEndingSoon.slice(0, 6), [contractEndingSoon]);
  const upcomingHolidayPreview = useMemo(() => upcomingHolidays.slice(0, 8), [upcomingHolidays]);
  const socialPostPreview = useMemo(() => socialMetrics?.recentPosts?.slice(0, 3) || [], [socialMetrics]);
  const socialFollowerPreview = useMemo(
    () => socialMetrics?.latestSnapshotByPlatform?.slice(0, 3) || [],
    [socialMetrics],
  );

  return (
    <div style={{ padding: 16 }}>
      {loading && <p>Loading dashboard metrics...</p>}
      {error && <p style={{ color: "#a00000" }}>❌ {error}</p>}

      {!loading && !error && (
        <>
          <section style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Incoming assignments</div>
              <p style={{ margin: "8px 0 0" }}>
                {incomingAssignments.length > 0
                  ? `${incomingAssignments.length} assignment${incomingAssignments.length === 1 ? "" : "s"} awaiting admin review.`
                  : "No incoming assignments to review right now."}
              </p>
              {incomingAssignmentPreview.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {incomingAssignmentPreview.map((submission) => {
                    const studentName = submission.studentName || submission.studentCode || "Unknown student";
                    const title = submission.assignment || "Untitled assignment";

                    return (
                      <li key={submission.path || submission.id} style={{ marginTop: 4 }}>
                        <strong>{studentName}</strong>: {title}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/marking">Open marking queue</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Incoming grammar issue notifications</div>
              <p style={{ margin: "8px 0 0" }}>
                {grammarIssueReports.length > 0
                  ? `${grammarIssueReports.length} learner report${grammarIssueReports.length === 1 ? "" : "s"} need review.`
                  : "No incoming grammar issue reports right now."}
              </p>
              {grammarIssuePreview.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {grammarIssuePreview.map((report) => {
                    const student = report.studentName || report.studentId || report.student_code || "Unknown student";
                    const issueText = report.issue || report.description || report.text || report.message || "No issue text";
                    return (
                      <li key={report.id} style={{ marginTop: 4 }}>
                        <strong>{student}</strong>: {issueText}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/grammar-issues">Open grammar issue reports</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Tutor review requests</div>
              <p style={{ margin: "8px 0 0" }}>
                {pendingTutorReviewsCount > 0
                  ? `${pendingTutorReviewsCount} tutor review message${pendingTutorReviewsCount === 1 ? "" : "s"} pending final review.`
                  : "No tutor review messages pending at the moment."}
              </p>
              <div style={{ marginTop: 8 }}>
                <Link to="/campus/tutor-marking">Open tutor marking</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>WhatsApp reminder notifications</div>
              <p style={{ margin: "8px 0 0" }}>
                {contractEndingSoon.length > 0
                  ? `${contractEndingSoon.length} contract reminder${contractEndingSoon.length === 1 ? "" : "s"} due in the next 10 days.`
                  : "No contract reminders due in the next 10 days."}
              </p>
              {contractEndingSoonPreview.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {contractEndingSoonPreview.map((student) => (
                    <li key={`${student.name}-${student.phone || student.contractEnd?.toISOString() || "reminder"}`} style={{ marginTop: 4 }}>
                      <strong>{student.name}</strong>
                      {student.daysUntilContractEnd != null ? ` — ${student.daysUntilContractEnd} day(s) left` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/whatsapp-reminders">Open WhatsApp reminders</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Upcoming holiday reminders</div>
              <p style={{ margin: "8px 0 0" }}>
                {upcomingHolidays.length > 0
                  ? `${upcomingHolidays.length} holiday reminder${upcomingHolidays.length === 1 ? "" : "s"} in the next 30 days.`
                  : "No holiday reminders in the next 30 days."}
              </p>
              {upcomingHolidayPreview.length > 0 && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  {upcomingHolidayPreview.map((holiday) => (
                    <li key={holiday.isoDate} style={{ marginTop: 4 }}>
                      <strong>{holiday.displayDate}</strong> — {holiday.daysUntil === 0 ? "Today" : `in ${holiday.daysUntil} day(s)`}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/course-schedule">Manage course holidays</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Social media post tracker</div>
              <p style={{ margin: "8px 0 0" }}>
                View live Post_Tracker data from your published content sheet.
              </p>
              {socialMetrics && (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  <li>Total posts: <strong>{socialMetrics.totalPosts || 0}</strong></li>
                  <li>Follower snapshots: <strong>{socialMetrics.totalFollowerSnapshots || 0}</strong></li>
                  <li>Upcoming content items: <strong>{socialMetrics.totalCalendarItems || 0}</strong></li>
                </ul>
              )}
              {socialFollowerPreview.length > 0 && (
                <>
                  <p style={{ margin: "10px 0 0", fontWeight: 600 }}>Latest followers by platform</p>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {socialFollowerPreview.map((snapshot) => (
                      <li key={`${snapshot.platform}-${snapshot.date || "latest"}`} style={{ marginTop: 4 }}>
                        <strong>{snapshot.platform || "Unknown"}</strong>: {snapshot.followers || 0} followers
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {socialPostPreview.length > 0 && (
                <>
                  <p style={{ margin: "10px 0 0", fontWeight: 600 }}>Recent post metrics</p>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {socialPostPreview.map((post, index) => (
                      <li key={`${post.date || "post"}-${post.topic || index}`} style={{ marginTop: 4 }}>
                        <strong>{post.topic || "Untitled post"}</strong>: 👍 {post.likes || 0} · 💬 {post.comments || 0} · 🔁 {post.shares || 0}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/social-post-tracker">Open social post tracker</Link>
              </div>
            </div>

          </section>
        </>
      )}
    </div>
  );
}
