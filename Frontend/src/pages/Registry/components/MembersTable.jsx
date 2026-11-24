// src/pages/Registry/components/MembersTable.jsx
import { useState } from "react";
import "./MembersTable.css";

export default function MembersTable({ data, onEdit, onDelete }) {
  const [selectedMember, setSelectedMember] = useState(null); // Estado para el modal de detalles

  // Función auxiliar para formatear la fecha a formato local argentino (DD/MM/AAAA)
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "-";
    const soloFecha = fechaStr.split("T")[0];
    const [anio, mes, dia] = soloFecha.split("-");
    if (!anio || !mes || !dia) return soloFecha;
    return `${dia}/${mes}/${anio}`;
  };

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="members-empty-card">
        No se encontraron hermanos en el registro.
      </div>
    );
  }

  return (
    <div className="members-table-wrapper">
      <div className="table-responsive">
        <table className="members-main-table">
          <thead>
            <tr>
              <th className="table-header">Nombre Completo</th>
              <th className="table-header">DNI</th>
              <th className="table-header">Fecha de Nacimiento</th>
              <th className="table-header">Bautizado</th>
              <th className="table-header">Discipulado</th>
              <th className="table-header">Discipulador</th>
              <th className="table-header text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => {
              const isBautizado = member.bautizado;
              const isDiscipulado = member.en_discipulado;

              return (
                <tr key={member.id} className="members-table-row">
                  {/* Nombre Completo como Enlace Interactivo */}
                  <td className="members-td">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="member-name-btn"
                      title="Ver información completa"
                    >
                      {member.apellido || ""} {` ${member.nombre || ""}`}
                    </button>
                  </td>

                  <td className="members-td text-muted">{member.dni || "-"}</td>

                  <td className="members-td text-muted">
                    {formatearFecha(member.fecha_nacimiento)}
                  </td>

                  {/* Bautizado Badge */}
                  <td className="members-td">
                    <span
                      className={`badge ${
                        isBautizado ? "badge-success" : "badge-neutral"
                      }`}
                    >
                      {isBautizado ? "Sí" : "No"}
                    </span>
                  </td>

                  {/* Discipulado Badge */}
                  <td className="members-td">
                    <span
                      className={`badge ${
                        isDiscipulado ? "badge-warning" : "badge-neutral"
                      }`}
                    >
                      {isDiscipulado ? "Sí" : "No"}
                    </span>
                  </td>

                  <td className="members-td text-muted">
                    {isDiscipulado ? member.discipulador || "Asignado" : "--"}
                  </td>

                  {/* Botones de Acción */}
                  <td className="members-td text-right">
                    <div className="members-actions-group">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        title="Editar datos"
                        className="btn-members-edit"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(member.id)}
                        title="Dar de baja"
                        className="btn-members-delete"
                      >
                        Baja
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALLE DE LA PERSONA */}
      {selectedMember && (
        <div className="member-detail-overlay">
          <div className="member-detail-modal">
            {/* Cabecera del Modal */}
            <div className="member-detail-header">
              <h3 className="member-detail-title">Detalle del Hermano</h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="member-detail-close"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Modal con Información Completa */}
            <div className="member-detail-body">
              <div className="detail-item">
                <strong>Nombre Completo:</strong> {selectedMember.apellido}{" "}
                {selectedMember.nombre}
              </div>
              <div className="detail-item">
                <strong>Sexo / Género:</strong>{" "}
                {selectedMember.genero || "No especificado"}
              </div>
              <div className="detail-item">
                <strong>DNI:</strong> {selectedMember.dni || "No especificado"}
              </div>
              <div className="detail-item">
                <strong>Fecha de Nacimiento:</strong>{" "}
                {formatearFecha(selectedMember.fecha_nacimiento)}
              </div>
              <div className="detail-item">
                <strong>Teléfono:</strong>{" "}
                {selectedMember.telefono || "No especificado"}
              </div>
              <div className="detail-item">
                <strong>Correo Electrónico:</strong>{" "}
                {selectedMember.email || "No especificado"}
              </div>
              <div className="detail-item">
                <strong>Bautizado:</strong>{" "}
                {selectedMember.bautizado ? "Sí" : "No"}
              </div>
              <div className="detail-item">
                <strong>En Discipulado:</strong>{" "}
                {selectedMember.en_discipulado ? "Sí" : "No"}
              </div>
              {selectedMember.en_discipulado && (
                <div className="detail-item">
                  <strong>Discipulador:</strong>{" "}
                  {selectedMember.discipulador || "No asignado"}
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="member-detail-footer">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="btn-members-close-modal"
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
