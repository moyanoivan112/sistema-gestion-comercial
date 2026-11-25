import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UserConfigModal from "./components/UserConfigModal";
import ThemeToggle from "./components/ThemeToggle";
import Icon from "../../common/Icon";
import "./Sidebar.css";
import logoAncho from "../../../assets/logos/logo-ancho-claro.png";

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombreIglesia, setNombreIglesia] = useState("");

  // Persistencia de Modo Oscuro: Lee el estado inicial del localStorage al cargar
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Al cargar y escuchar cambios en tiempo real del nombre de la iglesia
  useEffect(() => {
    const iglesiaGuardada = localStorage.getItem("nombre_iglesia");
    if (iglesiaGuardada) {
      setNombreIglesia(iglesiaGuardada);
    }

    const handleStorageChange = () => {
      const actualizacion = localStorage.getItem("nombre_iglesia");
      if (actualizacion) {
        setNombreIglesia(actualizacion);
      }
    };

    window.addEventListener("churchNameChanged", handleStorageChange);
    return () => {
      window.removeEventListener("churchNameChanged", handleStorageChange);
    };
  }, []);

  // Efecto para aplicar el tema en la raíz (HTML) y guardarlo en localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Cerrar el menú móvil al presionar Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const userStorage = localStorage.getItem("user");
  const user = userStorage ? JSON.parse(userStorage) : null;
  const rol = user?.rol || "";
  const esAdmin = rol === "Administrador";

  const menuItems = [
    { path: "/inicio", name: "Inicio (Dashboard)", visible: true },
    { path: "/asistencia", name: "Asistencia", visible: true },
    { path: "/registro", name: "Registro", visible: true },
    { path: "/estadisticas", name: "Estadísticas", visible: true },
    { path: "/configuracion", name: "Configuración", visible: esAdmin },
  ];

  const handleLogout = () => {
    onClose();
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleOpenProfile = () => {
    onClose();
    setIsModalOpen(true);
  };

  // Obtener iniciales para el avatar (ej. "moyanoivan" -> "MO")
  const getInitials = (name) => {
    if (!name) return "US";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar-container ${isOpen ? "is-open" : ""}`}>
        {/* Título de la App, Nombre Dinámico de la Iglesia y Botón Cerrar en Móvil */}
        <div className="sidebar-header-section">
          <div className="sidebar-header-top">
            <img
              src={logoAncho}
              alt="Logo Gestión Congregacional"
              className="sidebar-logo-ancho"
            />
            <h3 className="sidebar-app-title">
              Version comercial en desarrollo
            </h3>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>
          {nombreIglesia && (
            <span className="sidebar-church-name">{nombreIglesia}</span>
          )}
        </div>

        {/* Lista de Navegación */}
        <nav className="sidebar-nav">
          <ul className="sidebar-list">
            {menuItems
              .filter((item) => item.visible)
              .map((item) => (
                <li key={item.path} className="sidebar-item">
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>

        {/* 🌙 Botón Toggle para Modo Oscuro / Claro extraído a componente */}
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />

        {/* Tarjeta de Perfil de Usuario */}
        <div className="sidebar-profile-card">
          {user ? (
            <>
              {/* Fila superior: Avatar + Nombre y Rol */}
              <div className="sidebar-profile-info">
                <div className="sidebar-avatar">
                  {getInitials(user.nombre_usuario)}
                </div>
                <div className="sidebar-user-meta">
                  <h4 className="sidebar-username">{user.nombre_usuario}</h4>
                  <span className="sidebar-user-role">{user.rol}</span>
                </div>
              </div>

              {/* Línea divisoria sutil */}
              <div className="sidebar-divider" />

              {/* Fila inferior: Botones de perfil y salir */}
              <div className="sidebar-actions-row">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="sidebar-profile-btn"
                >
                  <Icon name="UserSettings" size={20} color="#94a3b8" />
                  Mi perfil
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="sidebar-logout-btn"
                >
                  <Icon name="OpenDoor" size={20} color="#f87171" />
                  Salir
                </button>
              </div>
            </>
          ) : (
            <span className="sidebar-guest">Invitado</span>
          )}
        </div>
      </aside>

      <UserConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
