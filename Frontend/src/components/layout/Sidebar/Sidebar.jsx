import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UserConfigModal from "./components/UserConfigModal";
import ThemeToggle from "./components/ThemeToggle";
import Icon from "../../common/Icon";
import "./Sidebar.css";
import logoAncho from "../../../assets/logos/logo-ancho-claro.png";

const leerOrganizacionLocal = () => {
  try {
    const raw = localStorage.getItem("organizacion");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [organizacion, setOrganizacion] = useState(() =>
    leerOrganizacionLocal(),
  );
  const [nombreIglesia, setNombreIglesia] = useState(() => {
    const org = leerOrganizacionLocal();
    return org?.nombre || localStorage.getItem("nombre_iglesia") || "";
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const sincronizarOrg = () => {
      const org = leerOrganizacionLocal();
      setOrganizacion(org);
      const nombreActual =
        org?.nombre || localStorage.getItem("nombre_iglesia") || "";
      setNombreIglesia(nombreActual);

      if (org?.color_primario) {
        document.documentElement.style.setProperty(
          "--brand-primary",
          org.color_primario,
        );
      } else {
        document.documentElement.style.removeProperty("--brand-primary");
      }

      if (org?.color_secundario) {
        document.documentElement.style.setProperty(
          "--brand-secondary",
          org.color_secundario,
        );
      } else {
        document.documentElement.style.removeProperty("--brand-secondary");
      }
    };

    sincronizarOrg();
    window.addEventListener("churchNameChanged", sincronizarOrg);
    return () => {
      window.removeEventListener("churchNameChanged", sincronizarOrg);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

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
    localStorage.removeItem("token");
    localStorage.removeItem("organizacion");
    document.documentElement.style.removeProperty("--brand-primary");
    document.documentElement.style.removeProperty("--brand-secondary");
    navigate("/login");
  };

  const handleOpenProfile = () => {
    onClose();
    setIsModalOpen(true);
  };

  const getInitials = (name) => {
    if (!name) return "US";
    return name.substring(0, 2).toUpperCase();
  };

  const logoMostrado = organizacion?.logo_url || logoAncho;

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
        <div className="sidebar-header-section">
          <div className="sidebar-header-top">
            <img
              src={logoMostrado}
              alt={nombreIglesia || "Logo de la organización"}
              className="sidebar-logo-ancho"
              onError={(e) => {
                if (e.currentTarget.src !== logoAncho) {
                  e.currentTarget.src = logoAncho;
                }
              }}
            />
            <h3 className="sidebar-app-title">
              Versión comercial en desarrollo
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

        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />

        <div className="sidebar-profile-card">
          {user ? (
            <>
              <div className="sidebar-profile-info">
                <div className="sidebar-avatar">
                  {getInitials(user.nombre_usuario)}
                </div>
                <div className="sidebar-user-meta">
                  <h4 className="sidebar-username">{user.nombre_usuario}</h4>
                  <span className="sidebar-user-role">{user.rol}</span>
                </div>
              </div>

              <div className="sidebar-divider" />

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
