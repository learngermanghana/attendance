import { useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendanceOverviewPage from "./pages/AttendanceOverviewPage";
import AttendancePage from "./pages/AttendancePage";
import CheckinPage from "./pages/CheckinPage";
import CheckinDisplayPage from "./pages/CheckinDisplayPage";
import CourseSchedulePage from "./pages/CourseSchedulePage";
import PublicCourseSchedulePage from "./pages/PublicCourseSchedulePage";
import MarkingPage from "./pages/MarkingPage";
import TutorMarkingPage from "./pages/TutorMarkingPage";
import CommunicationPage from "./pages/CommunicationPage";
import GrammarIssueReportsPage from "./pages/GrammarIssueReportsPage";
import WhatsAppRemindersPage from "./pages/WhatsAppRemindersPage";
import TeachingSlidesPage from "./pages/TeachingSlidesPage";
import SocialPostTrackerPage from "./pages/SocialPostTrackerPage";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import "./App.css";

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

          <div id="topbar-navigation" className={`topbar-links ${menuOpen ? "topbar-links-open" : ""}`}>
            {isStaff ? (
              <Link to="/social-post-tracker" onClick={() => setMenuOpen(false)}>Social Post Tracker</Link>
            ) : (
              <>
                <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/attendance" onClick={() => setMenuOpen(false)}>Attendance</Link>
                <Link to="/course-schedule" onClick={() => setMenuOpen(false)}>Course Schedule</Link>
                <Link to="/marking" onClick={() => setMenuOpen(false)}>Mark Work</Link>
                <Link to="/grammar-issues" onClick={() => setMenuOpen(false)}>Grammar Issues</Link>
                <Link to="/campus/tutor-marking" onClick={() => setMenuOpen(false)}>Tutor Marking</Link>
                <Link to="/communication" onClick={() => setMenuOpen(false)}>Communication</Link>
                <Link to="/whatsapp-reminders" onClick={() => setMenuOpen(false)}>WhatsApp Reminders</Link>
                <Link to="/teaching-slides" onClick={() => setMenuOpen(false)}>Teaching Slides</Link>
                <Link to="/social-post-tracker" onClick={() => setMenuOpen(false)}>Social Post Tracker</Link>
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
          <button className="toast-dismiss" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isFullscreenRoute = location.pathname === "/checkin/display";

  return (
    <>
      <TopBar />
      <ToastViewport />

      <main className={isFullscreenRoute ? undefined : "page-shell"}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/checkin/display" element={<CheckinDisplayPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute allowStaff={false}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowStaff={false}>
                <AttendanceOverviewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/:classId"
            element={
              <ProtectedRoute allowStaff={false}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/course-schedule"
            element={
              <ProtectedRoute allowStaff={false}>
                <CourseSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="/course-schedule/public" element={<PublicCourseSchedulePage />} />
          <Route
            path="/marking"
            element={
              <ProtectedRoute allowStaff={false}>
                <MarkingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campus/tutor-marking"
            element={
              <ProtectedRoute allowStaff={false}>
                <TutorMarkingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grammar-issues"
            element={
              <ProtectedRoute allowStaff={false}>
                <GrammarIssueReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communication"
            element={
              <ProtectedRoute allowStaff={false}>
                <CommunicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp-reminders"
            element={
              <ProtectedRoute allowStaff={false}>
                <WhatsAppRemindersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teaching-slides"
            element={
              <ProtectedRoute allowStaff={false}>
                <TeachingSlidesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/social-post-tracker"
            element={
              <ProtectedRoute>
                <SocialPostTrackerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teaching-slides/course/:courseId"
            element={
              <ProtectedRoute allowStaff={false}>
                <TeachingSlidesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teaching-slides/course/:courseId/:slideId"
            element={
              <ProtectedRoute allowStaff={false}>
                <TeachingSlidesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teaching-slides/:legacySlideId"
            element={
              <ProtectedRoute allowStaff={false}>
                <TeachingSlidesPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
