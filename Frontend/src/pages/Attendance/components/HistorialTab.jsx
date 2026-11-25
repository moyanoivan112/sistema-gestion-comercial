import { useState, useEffect } from "react";
import api from "../../../services/api";
import DetalleAsistenciaModal from "./DetalleAsistenciaModal";
import "./HistorialTab.css";

export default function HistorialTab() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  const [modalData, setModalData] = useState(null);

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "-";
    const soloFecha = String(fechaStr).split("T")[0];
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
                    key={`${item.fecha_registro}-${item.id_ministerio ?? "gral"}-${index}`}
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
                      <button type="button" className="historial-detail-btn">
                        Ver Detalle 👁️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="historial-pagination-bar">
            <span className="historial-pagination-info">
              Mostrando página <strong>{paginaActual}</strong> de{" "}
              <strong>{totalPaginas || 1}</strong> ({registros.length} registros
              en total)
            </span>
            <div className="historial-pagination-buttons">
              <button
                type="button"
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="historial-page-btn"
              >
                Anterior
              </button>
              <button
                type="button"
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
