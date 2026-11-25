// src/pages/Attendance/components/HistorialTab.jsx
import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import "./HistorialTab.css";
import DetalleAsistenciaModal from "./DetalleAsistenciaModal";

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const response = await api.get(`/asistencia/historial`, {
          params: { fecha, id_ministerio: idMinisterio },
        });
        setDetalle(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error al cargar detalle de asistencia:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [fecha, idMinisterio]);

  return (
    <div className="historial-modal-overlay">
      <div className="historial-modal-content">
        <header className="historial-modal-header">
          <div>
            <h3 className="historial-modal-title">Detalle de Asistencia</h3>
            <p className="historial-modal-subtitle">
              {nombreMinisterio} — Fecha:{" "}
              <strong>{formatearFecha(fecha)}</strong>
            </p>
          </div>
          <button onClick={onClose} className="historial-modal-close-btn">
            ✕
          </button>
        </header>

        {loading ? (
          <p className="historial-state-text">Cargando listado...</p>
        ) : detalle.length === 0 ? (
          <p className="historial-state-text">
            No hay registros para esta fecha.
          </p>
        ) : (
          <div className="historial-table-container">
            <table className="historial-table">
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
                    <td className="historial-col-name">
                      {item.apellido}, {item.nombre}
                    </td>
                    <td className="historial-col-dni">{item.dni || "S/D"}</td>
                    <td className="text-center">
                      <span
                        className={`historial-badge ${
                          item.presente === 1 ? "presente" : "ausente"
                        }`}
                      >
                        {item.presente === 1 ? "Presente ✓" : "Ausente ✗"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="historial-modal-footer">
          <button onClick={onClose} className="historial-action-btn">
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

// Componente Principal de la Pestaña Historial
export default function HistorialTab() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paginación (10 registros por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  // Estado del Modal de detalle
  const [modalData, setModalData] = useState(null);

  // Función auxiliar para formatear la fecha a formato local argentino (DD/MM/AAAA)
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "-";
    const soloFecha = fechaStr.split("T")[0];
    const [anio, mes, dia] = soloFecha.split("-");
    if (!anio || !mes || !dia) return soloFecha;
    return `${dia}/${mes}/${anio}`;
  };

  useEffect(() => {
    const fetchHistorialLista = async () => {
      try {
        const response = await api.get("/asistencia/fechas-registradas");
        setRegistros(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error al cargar historial de asistencias:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorialLista();
  }, []);

  // Cálculos de Paginación
  const indiceUltimoRegistro = paginaActual * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosActuales = registros.slice(
    indicePrimerRegistro,
    indiceUltimoRegistro,
  );
  const totalPaginas = Math.ceil(registros.length / registrosPorPagina);

  return (
    <div className="historial-card">
      <h3 className="historial-main-title">Historial de Asistencias Tomadas</h3>
      <p className="historial-main-subtitle">
        Selecciona un registro del listado para consultar el detalle de
        asistencia de ese día.
      </p>

      {loading ? (
        <p className="historial-state-text">Cargando historial...</p>
      ) : registros.length === 0 ? (
        <p className="historial-empty-text">
          No hay asistencias registradas todavía.
        </p>
      ) : (
        <>
          <div className="historial-table-container">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo de Reunión / Grupo</th>
                  <th className="text-center">Presentes / Total</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {registrosActuales.map((item, index) => (
                  <tr
                    key={index}
                    className="historial-row-clickable"
                    onClick={() => setModalData(item)}
                  >
                    <td className="historial-col-date">
                      {formatearFecha(item.fecha_registro)}
                    </td>
                    <td className="historial-col-ministerio">
                      {item.nombre_ministerio}
                    </td>
                    <td className="text-center">
                      <span className="historial-count-badge">
                        {item.total_presentes} / {item.total_registrados}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="historial-detail-btn">
                        Ver Detalle 👁️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginación */}
          <div className="historial-pagination-bar">
            <span className="historial-pagination-info">
              Mostrando página <strong>{paginaActual}</strong> de{" "}
              <strong>{totalPaginas || 1}</strong> ({registros.length} registros
              en total)
            </span>
            <div className="historial-pagination-buttons">
              <button
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="historial-page-btn"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))
                }
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                className="historial-page-btn"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Detalle */}
      {modalData && (
  <DetalleAsistenciaModal
    fecha={String(modalData.fecha_registro).split("T")[0]}
    idMinisterio={modalData.id_ministerio}
    nombreMinisterio={modalData.nombre_ministerio}
    onClose={() => setModalData(null)}
  />
)}
    </div>
  );
}
