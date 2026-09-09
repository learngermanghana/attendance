import { lazy, Suspense, useState } from "react";
import { Navigate, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import "./App.css";
import "./LiveClassesMobile.css";

const LeadHomepageNotification = lazy(() => import("./components/LeadHomepageNotification.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AttendanceOverviewPage = lazy(() => import("./pages/AttendanceOverviewPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const CanonicalAttendancePage = lazy(() => import("./pages/CanonicalAttendancePage.jsx"));
const CheckinPage = lazy(() => import("./pages/CheckinPage"));
const CheckinDisplayPage = lazy(() => import("./pages/CheckinDisplayPage"));
const CourseSchedulePage = lazy(() => import("./pages/CourseSchedulePage"));
const PublicCourseSchedulePage = lazy(() => import("./pages/PublicCourseSchedulePage"));
const MarkingHubPage = lazy(() => import("./pages/MarkingHubPage"));
const ExamTutorReviewQueuePage = lazy(() => import("./pages/ExamTutorReviewQueuePage"));
const TutorMarkingSimplePage = lazy(() => import("./pages/TutorMarkingSimplePage.jsx"));
const CommunicationHubPage = lazy(() => import("./pages/CommunicationHubPage.jsx"));
const GrammarIssueReportsPage = lazy(() => import("./pages/GrammarIssueReportsPage"));
const WhatsAppRemindersPage = lazy(() => import("./pages/WhatsAppRemindersPage"));
const TeachingSlidesPage = lazy(() => import("./pages/TeachingSlidesPage"));
const ClassParticipationPage = lazy(() => import("./pages/ClassParticipationPage.jsx"));
const StudentHubPage = lazy(() => import("./pages/StudentHubPage.jsx"));
const SocialMediaPage = lazy(() => import("./pages/SocialMediaPage.jsx"));
const WritingSubmissionTrackerPage = lazy(() => import("./pages/WritingSubmissionTrackerPage"));
const OrientationPage = lazy(() => import("./pages/OrientationSetupTabsPage.jsx"));
const ClassScheduleSetupPage = lazy(() => import("./pages/ClassScheduleSetupPage"));
const ClassOperationsPage = lazy(() => import("./pages/ClassOperationsPage"));
const ClassArchivePage = lazy(() => import("./pages/ClassArchivePage"));
const LiveClassesPage = lazy(() => import("./pages/LiveClassesPage"));
const HolidayCalendarPage = lazy(() => import("./pages/HolidayCalendarPage"));
const GoetheExamConfigPage = lazy(() => import("./pages/GoetheExamConfigPage.jsx"));
const StudentResultsComparePage = lazy(() => import("./pages/StudentResultsComparePage.jsx"));

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite">Loading…</div>;
}

function TopBar() {
  const { user, logout, isStaff } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user || location.pathname === "/checkin/display") return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-main-row">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="topbar-navigation"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>

          <Link to={isStaff ? "/students" : "/"} className="topbar-brand" onClick={() => setMenuOpen(false)}>
            Falowen Dashboard
          </Link>

          <div id="topbar-navigation" className={`topbar-links ${menuOpen ? "topbar-links-open" : ""}`}>
            {isStaff ? (
              <>
                <Link to="/students" onClick={() => setMenuOpen(false)}>Students</Link>
                <Link to="/live-classes" onClick={() => setMenuOpen(false)}>Live Classes</Link>
                <Link to="/attendance" onClick={() => setMenuOpen(false)}>Attendance</Link>
                <Link to="/class-participation" onClick={() => setMenuOpen(false)}>Participation</Link>
                <Link to="/class-operations" onClick={() => setMenuOpen(false)}>Class Operations</Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/students" onClick={() => setMenuOpen(false)}>Students</Link>
                <Link to="/exam-file" onClick={() => setMenuOpen(false)}>Goethe Exam File</Link>
                <Link to="/live-classes" onClick={() => setMenuOpen(false)}>Live Classes</Link>
                <Link to="/social-media" onClick={() => setMenuOpen(false)}>Social Media</Link>
                <Link to="/attendance" onClick={() => setMenuOpen(false)}>Attendance</Link>
                <Link to="/class-operations" onClick={() => setMenuOpen(false)}>Class Operations</Link>
                <Link to="/marking" onClick={() => setMenuOpen(false)}>Marking</Link>
                <Link to="/student-results" onClick={() => setMenuOpen(false)}>Results</Link>
                <Link to="/examTutorReviewQueue" onClick={() => setMenuOpen(false)}>Exam Review</Link>
                <Link to="/communication" onClick={() => setMenuOpen(false)}>Communication</Link>
                <Link to="/teaching-slides" onClick={() => setMenuOpen(false)}>Slides</Link>
                <Link to="/class-participation" onClick={() => setMenuOpen(false)}>Participation</Link>
                <Link to="/holiday-calendar" onClick={() => setMenuOpen(false)}>Holidays</Link>
              </>
            )}
          </div>

          <div className={`topbar-user ${menuOpen ? "topbar-user-open" : ""}`}>
            <span className="topbar-email">{user.email}</span>
            <button
              onClick={async () => {
                setMenuOpen(false);
                await logout();
                nav("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useToast();
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-item-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="toast-dismiss" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">×</button>
        </div>
      ))}
    </div>
  );
}

function MarkingRoute() {
  return <ProtectedRoute allowStaff={false}><MarkingHubPage /></ProtectedRoute>;
}

