import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./AsistenciaModal.css";

export default function AsistenciaModal({ tipoReunion, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ausentes");

  useEffect(() => {
    const fetchComparativa = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/asistencia/comparativa/${encodeURIComponent(tipoReunion)}`,
        );
        setData(res.data);
      } catch (err) {
        console.error("Error al cargar comparativa:", err);
        alert(
          err.response?.data?.error ||
            "No se pudo cargar el reporte comparativo.",
        );
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchComparativa();
  }, [tipoReunion]);

  const formatearFechaLegible = (fechaStr) => {
    if (!fechaStr) return "";
    const soloFecha = fechaStr.split("T")[0];
    const [year, month, day] = soloFecha.split("-");
    const fechaObj = new Date(year, month - 1, day);
    return fechaObj.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
    });
  };

  const listaActual =
    activeTab === "ausentes" ? data?.ausentesUltima : data?.reingresosUltima;

  return (
    <div className="asistencia-modal-overlay" onClick={onClose}>
      <div
        className="asistencia-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="asistencia-modal-header">
          <div className="asistencia-modal-header-info">
            <h3>📊 {tipoReunion}</h3>
            {data && (
              <small className="asistencia-modal-subtitle-fecha">
                Anterior:{" "}
                <strong>{formatearFechaLegible(data.fechaPenultima)}</strong>{" "}
                vs. Última reunión:{" "}
                <strong>{formatearFechaLegible(data.fechaUltima)}</strong>
              </small>
            )}
          </div>
          <button
            type="button"
            className="asistencia-modal-close-btn"
            onClick={onClose}
            title="Cerrar"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="asistencia-modal-loading">
            Analizando registros históricos...
          </div>
        ) : data ? (
          <>
            <div className="asistencia-modal-tabs">
              <button
                type="button"
                className={`asistencia-modal-tab-btn ${activeTab === "ausentes" ? "active" : ""}`}
                onClick={() => setActiveTab("ausentes")}
              >
                🔴 Vinieron el {formatearFechaLegible(data.fechaPenultima)} y
                faltaron a la ultima reunión ({data.ausentesUltima.length})
              </button>
              <button
                type="button"
                className={`asistencia-modal-tab-btn ${activeTab === "reingresos" ? "active" : ""}`}
                onClick={() => setActiveTab("reingresos")}
              >
                🟢 Reingresos: habían faltado el{" "}
                {formatearFechaLegible(data.fechaPenultima)} (
                {data.reingresosUltima.length})
              </button>
            </div>

            <div className="asistencia-modal-list-container">
              <div className="asistencia-modal-list-panel">
                {!listaActual || listaActual.length === 0 ? (
                  <p className="asistencia-modal-empty">
                    {activeTab === "ausentes"
                      ? "¡Excelente! Ningún asistente habitual faltó en esta ocasión."
                      : "No se registraron reingresos en esta fecha."}
                  </p>
                ) : (
                  <ul className="asistencia-modal-member-list">
                    {listaActual.map((m) => (
                      <li key={m.id} className="asistencia-modal-member-item">
                        <div className="asistencia-modal-member-meta">
                          <strong>
                            {m.nombre} {m.apellido}
                          </strong>
                          <small>Tel: {m.telefono || "No registrado"}</small>
                        </div>
                        <span
                          className={`asistencia-badge-status ${
                            activeTab === "ausentes" ? "ausente" : "reingreso"
                          }`}
                        >
                          {activeTab === "ausentes"
                            ? "Ausente hoy"
                            : "Regresó / Asistió"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
