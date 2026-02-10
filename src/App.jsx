import { Routes, Route, Link, useNavigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import ReportsPage from "./pages/ReportsPage";
import CheckinPage from "./pages/CheckinPage";
import { useAuth } from "./context/AuthContext";

function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (!user) return null;

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid #ddd",
        display: "flex",
        gap: 12,
      }}
    >
      <Link to="/">Dashboard</Link>
      <Link to="/reports">Reports</Link>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {user.email}
        </span>
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
  );
}

export default function App() {
  return (
    <>
      <TopBar />

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
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