function ExamReviewRoute() {
  return <ProtectedRoute allowStaff={false}><ExamTutorReviewQueuePage /></ProtectedRoute>;
}

function CurrentAttendanceRoute() {
  return <CanonicalAttendancePage />;
}

export default function App() {
  const location = useLocation();
  const isFullscreenRoute = location.pathname === "/checkin/display";
  const showLeadNotification = location.pathname === "/";

  return (
    <>
      <TopBar />
      <ToastViewport />
      {showLeadNotification ? <Suspense fallback={null}><LeadHomepageNotification /></Suspense> : null}

      <main className={isFullscreenRoute ? undefined : "page-shell"} data-route={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/checkin/display" element={<CheckinDisplayPage />} />

          <Route path="/" element={<ProtectedRoute allowStaff={false}><DashboardPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute allowStaff={false}><AttendanceOverviewPage /></ProtectedRoute>} />
          <Route path="/attendance/session/:classId" element={<ProtectedRoute><CurrentAttendanceRoute /></ProtectedRoute>} />
          <Route path="/attendance/:classId" element={<ProtectedRoute allowStaff={false}><AttendancePage /></ProtectedRoute>} />
          <Route path="/class-participation" element={<ProtectedRoute><ClassParticipationPage /></ProtectedRoute>} />
          <Route path="/course-schedule" element={<ProtectedRoute allowStaff={false}><CourseSchedulePage /></ProtectedRoute>} />
          <Route path="/course-schedule/public" element={<PublicCourseSchedulePage />} />
          <Route path="/marking" element={<MarkingRoute />} />
          <Route path="/student-results" element={<ProtectedRoute allowStaff={false}><StudentResultsComparePage /></ProtectedRoute>} />
          <Route path="/marking/ai-audit" element={<Navigate to="/marking" replace />} />
          <Route path="/marking/answer-keys" element={<Navigate to="/marking" replace />} />
          <Route path="/ai-marking-audit" element={<Navigate to="/marking" replace />} />
          <Route path="/answer-key-sync" element={<Navigate to="/marking" replace />} />
          <Route path="/marking/exam-review" element={<Navigate to="/examTutorReviewQueue" replace />} />
          <Route path="/marking/exam-review/:reviewId" element={<Navigate to={`/examTutorReviewQueue/${location.pathname.split('/').pop()}`} replace />} />
          <Route path="/examTutorReviewQueue" element={<ExamReviewRoute />} />
          <Route path="/examTutorReviewQueue/:reviewId" element={<ExamReviewRoute />} />
          <Route path="/tutor-marking" element={<Navigate to="/campus/tutor-marking" replace />} />
          <Route path="/campus/tutor-marking" element={<ProtectedRoute allowStaff={false}><TutorMarkingSimplePage /></ProtectedRoute>} />
          <Route path="/grammar-issues" element={<ProtectedRoute allowStaff={false}><GrammarIssueReportsPage /></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute allowStaff={false}><CommunicationHubPage /></ProtectedRoute>} />
          <Route path="/exam-file" element={<ProtectedRoute allowStaff={false}><GoetheExamConfigPage /></ProtectedRoute>} />
          <Route path="/whatsapp-reminders" element={<ProtectedRoute allowStaff={false}><WhatsAppRemindersPage /></ProtectedRoute>} />
          <Route path="/teaching-slides" element={<ProtectedRoute allowStaff={false}><TeachingSlidesPage /></ProtectedRoute>} />
          <Route path="/orientation" element={<ProtectedRoute allowStaff={false}><OrientationPage /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><StudentHubPage /></ProtectedRoute>} />
          <Route path="/student-activity" element={<ProtectedRoute allowStaff={false}><Navigate to="/students?tab=activity" replace /></ProtectedRoute>} />
          <Route path="/social-media" element={<ProtectedRoute allowStaff={false}><SocialMediaPage /></ProtectedRoute>} />
          <Route path="/writing-submissions" element={<ProtectedRoute allowStaff={false}><WritingSubmissionTrackerPage /></ProtectedRoute>} />
          <Route path="/writing-submissions/:submissionId" element={<ProtectedRoute allowStaff={false}><WritingSubmissionTrackerPage /></ProtectedRoute>} />
          <Route path="/quality-check" element={<Navigate to="/" replace />} />
          <Route path="/class-schedule-setup" element={<ProtectedRoute allowStaff={false}><ClassScheduleSetupPage /></ProtectedRoute>} />
          <Route path="/holiday-calendar" element={<ProtectedRoute allowStaff={false}><HolidayCalendarPage /></ProtectedRoute>} />
          <Route path="/class-operations" element={<ProtectedRoute><ClassOperationsPage /></ProtectedRoute>} />
          <Route path="/class-archive" element={<ProtectedRoute><ClassArchivePage /></ProtectedRoute>} />
          <Route path="/live-classes" element={<ProtectedRoute><LiveClassesPage /></ProtectedRoute>} />
          <Route path="/teaching-slides/course/:courseId" element={<ProtectedRoute allowStaff={false}><TeachingSlidesPage /></ProtectedRoute>} />
          <Route path="/teaching-slides/course/:courseId/:slideId" element={<ProtectedRoute allowStaff={false}><TeachingSlidesPage /></ProtectedRoute>} />
          <Route path="/teaching-slides/public/:courseId/print" element={<TeachingSlidesPage publicView />} />
          <Route path="/teaching-slides/:legacySlideId" element={<ProtectedRoute allowStaff={false}><TeachingSlidesPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}