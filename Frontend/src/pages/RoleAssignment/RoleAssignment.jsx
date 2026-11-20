// src/pages/RoleAssignment/RoleAssignment.jsx

import { useState, useEffect } from "react";
import SearchBar from "../Registry/components/SearchBar";
import UsersTable from "./components/RoleAssignmentList";
import api from "../../services/api";
import "./RoleAssignment.css";

export default function RoleAssignment() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para el modal de asignación/edición
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [emailAsignacion, setEmailAsignacion] = useState("");
  const [rol, setRol] = useState("Líder");

  // Estado para el modal de búsqueda general (cuando queremos asignar rol a alguien nuevo)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMembers = async () => {
    try {
      const response = await api.get("/personas");
      setMembers(response.data);
    } catch (err) {
      console.error("Error al cargar personas:", err);
      setError("No se pudo cargar la lista de la congregación.");
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 1. FILTRAR SOLO LOS QUE TIENEN ROL PARA LA TABLA PRINCIPAL
  const membersWithRole = members.filter((member) => member.rol_sistema);

  const filteredSystemUsers = membersWithRole.filter((member) => {
    const fullName =
      `${member.nombre || ""} ${member.apellido || ""}`.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      (member.dni && member.dni.includes(searchTerm))
    );
  });

  // 2. FILTRAR TODAS LAS PERSONAS PARA EL MODAL DE BÚSQUEDA GENERAL (Nuevos accesos)
  const filteredAllPeople = members.filter((member) => {
    const fullName =
      `${member.nombre || ""} ${member.apellido || ""}`.toLowerCase();
    return (
      fullName.includes(generalSearchTerm.toLowerCase()) ||
      (member.dni && member.dni.includes(generalSearchTerm))
    );
  });

  const handleOpenAssignModal = (person) => {
    setSelectedPerson(person);
    setRol(person.rol_sistema || "Líder");
    setNombreUsuario("");
    setPassword("");
    setEmailAsignacion(person.email || "");
    setMensaje("");
    setError("");
    setShowSearchModal(false); // Cerramos el modal de búsqueda general si estaba abierto
  };

  const handleSaveUserOrRole = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setLoading(true);

    try {
      if (emailAsignacion !== selectedPerson.email) {
        await api.put(`/personas/${selectedPerson.id}`, {
          ...selectedPerson,
          email: emailAsignacion,
        });
      }

      if (selectedPerson.rol_sistema) {
        await api.put(`/auth/actualizar-rol/${selectedPerson.id}`, { rol });
        setMensaje("¡Rol y datos actualizados con éxito!");
      } else {
        const payload = {
          id_persona: selectedPerson.id || selectedPerson.id_persona,
          nombre_usuario: nombreUsuario,
          password: password,
          rol: rol,
        };

        await api.post("/auth/crear-usuario", payload);
        setMensaje("¡Acceso creado con éxito!");
      }

      setTimeout(() => {
        setSelectedPerson(null);
        fetchMembers();
      }, 1500);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.mensaje ||
        "Error al procesar la solicitud.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-assignment-container">
      <header className="role-assignment-header">
        <h2>Gestión de Usuarios y Roles del Sistema</h2>
        <p>
          Administra los accesos y permisos de los usuarios que operan la
          plataforma.
        </p>
      </header>

      {mensaje && <div className="alert-success">{mensaje}</div>}
      {error && <div className="error-alert">{error}</div>}

      {/* Barra superior con buscador y botón de asignación */}
      <div className="role-toolbar">
        <div className="role-search-wrapper">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
        <button
          type="button"
          onClick={() => {
            setShowSearchModal(true);
            setGeneralSearchTerm("");
          }}
          className="role-action-btn assign role-top-assign-btn"
        >
          + Asignar Rol a Miembro
        </button>
      </div>

      {/* Tabla principal: Muestra ÚNICAMENTE a los que tienen rol */}
      <UsersTable data={filteredSystemUsers} onAssign={handleOpenAssignModal} />

      {/* MODAL 1: Búsqueda general para seleccionar a alguien sin rol */}
      {showSearchModal && (
        <div className="modal-overlay">
          <div className="modal-content role-search-modal-content">
            <h3>Seleccionar miembro para asignar acceso</h3>
            <p className="role-modal-subtitle">
              Busca en el registro general de personas:
            </p>

            <div className="role-modal-input-wrap">
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o DNI..."
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
                className="role-modal-search-input"
              />
            </div>

            <div className="role-modal-table-container">
              <table className="role-modal-table">
                <tbody>
                  {filteredAllPeople.length > 0 ? (
                    filteredAllPeople.map((p) => (
                      <tr key={p.id} className="role-modal-tr">
                        <td className="role-modal-td">
                          {p.nombre} {p.apellido}
                        </td>
                        <td className="role-modal-td text-muted">
                          {p.dni || "Sin DNI"}
                        </td>
                        <td className="role-modal-td text-right">
                          {p.rol_sistema ? (
                            <span className="role-already-assigned-text">
                              Ya tiene rol ({p.rol_sistema})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(p)}
                              className="role-action-btn assign role-select-btn"
                            >
                              Seleccionar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="role-modal-empty">
                        No se encontraron personas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setShowSearchModal(false)}
              className="btn-cancel"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Formulario para crear/editar el rol y contraseña */}
      {selectedPerson && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {selectedPerson.rol_sistema
                ? "Editar Rol de: "
                : "Asignar Acceso a: "}
              {selectedPerson.nombre} {selectedPerson.apellido}
            </h3>
            <form onSubmit={handleSaveUserOrRole} className="registro-form">
              <div className="acceso-fields">
                <label>Correo Electrónico (Requerido para acceso):</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={emailAsignacion}
                  onChange={(e) => setEmailAsignacion(e.target.value)}
                  required
                />

                {!selectedPerson.rol_sistema && (
                  <>
                    <label>Nombre de usuario:</label>
                    <input
                      type="text"
                      placeholder="Ej. imoyano"
                      value={nombreUsuario}
                      onChange={(e) => setNombreUsuario(e.target.value)}
                      required
                    />

                    <label>Contraseña:</label>
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </>
                )}

                <label>Rol en el Sistema:</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)}>
                  <option value="Líder">Líder</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setSelectedPerson(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
