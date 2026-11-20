import { useState, useEffect } from "react";
import api from "../../services/api";
import GeneralSettings from "./components/GeneralSettings";
import MinisteriosSettings from "./components/MinisteriosSettings";
import ProfesoresSettings from "./components/ProfesoresSettings";
import BackupSettings from "./components/BackupSettings";
import RoleAssignment from "../RoleAssignment/RoleAssignment";
import "./Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [ministerios, setMinisterios] = useState([]);

  const fetchMinisterios = () => {
    api
      .get("/ministerios")
      .then((res) => setMinisterios(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error al cargar ministerios:", err));
  };

  useEffect(() => {
    fetchMinisterios();
  }, []);

  return (
    <div className="settings-module">
      <header className="settings-header">
        <h2>Configuración del Sistema</h2>
        <p>
          Administra los parámetros generales de la institución, accesos y
          grupos de asistencia.
        </p>
      </header>

      {/* Pestañas de navegación unificadas estilo barra moderna */}
      <div className="settings-tabs">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`settings-tab-btn ${activeTab === "general" ? "active" : ""}`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ministerios")}
          className={`settings-tab-btn ${activeTab === "ministerios" ? "active" : ""}`}
        >
          Reuniones y Ministerios
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profesores")}
          className={`settings-tab-btn ${activeTab === "profesores" ? "active" : ""}`}
        >
          Profesores y Líderes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`settings-tab-btn ${activeTab === "roles" ? "active" : ""}`}
        >
          Roles y Accesos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`settings-tab-btn ${activeTab === "backup" ? "active" : ""}`}
        >
          Sistema y Respaldo
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="settings-content">
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "ministerios" && (
          <MinisteriosSettings
            ministerios={ministerios}
            onRefresh={fetchMinisterios}
          />
        )}
        {activeTab === "profesores" && (
          <ProfesoresSettings ministerios={ministerios} />
        )}
        {activeTab === "roles" && <RoleAssignment />}
        {activeTab === "backup" && <BackupSettings />}
      </div>
    </div>
  );
}
