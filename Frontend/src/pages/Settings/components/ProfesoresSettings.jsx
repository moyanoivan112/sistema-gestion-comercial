import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import "./ProfesoresSettings.css";

export default function ProfesoresSettings({ ministerios }) {
  const [selectedMinisterio, setSelectedMinisterio] = useState("");
  const [lideresAsignados, setLideresAsignados] = useState([]);
  const [allPersonas, setAllPersonas] = useState([]);

  // Estados para el Modal de Selección
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const ministeriosRelevantes = ministerios.filter((m) => {
    const l = m.nombre.toLowerCase();
    return l.includes("escuela") || l.includes("pre adolescentes");
  });

  // Cargar lista general de personas
  useEffect(() => {
    api
      .get("/personas")
      .then((res) => setAllPersonas(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));
  }, []);

  const cargarLideres = useCallback(async (idMin) => {
    if (!idMin) {
      setLideresAsignados([]);
      return;
    }
    try {
      const res = await api.get(`/ministerios/${idMin}/config-lideres`);
      setLideresAsignados(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Cargar profesores asignados al ministerio seleccionado
  useEffect(() => {
    cargarLideres(selectedMinisterio);
  }, [selectedMinisterio, cargarLideres]);

  const handleAsignarProfesor = async (personaId) => {
    try {
      const res = await api.post(
        `/ministerios/${selectedMinisterio}/config-lideres`,
        { id_persona: Number(personaId) },
      );
      alert(res.data?.mensaje || "Profesor asignado");
      setIsModalOpen(false);
      setSearchTerm("");
      await cargarLideres(selectedMinisterio);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.mensaje || "Error al asignar profesor");
    }
  };

  const handleQuitarProfesor = async (idPersona) => {
    if (!confirm("¿Deseas quitar a este profesor de este ministerio?")) return;

    try {
      await api.delete(
        `/ministerios/${selectedMinisterio}/config-lideres/${idPersona}`,
      );
      setLideresAsignados((prev) => prev.filter((p) => p.id !== idPersona));
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrar personas en el modal según el buscador
  const idsAsignados = new Set(lideresAsignados.map((l) => l.id));
  const personasFiltradas = allPersonas.filter((p) => {
    const texto = `${p.nombre} ${p.apellido} ${p.dni || ""}`.toLowerCase();
    return texto.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="profesores-card">
      <h3>Asignación de Profesores y Líderes</h3>
      <p className="profesores-subtitle">
        Designa qué hermanos actúan como maestros o líderes en Escuela Bíblica o
        Pre-Adolescentes.
      </p>

      <div className="profesores-select-group">
        <label className="profesores-label">
          Seleccionar Ministerio / Clase:
        </label>
        <select
          value={selectedMinisterio}
          onChange={(e) => setSelectedMinisterio(e.target.value)}
          className="profesores-select"
        >
          <option value="">-- Seleccione un ministerio --</option>
          {ministeriosRelevantes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      {selectedMinisterio && (
        <div>
          {/* Botón que abre el modal de asignación */}
          <div className="profesores-assign-btn-wrapper">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-asignar-modal"
            >
              + Asignar Profesor a este Grupo
            </button>
          </div>

          <h4 className="profesores-section-title">
            Profesores Actuales en este Grupo:
          </h4>

          {lideresAsignados.length === 0 ? (
            <p className="profesores-empty">
              No hay profesores asignados todavía.
            </p>
          ) : (
            <div className="profesores-table-container">
              <table className="profesores-table">
                <thead>
                  <tr>
                    <th>Profesor / Líder</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lideresAsignados.map((lider) => (
                    <tr key={lider.id} className="profesores-tr">
                      <td className="profesores-td font-weight-bold">
                        👨‍🏫 {lider.apellido}, {lider.nombre}
                      </td>
                      <td className="profesores-td text-right">
                        <button
                          type="button"
                          onClick={() => handleQuitarProfesor(lider.id)}
                          className="btn-quitar"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL DE BÚSQUEDA Y SELECCIÓN --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Seleccionar miembro para asignar como profesor</h3>
              <p>Busca en el registro general de personas:</p>
            </div>

            <div className="modal-search-box">
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="modal-search-input"
              />
            </div>

            <div className="modal-list">
              {personasFiltradas.length === 0 ? (
                <p className="modal-empty">No se encontraron resultados.</p>
              ) : (
                personasFiltradas.map((persona) => {
                  const yaEsProfesor = idsAsignados.has(persona.id);

                  return (
                    <div key={persona.id} className="modal-row">
                      <div className="modal-row-info">
                        <strong>
                          {persona.apellido}, {persona.nombre}
                        </strong>
                        <span className="modal-row-dni">
                          DNI: {persona.dni || "Sin DNI"}
                        </span>
                      </div>

                      <div>
                        {yaEsProfesor ? (
                          <span className="modal-badge-assigned">
                            Ya asignado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAsignarProfesor(persona.id)}
                            className="modal-btn-select"
                          >
                            Seleccionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchTerm("");
                }}
                className="modal-btn-close"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
