import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./AttendanceList.css";

export default function AttendanceList({
  ministerio,
  lider,
  date,
  members,
  loading,
  attendanceStatus,
  onStatusChange,
  onSave,
  onOpenAddModal,
  setAttendanceStatus,
}) {
  const [yaFueTomada, setYaFueTomada] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Verificar si ya se tomó asistencia para esta clase específica
  useEffect(() => {
    if (!ministerio) return;

    const params = {
      fecha: date,
      id_ministerio: ministerio.id,
      ...(lider ? { id_lider: lider.id } : {}),
    };

    api
      .get("/asistencia/verificar", { params })
      .then((res) => {
        const data = res.data;
        setYaFueTomada(Boolean(data.yaExiste));

        if (data.yaExiste) {
          api
            .get("/asistencia/historial", {
              params: {
                fecha: date,
                id_ministerio: ministerio.id,
              },
            })
            .then((r) => {
              const historial = r.data;
              const savedStatus = {};
              if (Array.isArray(historial)) {
                historial.forEach((item) => {
                  savedStatus[item.id_persona] = item.presente;
                });
              }
              setAttendanceStatus(savedStatus);
            })
            .catch((err) =>
              console.error("Error al cargar historial previo:", err),
            );

          setModoEdicion(false);
        } else {
          setAttendanceStatus({});
          setModoEdicion(true);
        }
      })
      .catch((err) => console.error("Error al verificar asistencia:", err));
  }, [date, ministerio, lider, setAttendanceStatus]);

  const primerSinMarcarIndex = members.findIndex(
    (m) => attendanceStatus[m.id] === undefined,
  );

  const maxAllowedIndex =
    primerSinMarcarIndex === -1 ? members.length - 1 : primerSinMarcarIndex;

  const handleMarcarYAvancar = (idPersona, estado, index) => {
    onStatusChange(idPersona, estado);

    if (index === activeIndex && index < members.length - 1) {
      setActiveIndex(index + 1);
    }
  };

  const handleIntentarGuardar = () => {
    const sinMarcar = members.filter(
      (m) => attendanceStatus[m.id] === undefined,
    );

    if (sinMarcar.length > 0) {
      alert(
        `⚠️ Hay ${sinMarcar.length} persona(s) sin marcar. Debes indicar obligatoriamente si están Presentes o Ausentes antes de guardar.`,
      );
      return;
    }

    onSave();
    setYaFueTomada(true);
    setModoEdicion(false);
  };

  const normalizarTexto = (texto = "") =>
    texto
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const nombreMinisterio = normalizarTexto(
    ministerio?.nombre || ministerio?.titulo || ministerio?.name || "",
  );

  const puedeAñadirAlumno =
    nombreMinisterio.includes("escuelabiblica") ||
    nombreMinisterio.includes("preadolescentes");

  return (
    <div className="attendance-list-card">
      {puedeAñadirAlumno && (
        <div className="attendance-list-top-bar">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="attendance-add-student-btn"
          >
            + Añadir Alumno a Clase
          </button>
        </div>
      )}

      {yaFueTomada && !modoEdicion && (
        <div className="attendance-warning-banner">
          <span>
            ⚠️ La asistencia para este grupo y fecha ya fue registrada.
          </span>
          <button
            onClick={() => setModoEdicion(true)}
            className="attendance-edit-btn"
          >
            Editar Asistencia
          </button>
        </div>
      )}

      {loading ? (
        <p className="attendance-loading-text">Cargando lista...</p>
      ) : members.length === 0 ? (
        <p className="attendance-empty-text">
          No hay personas registradas en esta lista todavía. Utiliza el botón de
          arriba para sumar tu primer alumno.
        </p>
      ) : (
        <div>
          <div className="attendance-stats-bar">
            <span>
              Total: <strong>{members.length}</strong>
            </span>
            <span>
              Presentes:{" "}
              <strong className="text-success">
                {members.filter((m) => attendanceStatus[m.id] === 1).length}
              </strong>
            </span>
            <span>
              Ausentes:{" "}
              <strong className="text-danger">
                {members.filter((m) => attendanceStatus[m.id] === 0).length}
              </strong>
            </span>
          </div>

          <div className="attendance-members-scroll">
            {members.map((member, index) => {
              const isLocked = index > maxAllowedIndex && !yaFueTomada;
              const isActive = activeIndex === index && !isLocked;
              const isMarked = attendanceStatus[member.id] !== undefined;

              let cardClassName = "attendance-member-row";
              if (isLocked) cardClassName += " locked";
              if (isActive) cardClassName += " active";

              return (
                <div
                  key={member.id}
                  onClick={() => {
                    if (!isLocked) setActiveIndex(index);
                  }}
                  className={cardClassName}
                >
                  <div className="attendance-member-info">
                    {isLocked && (
                      <span title="Bloqueado hasta marcar los anteriores">
                        🔒
                      </span>
                    )}
                    <div>
                      <h4 className="attendance-member-title">
                        {index + 1}. {member.apellido} {member.nombre}
                      </h4>
                      <span className="attendance-member-subtitle">
                        DNI: {member.dni || "N/D"}{" "}
                        {isMarked && !isLocked ? "✅ (Registrado)" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="attendance-action-buttons">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarcarYAvancar(member.id, 1, index);
                      }}
                      className={`attendance-status-btn present ${
                        attendanceStatus[member.id] === 1 ? "selected" : ""
                      }`}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarcarYAvancar(member.id, 0, index);
                      }}
                      className={`attendance-status-btn absent ${
                        attendanceStatus[member.id] === 0 ? "selected" : ""
                      }`}
                    >
                      Ausente
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {(!yaFueTomada || modoEdicion) && (
            <button
              type="button"
              onClick={handleIntentarGuardar}
              className="attendance-save-btn"
            >
              {yaFueTomada
                ? "Guardar Cambios de Edición"
                : "Guardar Asistencia de este Grupo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
