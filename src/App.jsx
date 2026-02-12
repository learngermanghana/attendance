import { Routes, Route, Link, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import ReportsPage from "./pages/ReportsPage";
import CheckinPage from "./pages/CheckinPage";
import CourseSchedulePage from "./pages/CourseSchedulePage";
import MarkingPage from "./pages/MarkingPage";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import "./App.css";

function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (!user) return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-links">
          <Link to="/">Dashboard</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/course-schedule">Course Schedule</Link>
          <Link to="/marking">Mark Work</Link>
        </div>

        <div className="topbar-user">
          <span className="topbar-email">{user.email}</span>
          <button
            onClick={async () => {
              await logout();
              nav("/login");
            }}
          >
            Logout
          </button>
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
  return (
    <>
      <TopBar />
      <ToastViewport />

      <main className="page-shell">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/checkin" element={<CheckinPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attendance/:classId"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />


          <Route
            path="/course-schedule"
            element={
              <ProtectedRoute>
                <CourseSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marking"
            element={
              <ProtectedRoute>
                <MarkingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
