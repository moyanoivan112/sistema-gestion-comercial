import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Attendance from "../pages/Attendance/Attendance";
import Registry from "../pages/Registry/Registry";
import Statistics from "../pages/Statistics/Statistics";
import Settings from "../pages/Settings/Settings";

// eslint-disable-next-line react/prop-types
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// eslint-disable-next-line react/prop-types
function AdminRoute({ children }) {
  let user = null;
  try {
    const userStorage = localStorage.getItem("user");
    user = userStorage ? JSON.parse(userStorage) : null;
  } catch {
    user = null;
  }

  const esAdmin = user?.rol === "Administrador";
  if (!esAdmin) {
    return <Navigate to="/inicio" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="inicio" element={<Dashboard />} />
          <Route path="asistencia" element={<Attendance />} />
          <Route path="registro" element={<Registry />} />
          <Route path="estadisticas" element={<Statistics />} />

          <Route
            path="configuracion"
            element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
