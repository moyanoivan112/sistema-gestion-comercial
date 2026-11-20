// src/pages/Attendance/components/DetalleAsistenciaModal.jsx
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

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const response = await api.get(`/asistencia/historial`, {
          params: { fecha, id_ministerio: idMinisterio },
        });
        setDetalle(response.data);
      } catch (error) {
        console.error("Error al cargar detalle de asistencia:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [fecha, idMinisterio]);

  return (
    <div className="detalle-modal-overlay">
      <div className="detalle-modal-content">
        <header className="detalle-modal-header">
          <div>
            <h3 className="detalle-modal-title">Detalle de Asistencia</h3>
            <p className="detalle-modal-subtitle">
              {nombreMinisterio} — Fecha: <strong>{fecha}</strong>
            </p>
          </div>
          <button onClick={onClose} className="detalle-modal-close-btn">
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
                {detalle.map((item) => (
                  <tr key={item.id}>
                    <td className="detalle-col-name">
                      {item.apellido}, {item.nombre}
                    </td>
                    <td className="detalle-col-dni">{item.dni || "S/D"}</td>
                    <td className="text-center">
                      <span
                        className={`detalle-badge ${
                          item.presente ? "presente" : "ausente"
                        }`}
                      >
                        {item.presente ? "Presente ✓" : "Ausente ✗"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="detalle-modal-footer">
          <button onClick={onClose} className="detalle-modal-action-btn">
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
