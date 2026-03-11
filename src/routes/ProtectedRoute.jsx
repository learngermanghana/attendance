import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowStaff = true }) {
  const { user, loading, isStaff } = useAuth();

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isStaff && !allowStaff) return <Navigate to="/social-post-tracker" replace />;

  return children;
}
