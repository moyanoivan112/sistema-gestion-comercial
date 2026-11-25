import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./DetalleAsistenciaModal.css";

export default function DetalleAsistenciaModal({
  fecha,
  idMinisterio,
  nombreMinisterio,
  onClose,
}) {
  const [detalle, setDetalle] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "-";
    const soloFecha = String(fechaStr).split("T")[0];
    const [anio, mes, dia] = soloFecha.split("-");
    if (!anio || !mes || !dia) return soloFecha;
    return `${dia}/${mes}/${anio}`;
  };

  useEffect(() => {
    let active = true;

    const fetchDetalle = async () => {
      setLoading(true);
      try {
        const response = await api.get("/asistencia/historial", {
          params: { fecha, id_ministerio: idMinisterio },
        });
        if (active) {
          setDetalle(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Error al cargar detalle de asistencia:", error);
        if (active) {
          setDetalle([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetalle();
    return () => {
      active = false;
    };
  }, [fecha, idMinisterio]);

  return (
    <div className="detalle-modal-overlay" onClick={onClose}>
      <div
        className="detalle-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detalle-modal-header">
          <div>
            <h3 className="detalle-modal-title">Detalle de Asistencia</h3>
            <p className="detalle-modal-subtitle">
              {nombreMinisterio} — Fecha:{" "}
              <strong>{formatearFecha(fecha)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="detalle-modal-close-btn"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <p className="detalle-modal-state-text">Cargando listado...</p>
        ) : detalle.length === 0 ? (
          <p className="detalle-modal-state-text">
            No hay registros para esta fecha.
          </p>
        ) : (
          <div className="detalle-table-container">
            <table className="detalle-asistencia-table">
              <thead>
                <tr>
                  <th>Hermano/a</th>
                  <th>DNI</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((item) => {
                  const presente =
                    item.presente === 1 || item.presente === true;
                  return (
                    <tr key={item.id}>
                      <td className="detalle-col-name">
                        {item.apellido}, {item.nombre}
                      </td>
                      <td className="detalle-col-dni">{item.dni || "S/D"}</td>
                      <td className="text-center">
                        <span
                          className={`detalle-badge ${
                            presente ? "presente" : "ausente"
                          }`}
                        >
                          {presente ? "Presente ✓" : "Ausente ✗"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="detalle-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="detalle-modal-action-btn"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
