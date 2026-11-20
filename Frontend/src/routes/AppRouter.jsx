//importamos funciones nativas de react-router-dom que es la librería que hemos instalado anteriormente
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
//importamos el layout principal de la aplicación donde se encuentran los componentes que se repiten en todas las páginas como el header, el sidebar y el footer
import MainLayout from "../layouts/MainLayout";

// Importación de Páginas
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Attendance from "../pages/Attendance/Attendance";
import Registry from "../pages/Registry/Registry";
import Statistics from "../pages/Statistics/Statistics";
import Settings from "../pages/Settings/Settings";

// Componente auxiliar para proteger rutas privadas
// eslint-disable-next-line react/prop-types
function ProtectedRoute({ children }) {
  const user = localStorage.getItem("user");
  // Si no hay usuario guardado, redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Componente para restringir rutas solo a Administradores
// eslint-disable-next-line react/prop-types
function AdminRoute({ children }) {
  const userStorage = localStorage.getItem("user");
  const user = userStorage ? JSON.parse(userStorage) : null;
  const rol = user?.rol || "";

  const esAdmin = rol === "Administrador";

  // Si no es admin, lo redirige al inicio
  if (!esAdmin) {
    return <Navigate to="/inicio" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública de Login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas que usan el MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Índice por defecto: redirige al Dashboard */}
          <Route index element={<Navigate to="/inicio" replace />} />

          {/* Módulos del Sidebar */}
          <Route path="inicio" element={<Dashboard />} />
          <Route path="asistencia" element={<Attendance />} />
          <Route path="registro" element={<Registry />} />
          <Route path="estadisticas" element={<Statistics />} />

          {/* 🔒 RUTA BLINDADA: Configuración accesible solo para Administradores (Contiene la gestión de roles) */}
          <Route
            path="configuracion"
            element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            }
          />
        </Route>

        {/* Cualquier otra ruta desconocida redirige al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
