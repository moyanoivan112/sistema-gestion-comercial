// src/pages/Statistics/components/HistoricalChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./HistoricalChart.css";

export default function HistoricalChart({
  totalActivos,
  totalBajas,
  totalMinisterios,
}) {
  // Datos estructurados para el gráfico de barras
  const dataBalance = [
    { name: "Activos", cantidad: totalActivos, color: "#0284c7" },
    { name: "Inactivos/Bajas", cantidad: totalBajas, color: "#dc2626" },
    {
      name: "Total Procesado",
      cantidad: totalActivos + totalBajas,
      color: "#1e293b",
    },
    { name: "Ministerios", cantidad: totalMinisterios, color: "#9333ea" },
  ];

  return (
    <div className="stats-panel">
      <h3>📊 Balance Histórico y Demográfico</h3>
      <p className="stats-panel-sub">
        Control acumulado de altas, bajas y estabilidad de la base de datos
      </p>

      {/* Gráfico de Barras Moderno */}
      <div className="historical-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataBalance}
            margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#eaeaea"
            />
            <XAxis dataKey="name" stroke="#7f8c8d" fontSize={11} />
            <YAxis stroke="#7f8c8d" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#fff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
              }}
            />
            <Bar dataKey="cantidad" name="Registros" radius={[6, 6, 0, 0]}>
              {dataBalance.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="stats-data-table-container">
        <table className="stats-data-table">
          <tbody>
            <tr>
              <td>Total Histórico de Miembros Activos</td>
              <td className="text-right font-bold text-active">
                {totalActivos}
              </td>
            </tr>
            <tr>
              <td>Historial de Miembros Inactivos (Bajas)</td>
              <td className="text-right font-bold text-inactive">
                {totalBajas}
              </td>
            </tr>
            <tr>
              <td>Total Histórico Procesado (Activos + Bajas)</td>
              <td className="text-right font-bold text-total">
                {totalActivos + totalBajas}
              </td>
            </tr>
            <tr>
              <td>Ministerios / Clases Activas configuradas</td>
              <td className="text-right font-bold text-ministries">
                {totalMinisterios}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stats-insight-box">
        <strong>💡 Nota pastoral:</strong>
        <p>
          Los datos acumulados muestran la evolución general de la congregación
          a lo largo del tiempo. Utilice estos reportes para evaluar cierres de
          trimestre y planificación anual.
        </p>
      </div>
    </div>
  );
}
