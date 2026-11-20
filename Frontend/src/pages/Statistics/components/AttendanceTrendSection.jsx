// src/pages/Statistics/components/AttendanceTrendSection.jsx
import React, { useState } from "react";
import Icon from "../../../components/common/Icon";
import StatCard from "../../Dashboard/components/StatCard";
import AsistenciaModal from "../../Dashboard/components/AsistenciaModal"; // 👈 1. Importamos el modal interactivo
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./AttendanceTrendSection.css";

export default function AttendanceTrendSection({
  attendanceData,
  totalActivos,
}) {
  const [ministerioSeleccionado, setMinisterioSeleccionado] = useState("todos");
  const [rangoTiempo, setRangoTiempo] = useState("6semanas");
  const [reunionSeleccionadaModal, setReunionSeleccionadaModal] =
    useState(null); // 👈 2. Estado para el modal

  const ministeriosEspecificos = [
    "Cena del Señor",
    "Reunión de Jóvenes",
    "Escuela Bíblica",
    "Pre Adolescentes",
  ];

  // 1. Filtrar las tarjetas superiores (solo las 4 específicas)
  const resumenAsistencias = Object.entries(attendanceData || {})
    .filter(([nombre]) => ministeriosEspecificos.includes(nombre))
    .map(([nombreMinisterio, rawHistorial]) => {
      const historial = Array.isArray(rawHistorial)
        ? rawHistorial
        : rawHistorial?.historial || [];
      const ultimoRegistro =
        historial && historial.length > 0
          ? historial[historial.length - 1].asistentes
          : 0;
      return {
        nombre: nombreMinisterio,
        actual: ultimoRegistro,
      };
    });

  const filtrarHistorialPorTiempo = (historial) => {
    const dataArray = Array.isArray(historial)
      ? historial
      : historial?.historial || [];
    if (dataArray.length === 0) return [];

    if (rangoTiempo === "2semanas") return dataArray.slice(-2);
    if (rangoTiempo === "4semanas") return dataArray.slice(-4);
    if (rangoTiempo === "6semanas") return dataArray.slice(-6);
    if (rangoTiempo === "2meses") return dataArray.slice(-8);
    if (rangoTiempo === "3meses") return dataArray.slice(-12);
    if (rangoTiempo === "6meses") return dataArray.slice(-24);
    if (rangoTiempo === "1ano") return dataArray.slice(-52);
    if (rangoTiempo === "2anos") return dataArray.slice(-104);
    if (rangoTiempo === "4anos") return dataArray.slice(-208);
    return dataArray;
  };

  const datosGraficosFiltrados = Object.entries(attendanceData || {}).filter(
    ([nombre]) =>
      ministerioSeleccionado === "todos" || nombre === ministerioSeleccionado,
  );

  return (
    <div className="attendance-trend-container">
      {/* 🎛️ Barra de Filtros Avanzados */}
      <div className="attendance-filter-bar">
        <div className="attendance-filter-group">
          <label className="attendance-filter-label">
            Filtrar por Reunión o Ministerio:
          </label>
          <select
            value={ministerioSeleccionado}
            onChange={(e) => setMinisterioSeleccionado(e.target.value)}
            className="attendance-select"
          >
            <option value="todos">Todas las Reuniones (Vista Completa)</option>
            {Object.keys(attendanceData || {}).map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-filter-group">
          <label className="attendance-filter-label">
            Rango Temporal de Análisis:
          </label>
          <select
            value={rangoTiempo}
            onChange={(e) => setRangoTiempo(e.target.value)}
            className="attendance-select"
          >
            <option value="2semanas">Últimas 2 Semanas</option>
            <option value="4semanas">Últimas 4 Semanas</option>
            <option value="6semanas">Últimas 6 Semanas (Por Defecto)</option>
            <option value="2meses">Últimos 2 Meses</option>
            <option value="3meses">Últimos 3 Meses</option>
            <option value="6meses">Últimos 6 Meses</option>
            <option value="1ano">Último Año</option>
            <option value="2anos">Últimos 2 Años</option>
            <option value="4anos">Últimos 4 Años</option>
            <option value="historico">Desde que se creó (Histórico)</option>
          </select>
        </div>
      </div>

      {/* 🏷️ Fila superior: Tarjetas de Asistencia Específicas */}
      {ministerioSeleccionado === "todos" && (
        <div className="attendance-stats-grid">
          {resumenAsistencias.map((item, index) => {
            const coloresIcono = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
            const colorSeleccionado = coloresIcono[index % coloresIcono.length];

            return (
              <div
                key={item.nombre}
                onClick={() => setReunionSeleccionadaModal(item.nombre)} // 👈 3. Activamos el modal al hacer clic
                style={{ cursor: "pointer" }}
                title="Haz clic para ver el reporte detallado de ausentes y reingresos"
              >
                <StatCard
                  type="info"
                  iconName="tendencia"
                  iconColor={colorSeleccionado}
                  title={item.nombre}
                  value={item.actual}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 📈 Sección de Gráficos */}
      <div className="attendance-chart-section">
        <h3 className="attendance-section-title">
          <Icon name="tendencia" size={30} color="rgb(0, 121, 30)" />
          {ministerioSeleccionado === "todos"
            ? "Tendencia Histórica de Asistencia por Reunión y Ministerio"
            : `Tendencia Detallada: ${ministerioSeleccionado}`}
        </h3>

        {datosGraficosFiltrados.length === 0 ? (
          <div className="attendance-empty-msg">
            No hay registros suficientes para los filtros seleccionados.
          </div>
        ) : (
          <div
            className={`attendance-charts-grid ${
              ministerioSeleccionado === "todos"
                ? "grid-multiple"
                : "grid-single"
            }`}
          >
            {datosGraficosFiltrados.map(([nombreMinisterio, rawHistorial]) => {
              const historial = Array.isArray(rawHistorial)
                ? rawHistorial
                : rawHistorial?.historial || [];
              const historialFiltrado = filtrarHistorialPorTiempo(historial);
              const safeId = `grad_${nombreMinisterio.replace(/\s+/g, "_")}`;

              // Obtención segura de índices para la diferencia
              const len = historial.length;
              const ultimoReg = len > 0 ? historial[len - 1].asistentes : 0;
              const penultimoReg =
                len > 1 ? historial[len - 2].asistentes : ultimoReg;
              const diferencia = ultimoReg - penultimoReg;

              const totalInscritos =
                len > 0 && historial[len - 1].inscritos !== undefined
                  ? historial[len - 1].inscritos
                  : 0;

              const porcentajeTotal =
                Number(totalInscritos) > 0
                  ? ((ultimoReg / Number(totalInscritos)) * 100).toFixed(1)
                  : 0;

              return (
                <article key={nombreMinisterio} className="attendance-card">
                  <div className="attendance-card-header">
                    <h4 className="attendance-card-title">
                      {nombreMinisterio}
                    </h4>

                    <div className="attendance-badges-row">
                      <span
                        className="attendance-badge-inscritos"
                        title="Personas registradas o inscriptas"
                      >
                        👥 Inscriptos: {totalInscritos}
                      </span>

                      <span
                        className="attendance-badge-porcentaje"
                        title="Porcentaje de asistencia"
                      >
                        {porcentajeTotal}% de asistencia
                      </span>

                      {len > 1 && (
                        <span
                          className={`attendance-badge-diff ${
                            diferencia >= 0 ? "diff-positive" : "diff-negative"
                          }`}
                          title="Variación respecto a la reunión anterior"
                        >
                          {diferencia >= 0
                            ? `▲ +${diferencia}`
                            : `▼ ${diferencia}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`attendance-chart-wrapper ${
                      ministerioSeleccionado === "todos"
                        ? "height-compact"
                        : "height-large"
                    }`}
                  >
                    {!historialFiltrado || historialFiltrado.length === 0 ? (
                      <div className="attendance-no-data">
                        Sin registros para este periodo
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={historialFiltrado}
                          margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id={safeId}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#0284c7"
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor="#0284c7"
                                stopOpacity={0.0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#eaeaea"
                          />
                          <XAxis
                            dataKey="fecha"
                            stroke="#7f8c8d"
                            fontSize={11}
                          />
                          <YAxis
                            stroke="#7f8c8d"
                            fontSize={11}
                            allowDecimals={false}
                          />
                          <Tooltip
                            className="attendance-tooltip"
                            contentStyle={{
                              background: "#fff",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.85rem",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="asistentes"
                            name="Asistentes"
                            stroke="#0284c7"
                            strokeWidth={2.5}
                            fill={`url(#${safeId})`}
                            dot={{ r: 4, fill: "#0284c7" }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 👈 4. Renderizado condicional del Modal de Asistencia en Estadísticas */}
      {reunionSeleccionadaModal && (
        <AsistenciaModal
          tipoReunion={reunionSeleccionadaModal}
          onClose={() => setReunionSeleccionadaModal(null)}
        />
      )}
    </div>
  );
}
