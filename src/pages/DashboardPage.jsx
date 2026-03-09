import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadSubmissions } from "../services/markingService";
import { loadPendingTutorReviews } from "../services/tutorReviewService";
import { loadGrammarIssueReports } from "../services/grammarIssueService";
import { loadWhatsappReminderDashboard } from "../services/whatsappRemindersService";
import { loadSocialMediaData } from "../services/socialMediaService";

export default function DashboardPage() {
  const [incomingAssignments, setIncomingAssignments] = useState([]);
  const [pendingTutorReviewsCount, setPendingTutorReviewsCount] = useState(0);
  const [grammarIssueReports, setGrammarIssueReports] = useState([]);
  const [contractEndingSoon, setContractEndingSoon] = useState([]);
  const [socialMediaMetrics, setSocialMediaMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [submissionRows, tutorReviewRows, grammarIssueRows, reminderData, socialMediaResult] = await Promise.all([
          loadSubmissions(),
          loadPendingTutorReviews(),
          loadGrammarIssueReports(),
          loadWhatsappReminderDashboard(),
          loadSocialMediaData().catch(() => null),
        ]);

        setIncomingAssignments(submissionRows);
        setPendingTutorReviewsCount(tutorReviewRows.length);
        setGrammarIssueReports(grammarIssueRows);
        setContractEndingSoon(reminderData.contractEndingSoon);
        setSocialMediaMetrics(socialMediaResult?.metrics || null);
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
              <div style={{ marginTop: 8 }}>
                <Link to="/whatsapp-reminders">Open WhatsApp reminders</Link>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>Social media tracker updates</div>
              <p style={{ margin: "8px 0 0" }}>
                {socialMediaMetrics
                  ? `${socialMediaMetrics.totalPosts} posts logged and ${socialMediaMetrics.totalFollowerSnapshots} follower snapshots tracked.`
                  : "Social media metrics unavailable right now."}
              </p>
              {socialMediaMetrics?.recentPosts?.[0] && (
                <p style={{ margin: "8px 0 0" }}>
                  Latest post: <strong>{socialMediaMetrics.recentPosts[0].brand || "Unknown brand"}</strong> on {socialMediaMetrics.recentPosts[0].platform || "Unknown platform"}.
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/social-media">Open social media tracker</Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
