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

const esAfirmativo = (valor) => {
  if (valor === true || valor === 1) return true;
  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();
    return (
      normalizado === "sí" ||
      normalizado === "si" ||
      normalizado === "true" ||
      normalizado === "1"
    );
  }
  return false;
};

export default function HistoricalChart({
  totalActivos = 0,
  totalBajas = 0,
  totalMinisterios = 0,
  personas = [],
  ministerios = [],
  totalBautizados: bautizadosProp,
  totalDiscipulado: discipuladoProp,
  totalConDiscipulador: conDiscipuladorProp,
}) {
  const listaPersonas = Array.isArray(personas) ? personas : [];

  const totalHistorico = totalActivos + totalBajas;
  const tasaRetencion =
    totalHistorico > 0
      ? Math.round((totalActivos / totalHistorico) * 100)
      : 100;

  const totalBautizados =
    typeof bautizadosProp === "number"
      ? bautizadosProp
      : listaPersonas.filter((p) => esAfirmativo(p.bautizado)).length;

  const totalDiscipulado =
    typeof discipuladoProp === "number"
      ? discipuladoProp
      : listaPersonas.filter((p) => esAfirmativo(p.en_discipulado)).length;

  const conDiscipulador =
    typeof conDiscipuladorProp === "number"
      ? conDiscipuladorProp
      : listaPersonas.filter(
          (p) => p.discipulador && String(p.discipulador).trim() !== "",
        ).length;

  const porcentajeCoberturaDiscipulado =
    totalDiscipulado > 0
      ? Math.round((conDiscipulador / totalDiscipulado) * 100)
      : 0;

  const dataDemografia = [
    { name: "Activos", cantidad: Number(totalActivos) || 0, color: "#0284c7" },
    {
      name: "Bautizados",
      cantidad: Number(totalBautizados) || 0,
      color: "#16a34a",
    },
    {
      name: "Discipulado",
      cantidad: Number(totalDiscipulado) || 0,
      color: "#ca8a04",
    },
    {
      name: "Con discipulador",
      cantidad: Number(conDiscipulador) || 0,
      color: "#0ea5e9",
    },
    { name: "Bajas", cantidad: Number(totalBajas) || 0, color: "#dc2626" },
  ];

  const dataMinisterios = Array.isArray(ministerios)
    ? ministerios
        .map((m) => ({
          nombre: m.nombre || "Sin nombre",
          cantidad: Number(
            m.cantidad_personas ?? m.total_miembros ?? m.miembros_count ?? 0,
          ),
        }))
        .filter((m) => m.cantidad > 0)
    : [];

  return (
    <div className="stats-panel">
      <h3>📊 Balance Histórico y Demográfico</h3>
      <p className="stats-panel-sub">
        Comparativa de población activa, estado espiritual, retención y bajas
      </p>

      <div className="historical-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataDemografia}
            margin={{ top: 12, right: 20, left: -15, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#334155"
              opacity={0.25}
            />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                color: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #334155",
                fontSize: "0.85rem",
              }}
              itemStyle={{ color: "#f8fafc" }}
            />
            <Bar dataKey="cantidad" name="Personas" radius={[6, 6, 0, 0]}>
              {dataDemografia.map((entry, index) => (
                <Cell key={`cell-demo-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="stats-data-table-container">
        <table className="stats-data-table">
          <tbody>
            <tr>
              <td>Tasa de Retención Histórica</td>
              <td className="text-right font-bold text-active">
                {tasaRetencion}% ({totalActivos}/{totalHistorico || 0})
              </td>
            </tr>
            <tr>
              <td>Miembros Activos Registrados</td>
              <td className="text-right font-bold text-active">
                {totalActivos}
              </td>
            </tr>
            <tr>
              <td>Historial de Bajas / Inactivos</td>
              <td className="text-right font-bold text-inactive">
                {totalBajas}
              </td>
            </tr>
            <tr>
              <td>Bautizados / En Discipulado / Con discipulador</td>
              <td className="text-right font-bold text-total">
                {totalBautizados} / {totalDiscipulado} / {conDiscipulador} (
                {porcentajeCoberturaDiscipulado}% de discipulado)
              </td>
            </tr>
            <tr>
              <td>Ministerios / Grupos Configurados</td>
              <td className="text-right font-bold text-ministries">
                {totalMinisterios}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {dataMinisterios.length > 0 && (
        <div
          className="stats-data-table-container"
          style={{ marginTop: "16px" }}
        >
          <h4 style={{ marginBottom: "8px", fontSize: "0.95rem" }}>
            Distribución por Ministerio
          </h4>
          <table className="stats-data-table">
            <tbody>
              {dataMinisterios.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.nombre}</td>
                  <td className="text-right font-bold text-active">
                    {item.cantidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stats-insight-box">
        <strong>💡 Lectura pastoral:</strong>
        <p>
          Contrastar activos, bautizados, discipulados y personas con
          discipulador asignado te permite detectar brechas de seguimiento antes
          de cierres trimestrales o campañas de bautismo.
        </p>
      </div>
    </div>
  );
}
