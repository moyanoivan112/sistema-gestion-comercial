// src/pages/RoleAssignment/components/RoleAssignmentList.jsx
import React from "react";
import "./RoleAssignmentList.css";

export default function UsersTable({ data, onAssign }) {
  const getRoleBadgeClass = (rol) => {
    switch (rol) {
      case "Administrador":
        return "role-badge-administrador";
      case "Pastor":
        return "role-badge-pastor";
      case "Líder":
        return "role-badge-lider";
      default:
        return "role-badge-default";
    }
  };

  // 1. Función para definir la prioridad de los roles
  const obtenerJerarquia = (rol) => {
    switch (rol) {
      case "Administrador":
        return 1;
      case "Pastor":
        return 2;
      case "Líder":
        return 3;
      default:
        return 4; // Los que no tienen rol asignado van al final
    }
  };

  // 2. Ordenamos el arreglo de usuarios según la jerarquía antes de renderizar
  const usuariosOrdenados = [...data].sort((a, b) => {
    const jerarquiaA = obtenerJerarquia(a.rol_sistema);
    const jerarquiaB = obtenerJerarquia(b.rol_sistema);
    return jerarquiaA - jerarquiaB;
  });

  return (
    <div className="table-responsive role-table-container">
      <table className="role-table">
        <thead>
          <tr className="role-table-header">
            <th>Miembro (Nombre y Apellido)</th>
            <th>Nombre de Usuario</th>
            <th>Email de Contacto / Acceso</th>
            <th className="text-center">Rol Actual</th>
            <th className="text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          {usuariosOrdenados.length > 0 ? (
            usuariosOrdenados.map((member) => (
              <tr key={member.id} className="role-table-row">
                <td className="role-table-cell font-weight-bold">
                  {member.nombre} {member.apellido}
                </td>

                {/* Columna de Nombre de Usuario */}
                <td className="role-table-cell">
                  {member.nombre_usuario ? (
                    <code className="role-username-code">
                      {member.nombre_usuario}
                    </code>
                  ) : (
                    <span className="role-no-username">Sin usuario</span>
                  )}
                </td>

                {/* Email o advertencia si falta */}
                <td className="role-table-cell">
                  {member.email ? (
                    member.email
                  ) : (
                    <span className="role-email-missing">
                      Falta email (requerido)
                    </span>
                  )}
                </td>

                <td className="role-table-cell text-center">
                  {member.rol_sistema ? (
                    <span
                      className={`role-badge ${getRoleBadgeClass(member.rol_sistema)}`}
                    >
                      {member.rol_sistema}
                    </span>
                  ) : (
                    <span className="role-no-access">Sin acceso</span>
                  )}
                </td>

                <td className="role-table-cell text-center">
                  <button
                    type="button"
                    onClick={() => onAssign(member)}
                    className={`role-action-btn ${member.rol_sistema ? "edit" : "assign"}`}
                  >
                    {member.rol_sistema ? "Editar Rol" : "Asignar Rol"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="role-table-empty">
                No se encontraron miembros registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
