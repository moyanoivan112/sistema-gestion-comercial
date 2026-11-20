import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./AsignarAlumnoModal.css";

export default function AsignarAlumnoModal({
  ministerio,
  lider,
  onClose,
  onSuccess,
}) {
  const [allPersonas, setAllPersonas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [personaSelected, setPersonaSelected] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Obtenemos las personas aptas para el ministerio
        const resPers = await api.get("/asistencia/personas", {
          params: { tipo: ministerio.id },
        });
        const personas = resPers.data;

        // 2. Obtenemos los profesores del ministerio
        const resLideres = await api.get(
          `/ministerios/${ministerio.id}/lideres`,
        );
        const lideres = resLideres.data;

        // 3. Cruzamos los datos para saber qué profesor tiene asignado cada alumno
        const mapaAsignados = {};
        if (Array.isArray(lideres)) {
          for (const l of lideres) {
            const resAlumnos = await api.get(
              `/ministerios/${ministerio.id}/lideres/${l.id}/alumnos`,
            );
            const alumnosLider = resAlumnos.data;
            if (Array.isArray(alumnosLider)) {
              alumnosLider.forEach((alu) => {
                mapaAsignados[alu.id] = {
                  liderId: l.id,
                  nombreCompleto: `${l.apellido}, ${l.nombre}`,
                };
              });
            }
          }
        }

        // Asignamos el estado de pertenencia a cada persona
        const personasConInfo = (Array.isArray(personas) ? personas : []).map(
          (p) => {
            const asignacion = mapaAsignados[p.id] || null;
            let estado = "disponible";
            let profesorActual = null;

            if (asignacion) {
              profesorActual = asignacion.nombreCompleto;
              if (asignacion.liderId === lider.id) {
                estado = "propio";
              } else {
                estado = "otro";
              }
            }

            return {
              ...p,
              estadoAsignacion: estado,
              profesorActual,
            };
          },
        );

        setAllPersonas(personasConInfo);
      } catch (err) {
        console.error("Error al cargar datos del modal:", err);
      }
    };

    cargarDatos();
  }, [ministerio, lider]);

  // Filtrar personas según el buscador
  const personasFiltradas = allPersonas.filter((p) => {
    const textoCompleto =
      `${p.nombre} ${p.apellido} ${p.dni || ""}`.toLowerCase();
    return textoCompleto.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e, forzarConfirmacion = false) => {
    if (e) e.preventDefault();
    if (!personaSelected) return alert("Selecciona a una persona de la lista.");

    try {
      const res = await api.post(
        `/ministerios/${ministerio.id}/lideres/${lider.id}/alumnos`,
        {
          id_persona: Number(personaSelected.id),
          confirmarTraspaso: forzarConfirmacion,
        },
      );

      const data = res.data;
      alert(data.mensaje);
      onClose();
      onSuccess();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 409 && data?.requiereConfirmacion) {
        const deseaTraspasar = window.confirm(data.mensaje);
        if (deseaTraspasar) {
          return handleSubmit(null, true);
        }
        return;
      }

      if (data?.mensaje) {
        alert(data.mensaje);
      } else {
        console.error(err);
        alert("Error de red al procesar la asignación.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h4 className="modal-title">
          Añadir Alumno a la Clase de {lider?.nombre}
        </h4>
        <p className="modal-subtitle">
          Busca y selecciona un hermano para sumar o traspasar a tu clase.
        </p>

        {/* Input de búsqueda */}
        <div className="modal-search-wrapper">
          <input
            type="text"
            className="modal-search-input"
            placeholder="🔍 Buscar por nombre, apellido o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista scrolleable de personas */}
        <div className="modal-list-container">
          {personasFiltradas.length === 0 ? (
            <p className="modal-empty-text">
              No se encontraron personas con ese criterio.
            </p>
          ) : (
            personasFiltradas.map((p) => {
              const isSelected = personaSelected?.id === p.id;
              const esPropio = p.estadoAsignacion === "propio";
              const esDeOtro = p.estadoAsignacion === "otro";

              let itemClasses = "modal-list-item";
              if (esPropio) itemClasses += " disabled";
              if (isSelected) itemClasses += " selected";

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!esPropio) {
                      setPersonaSelected(p);
                    }
                  }}
                  className={itemClasses}
                >
                  <div>
                    <span className="modal-item-name">
                      {p.apellido}, {p.nombre}
                    </span>
                    <div className="modal-item-meta">DNI: {p.dni || "N/D"}</div>
                  </div>

                  {/* Etiquetas dinámicas según la regla */}
                  {esPropio ? (
                    <span className="modal-badge propio">
                      ✓ Ya está en tu clase
                    </span>
                  ) : esDeOtro ? (
                    <span className="modal-badge otro">
                      📚 Con: {p.profesorActual}
                    </span>
                  ) : (
                    <span className="modal-badge disponible">Disponible</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Acciones del Modal */}
        <form onSubmit={handleSubmit} className="modal-footer-form">
          <span
            className={`modal-selected-status ${personaSelected ? "active" : ""}`}
          >
            {personaSelected
              ? `Seleccionado: ${personaSelected.apellido}, ${personaSelected.nombre}`
              : "Ninguno seleccionado"}
          </span>

          <div className="modal-buttons-group">
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-submit"
              disabled={!personaSelected}
            >
              Asignar a Clase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
