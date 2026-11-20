import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar/Sidebar";
import Footer from "../components/layout/Footer/Footer";
import "./MainLayout.css";

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="layout-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="layout-content-column">
        <header className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={openSidebar}
            aria-label="Abrir menú de navegación"
            aria-expanded={isSidebarOpen}
          >
            ☰
          </button>
          <span className="mobile-topbar-title">Gestión Congregacional</span>
        </header>

        <main className="layout-main">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
