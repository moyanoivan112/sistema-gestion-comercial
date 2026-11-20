// src/pages/Statistics/components/GeneralStatsCard.jsx
import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import "./GeneralStatsCard.css";

export default function GeneralStatsCard({
  totalBautizados,
  totalActivos,
  porcentajeBautizo,
  totalDiscipulado,
  porcentajeDiscipulado,
  totalConDiscipulador,
  porcentajeAcompanamiento,
}) {
  // Datos para las donas de Recharts
  const datosBautizos = [
    { name: "Bautizados", value: totalBautizados, color: "#16a34a" },
    {
      name: "Pendientes",
      value: Math.max(0, totalActivos - totalBautizados),
      color: "#e2e8f0",
    },
  ];

  const datosDiscipulado = [
    { name: "En Discipulado", value: totalDiscipulado, color: "#ca8a04" },
    {
      name: "Restantes",
      value: Math.max(0, totalActivos - totalDiscipulado),
      color: "#e2e8f0",
    },
  ];

  const datosCobertura = [
    { name: "Con Mentor", value: totalConDiscipulador, color: "#0284c7" },
    {
      name: "Sin Mentor",
      value: Math.max(0, totalDiscipulado - totalConDiscipulador),
      color: "#e2e8f0",
    },
  ];

  return (
    <div className="stats-panel">
      <h3>✝️ Crecimiento y Consolidación Espiritual</h3>
      <p className="stats-panel-sub">
        Evaluación global del estado de bautizos y procesos de mentoría
      </p>

      {/* Bloque 1: Tasa de Bautizos */}
      <div className="stats-row-block">
        <div className="stats-info-col">
          <div className="stats-metric-row clean-metric-row">
            <div>
              <span className="stats-metric-title">
                Tasa de Bautizos (Global)
              </span>
              <span className="stats-metric-desc">
                {totalBautizados} de {totalActivos} miembros confirmados
              </span>
            </div>
            <span className="stats-metric-badge badge-green">
              {porcentajeBautizo}%
            </span>
          </div>
          <div className="stats-progress-bar">
            <div
              className="stats-progress-fill"
              style={{ width: `${porcentajeBautizo}%`, background: "#16a34a" }}
            />
          </div>
        </div>

        <div className="stats-chart-col">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datosBautizos}
                dataKey="value"
                innerRadius={28}
                outerRadius={40}
                paddingAngle={2}
              >
                {datosBautizos.map((entry, index) => (
                  <Cell key={`cell-b-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <hr className="stats-divider" />

      {/* Bloque 2: Participación en Discipulado */}
      <div className="stats-row-block">
        <div className="stats-info-col">
          <div className="stats-metric-row clean-metric-row">
            <div>
              <span className="stats-metric-title">
                Participación Histórica en Discipulado
              </span>
              <span className="stats-metric-desc">
                {totalDiscipulado} hermanos activos en formación
              </span>
            </div>
            <span className="stats-metric-badge badge-yellow">
              {porcentajeDiscipulado}%
            </span>
          </div>
          <div className="stats-progress-bar">
            <div
              className="stats-progress-fill"
              style={{
                width: `${porcentajeDiscipulado}%`,
                background: "#ca8a04",
              }}
            />
          </div>
        </div>

        <div className="stats-chart-col">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datosDiscipulado}
                dataKey="value"
                innerRadius={28}
                outerRadius={40}
                paddingAngle={2}
              >
                {datosDiscipulado.map((entry, index) => (
                  <Cell key={`cell-d-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <hr className="stats-divider" />

      {/* Bloque 3: Efectividad de Cobertura */}
      <div className="stats-row-block">
        <div className="stats-info-col">
          <div className="stats-metric-row clean-metric-row">
            <div>
              <span className="stats-metric-title">
                Efectividad de Cobertura (Discipulador Asignado)
              </span>
              <span className="stats-metric-desc">
                {totalConDiscipulador} con mentor asignado formalmente
              </span>
            </div>
            <span className="stats-metric-badge badge-blue">
              {porcentajeAcompanamiento}%
            </span>
          </div>
          <div className="stats-progress-bar">
            <div
              className="stats-progress-fill"
              style={{
                width: `${porcentajeAcompanamiento}%`,
                background: "#0284c7",
              }}
            />
          </div>
        </div>

        <div className="stats-chart-col">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datosCobertura}
                dataKey="value"
                innerRadius={28}
                outerRadius={40}
                paddingAngle={2}
              >
                {datosCobertura.map((entry, index) => (
                  <Cell key={`cell-c-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
