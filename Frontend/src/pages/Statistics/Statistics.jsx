// src/pages/Statistics/Statistics.jsx
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import StatCard from "../Dashboard/components/StatCard";
import GeneralStatsCard from "./components/GeneralStatsCard";
import HistoricalChart from "./components/HistoricalChart";
import AttendanceTrendSection from "./components/AttendanceTrendSection";
import { exportarDatos } from "../../services/exportUtils"; // 👈 Importamos el servicio
import "./Statistics.css";

export default function Statistics() {
  const [personas, setPersonas] = useState([]);
  const [inactivas, setInactivas] = useState([]);
  const [ministerios, setMinisterios] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("general");

  const modoOscuroActivo =
    document.documentElement.classList.contains("dark-theme");

  // Estados para los menús desplegables
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportScope, setExportScope] = useState("todos");
  const [exportType, setExportType] = useState("datos");

  useEffect(() => {
    const fetchStatisticsData = async () => {
      try {
        const [resPersonas, resInactivas, resMin, resTrend] = await Promise.all(
          [
            api.get("/personas"),
            api.get("/personas/inactivas"),
            api.get("/ministerios"),
            api.get("/personas/dashboard/trend"),
          ],
        );

        setPersonas(Array.isArray(resPersonas.data) ? resPersonas.data : []);
        setInactivas(Array.isArray(resInactivas.data) ? resInactivas.data : []);
        setMinisterios(Array.isArray(resMin.data) ? resMin.data : []);
        if (resTrend.data) {
          setAttendanceData(resTrend.data);
        }
      } catch (err) {
        console.error("Error al cargar datos estadísticos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatisticsData();
  }, []);

  const handleEjecutarExportacion = async () => {
    let datosFiltrados = personas;
    let nombreScope = "General_Congregacion";

    if (exportScope !== "todos") {
      const minSelec = ministerios.find(
        (m) => String(m.id) === String(exportScope),
      );
      if (minSelec) {
        nombreScope = minSelec.nombre;

        try {
          // Consultamos directamente al backend usando la tabla intermedia personas_ministerios
          const token = localStorage.getItem("token");
          const res = await api.get(`/ministerios/${exportScope}/personas`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          datosFiltrados = Array.isArray(res.data) ? res.data : [];
        } catch (err) {
          console.error("Error al filtrar personas del ministerio:", err);
          datosFiltrados = [];
        }
      }
    }

    if (datosFiltrados.length === 0 && exportType === "datos") {
      alert(
        `⚠️ No hay personas registradas directamente en el ministerio "${nombreScope}".`,
      );
      return;
    }

    // Métricas calculadas exclusivamente para este grupo
    const metricasCalculadas = {
      totalActivos: datosFiltrados.length,
      totalBautizados: datosFiltrados.filter((p) => p.bautizado).length,
      porcentajeBautizo:
        datosFiltrados.length > 0
          ? Math.round(
              (datosFiltrados.filter((p) => p.bautizado).length /
                datosFiltrados.length) *
                100,
            )
          : 0,
      totalDiscipulado: datosFiltrados.filter((p) => p.en_discipulado).length,
      porcentajeDiscipulado:
        datosFiltrados.length > 0
          ? Math.round(
              (datosFiltrados.filter((p) => p.en_discipulado).length /
                datosFiltrados.length) *
                100,
            )
          : 0,
      totalBajas: 0,
    };

    exportarDatos(
      exportFormat,
      nombreScope,
      exportType,
      datosFiltrados,
      metricasCalculadas,
    );
  };

  if (loading) {
    return (
      <div className="statistics-loading">
        Generando análisis estadísticos avanzados...
      </div>
    );
  }

  const totalActivos = personas.length;
  const totalBautizados = personas.filter((p) => p.bautizado).length;
  const totalDiscipulado = personas.filter((p) => p.en_discipulado).length;
  const totalConDiscipulador = personas.filter(
    (p) => p.discipulador && p.discipulador.trim() !== "",
  ).length;
  const totalBajas = inactivas.length;

  const porcentajeBautizo =
    totalActivos > 0 ? Math.round((totalBautizados / totalActivos) * 100) : 0;
  const porcentajeDiscipulado =
    totalActivos > 0 ? Math.round((totalDiscipulado / totalActivos) * 100) : 0;
  const porcentajeAcompanamiento =
    totalDiscipulado > 0
      ? Math.round((totalConDiscipulador / totalDiscipulado) * 100)
      : 0;

  return (
    <section className="statistics-module">
      <header className="statistics-header">
        <h2>Centro de Reportes y Estadísticas Avanzadas</h2>
        <p>
          Análisis demográfico, espiritual y administrativo histórico de la
          congregación.
        </p>
      </header>

      {/* Pestañas de navegación unificadas */}
      <div className="statistics-tabs-container">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`statistics-tab-btn ${activeTab === "general" ? "active" : ""}`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("asistencias")}
          className={`statistics-tab-btn ${activeTab === "asistencias" ? "active" : ""}`}
        >
          Asistencias y Ministerios
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("demografia")}
          className={`statistics-tab-btn ${activeTab === "demografia" ? "active" : ""}`}
        >
          Demografía y Balances
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reportes")}
          className={`statistics-tab-btn ${activeTab === "reportes" ? "active" : ""}`}
        >
          Reportes y Exportación
        </button>
      </div>

      <div className="statistics-content">
        {activeTab === "general" && (
          <div>
            <div className="stats-grid">
              <StatCard
                type="primary"
                iconName="miembros"
                iconColor={
                  modoOscuroActivo ? "#ffffff" : "#1f1f1f"
                } /* 👈 Aquí cambia de negro a blanco directo */
                title="Total Registrados"
                value={totalActivos}
              />
              <StatCard
                type="success"
                iconName="bautizados"
                iconColor="hsl(209, 100%, 57%)"
                title="Total Bautizados"
                value={totalBautizados}
              />
              <StatCard
                type="warning"
                iconName="discipulado"
                iconColor="hsl(39, 41%, 47%)"
                title="En Discipulado"
                value={totalDiscipulado}
              />
              <StatCard
                type="danger"
                iconName="ReduceCapacity"
                iconColor="#dc2626"
                title="Bajas / Inactivos"
                value={totalBajas}
              />
            </div>

            <div className="stats-grid-analisis">
              <GeneralStatsCard
                totalBautizados={totalBautizados}
                totalActivos={totalActivos}
                porcentajeBautizo={porcentajeBautizo}
                totalDiscipulado={totalDiscipulado}
                porcentajeDiscipulado={porcentajeDiscipulado}
                totalConDiscipulador={totalConDiscipulador}
                porcentajeAcompanamiento={porcentajeAcompanamiento}
              />
            </div>
          </div>
        )}

        {activeTab === "asistencias" && (
          <AttendanceTrendSection
            attendanceData={attendanceData}
            totalActivos={totalActivos}
          />
        )}

        {activeTab === "demografia" && (
          <div className="statistics-demografia-card">
            <HistoricalChart
              totalActivos={totalActivos}
              totalBajas={totalBajas}
              totalMinisterios={ministerios.length}
            />
          </div>
        )}

        {activeTab === "reportes" && (
          <div className="statistics-export-card">
            <div className="statistics-export-header">
              <h3 className="statistics-export-title">
                Centro de Descargas y Exportación Avanzada
              </h3>
              <p className="statistics-export-desc">
                Configura los parámetros para generar reportes personalizados.
              </p>
            </div>

            <div className="statistics-form-group">
              <label className="statistics-form-label">
                Formato de Archivo:
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="statistics-select"
              >
                <option value="excel">📊 Planilla de Excel (.xlsx)</option>
                <option value="pdf">📄 Documento PDF (.pdf)</option>
              </select>
            </div>

            <div className="statistics-form-group">
              <label className="statistics-form-label">
                Alcance de la Información:
              </label>
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
                className="statistics-select"
              >
                <option value="todos">🌟 General (Toda la congregación)</option>
                {ministerios.map((m) => (
                  <option key={m.id} value={m.id}>
                    Reunión / Ministerio: {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="statistics-form-group">
              <label className="statistics-form-label">
                Tipo de Contenido / Métricas:
              </label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="statistics-select"
              >
                <option value="datos">
                  📋 Solo Listado de Datos Personales
                </option>
                <option value="demografia">
                  📈 Datos Estadísticos y Demografía
                </option>
                <option value="completo">
                  📑 Reporte Completo (Datos + Estadísticas)
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleEjecutarExportacion}
              className="stats-btn-export"
            >
              📥 Generar y Descargar Reporte
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
