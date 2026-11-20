import { useState } from "react";
import api from "../../../services/api";
import "./MinisteriosSettings.css";

export default function MinisteriosSettings({ ministerios, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const [reqBautismo, setReqBautismo] = useState(false);

  // Estado para controlar la visibilidad del modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGuardarMinisterio = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return alert("El nombre es obligatorio");

    const minActual = ministerios.find((m) => m.id === editingId);
    const payload = {
      nombre: nuevoNombre,
      edad_minima: edadMin,
      edad_maxima: edadMax,
      requiere_bautismo: reqBautismo,
      es_exclusivo: 0,
      activo: minActual ? minActual.activo : 1,
    };

    try {
      const res = editingId
        ? await api.put(`/ministerios/${editingId}`, payload)
        : await api.post("/ministerios", payload);

      alert(res.data?.mensaje || "Guardado correctamente");
      limpiarFormulario();
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.mensaje || "Error al guardar ministerio");
    }
  };

  const limpiarFormulario = () => {
    setEditingId(null);
    setNuevoNombre("");
    setEdadMin("");
    setEdadMax("");
    setReqBautismo(false);
  };

  const handleIniciarEdicion = (min) => {
    setEditingId(min.id);
    setNuevoNombre(min.nombre);
    setEdadMin(min.edad_minima ?? "");
    setEdadMax(min.edad_maxima ?? "");
    setReqBautismo(min.requiere_bautismo === 1);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (min) => {
    try {
      await api.put(`/ministerios/${min.id}`, {
        ...min,
        activo: min.activo === 1 ? 0 : 1,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ministerios-settings-card">
      <div className="ministerios-top-bar">
        <div>
          <h3 className="ministerios-settings-title">
            Gestión de Reuniones y Ministerios
          </h3>
          <p className="ministerios-subtitle">
            Administra los grupos de asistencia, rangos de edad y requisitos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            limpiarFormulario();
            setIsModalOpen(true);
          }}
          className="btn-open-modal"
        >
          + Nueva Reunión / Ministerio
        </button>
      </div>

      {/* Tabla limpia y ordenada */}
      <div className="table-responsive">
        <table className="ministerios-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Edad Mínima</th>
              <th>Edad Máxima</th>
              <th>Bautismo Req.</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ministerios.map((min) => (
              <tr key={min.id} className="ministerios-table-row">
                <td className="ministerio-col-name">{min.nombre}</td>
                <td>{min.edad_minima ?? "-"}</td>
                <td>{min.edad_maxima ?? "Sin límite"}</td>
                <td>{min.requiere_bautismo ? "Sí" : "No"}</td>
                <td>
                  <span
                    className={`badge ${
                      min.activo !== 0 ? "badge-success" : "badge-danger"
                    }`}
                  >
                    {min.activo !== 0 ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="text-right">
                  <div className="ministerios-actions-group">
                    <button
                      type="button"
                      onClick={() => handleIniciarEdicion(min)}
                      className="btn-ministerio-edit"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActivo(min)}
                      className={`btn-ministerio-toggle ${
                        min.activo !== 0 ? "deactivate" : "activate"
                      }`}
                    >
                      {min.activo !== 0 ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE CREACIÓN / EDICIÓN --- */}
      {isModalOpen && (
        <div className="ministerios-modal-overlay">
          <div className="ministerios-modal-content">
            <div className="ministerios-modal-header">
              <h3>
                {editingId
                  ? "Editar Reunión o Ministerio"
                  : "Crear Nueva Reunión / Ministerio"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  limpiarFormulario();
                }}
                className="ministerios-modal-close"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleGuardarMinisterio}
              className="ministerios-modal-form"
            >
              <div className="ministerios-form-group">
                <label>Nombre del Grupo / Reunión:</label>
                <input
                  type="text"
                  placeholder="Ej. Jóvenes, Escuela Bíblica..."
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="ministerios-modal-input"
                  required
                />
              </div>

              <div className="ministerios-form-row">
                <div className="ministerios-form-group">
                  <label>Edad Mínima:</label>
                  <input
                    type="number"
                    placeholder="Ej. 0 o 12"
                    value={edadMin}
                    onChange={(e) => setEdadMin(e.target.value)}
                    className="ministerios-modal-input"
                  />
                </div>

                <div className="ministerios-form-group">
                  <label>Edad Máxima:</label>
                  <input
                    type="number"
                    placeholder="Ej. 99 o sin límite"
                    value={edadMax}
                    onChange={(e) => setEdadMax(e.target.value)}
                    className="ministerios-modal-input"
                  />
                </div>
              </div>

              <div className="ministerios-checkbox-group">
                <label className="ministerio-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reqBautismo}
                    onChange={(e) => setReqBautismo(e.target.checked)}
                  />
                  Requiere estar bautizado para participar
                </label>
              </div>

              <div className="ministerios-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    limpiarFormulario();
                  }}
                  className="ministerio-cancel-btn"
                >
                  Cancelar
                </button>
                <button type="submit" className="ministerio-submit-btn">
                  {editingId ? "Guardar Cambios" : "Crear Grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
