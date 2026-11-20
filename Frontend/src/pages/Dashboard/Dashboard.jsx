import React, { useState, useEffect } from "react";
import api from "../../services/api";
import StatCard from "./components/StatCard";
import QuickActions from "./components/QuickActions";
import AbsenceAlertWidget from "./components/AbsenceAlertWidget";
import BirthdaysWidget from "./components/BirthdaysWidget";
import MeetingAlertWidget from "./components/MeetingAlertWidget";
import AsistenciaModal from "./components/AsistenciaModal"; // 👈 1. Importamos el modal interactivo
import CumpleanosUltimaSemanaWidget from "./components/CumpleanosSemanaWidget";
import "./Dashboard.css";

export default function Dashboard() {
  const [stats, setStats] = useState({
    cenaDelSenor: { actual: 0, diferencia: 0, tendencia: "igual" },
    reunionGeneral: { actual: 0, diferencia: 0, tendencia: "igual" },
    nuevosEsteMes: 0,
    pendientesDiscipulado: 0,
  });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reunionSeleccionada, setReunionSeleccionada] = useState(null); // 👈 2. Estado para controlar qué tarjeta abre el modal

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 13) return "Buenos días";
    if (hour >= 13 && hour < 20) return "Buenas tardes";
    return "Buenas noches";
  };

  const userStorage = localStorage.getItem("user");
  const user = userStorage ? JSON.parse(userStorage) : null;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const responseMembers = await api.get("/personas");
        setMembers(responseMembers.data);

        const responseStats = await api.get("/personas/dashboard/stats");
        setStats((prev) => ({
          ...prev,
          nuevosEsteMes: responseStats.data.nuevosRegistrosMes,
          pendientesDiscipulado: responseStats.data.pendientesMentoria,
          cenaDelSenor: responseStats.data.cenaDelSenor,
          reunionGeneral: responseStats.data.reunionGeneral,
        }));
      } catch (error) {
        console.error("No se pudieron cargar los datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const renderAttendanceStatCard = (
    title,
    data,
    variantClass,
    tipoReunionKey,
  ) => {
    let detailClass = "stat-detail-neutral";
    let textoDetalle = "Se mantuvo igual que la reunión anterior";

    if (data.tendencia === "subio") {
      detailClass = "stat-detail-success";
      textoDetalle = `▲ Subió: ${data.diferencia} persona${data.diferencia === 1 ? "" : "s"} más`;
    } else if (data.tendencia === "bajo") {
      detailClass = "stat-detail-danger";
      textoDetalle = `▼ Bajó: ${data.diferencia} persona${data.diferencia === 1 ? "" : "s"} menos`;
    }

    return (
      <div
        className={`stat-card ${variantClass}`}
        onClick={() => setReunionSeleccionada(tipoReunionKey)} // 👈 3. Activamos el modal al hacer clic
        style={{ cursor: "pointer" }}
        title="Haz clic para ver el reporte detallado de ausentes y reingresos"
      >
        <div className="stat-info stat-info-full">
          <h4>{title}</h4>
          <h2 className="stat-number-main">{loading ? "..." : data.actual}</h2>
          <p className={`stat-detail-text ${detailClass}`}>
            {loading ? "Calculando..." : textoDetalle}
          </p>
        </div>
      </div>
    );
  };

  const currentMonth = new Date().toLocaleDateString("es-AR", {
    month: "long",
  });

  return (
    <section className="dashboard-module">
      {/* 🌟 Contenedor principal en dos columnas */}
      <div className="dashboard-top-section">
        {/* Columna Izquierda: Encabezado + Acciones Rápidas */}
        <div className="dashboard-left-group">
          <header className="dashboard-header">
            <h2>
              <strong>
                {getGreeting()}, {user?.nombre}
              </strong>{" "}
              👋
            </h2>
            <p>Panel de control operativo y seguimiento semanal.</p>
          </header>

          <QuickActions />
        </div>

        {/* Columna Derecha: Tu nuevo apartado */}
        <div className="dashboard-right-section">
          <CumpleanosUltimaSemanaWidget members={members} />
        </div>
      </div>

      {/* Tarjetas de Resumen Operativo */}
      <div className="stats-grid">
        {renderAttendanceStatCard(
          "Última Cena del Señor",
          stats.cenaDelSenor,
          "primary",
          "Cena del Señor", // Identificador para el endpoint
        )}
        {renderAttendanceStatCard(
          "Última Reunión General",
          stats.reunionGeneral,
          "success",
          "Reunión General", // Identificador para el endpoint
        )}

        <StatCard
          type="info"
          iconName="GroupAdd"
          iconColor="hsl(197, 100%, 44%)"
          title="Nuevos Registros Este Mes"
          value={loading ? "..." : stats.nuevosEsteMes}
        />

        <StatCard
          type="warning"
          iconName="PersonAlert"
          iconColor="#ff7b00"
          title="Pendientes de Asignar Discipulador"
          value={loading ? "..." : stats.pendientesDiscipulado}
        />
      </div>

      <div className="meeting-alert-container">
        <MeetingAlertWidget />
      </div>

      {/* Widgets Operativos en Paralelo */}
      <div className="dashboard-parallel-widgets">
        <AbsenceAlertWidget />
        <BirthdaysWidget currentMonth={currentMonth} members={members} />
      </div>

      {/* 👈 4. Renderizado condicional del Modal de Asistencia */}
      {reunionSeleccionada && (
        <AsistenciaModal
          tipoReunion={reunionSeleccionada}
          onClose={() => setReunionSeleccionada(null)}
        />
      )}
    </section>
  );
}
