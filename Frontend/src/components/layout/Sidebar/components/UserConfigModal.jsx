import { useState } from "react";
import api from "../../../../services/api";
import "./UserConfigModal.css";

export default function UserConfigModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Obtenemos los datos del usuario logueado desde localStorage
  const userStorage = localStorage.getItem("user");
  const user = userStorage ? JSON.parse(userStorage) : null;

  const [nombreUsuario, setNombreUsuario] = useState(
    user?.nombre_usuario || "",
  );
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    try {
      const response = await api.put(`/auth/update/${user.id}`, {
        nombre_usuario: nombreUsuario.trim(),
        password_actual: passwordActual,
        password_nueva: passwordNueva ? passwordNueva.trim() : undefined,
      });

      const data = response.data;

      // Actualizamos los datos en el localStorage
      const updatedUser = { ...user, nombre_usuario: nombreUsuario.trim() };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setMensaje(data.mensaje || "¡Perfil actualizado con éxito!");
      setTimeout(() => {
        onClose();
        window.location.reload(); // Recargamos para refrescar la interfaz
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "No se pudo actualizar el perfil",
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Cabecera del Modal */}
        <div className="modal-header">
          <h3 className="modal-title">Mi Configuración de Usuario</h3>
          <button type="button" onClick={onClose} className="modal-close-x">
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleUpdateProfile} className="modal-form">
          {mensaje && <div className="alert-success">{mensaje}</div>}
          {error && <div className="alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Contraseña Actual (requerida para cambios)
            </label>
            <input
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              placeholder="********"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nueva Contraseña (opcional)</label>
            <input
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              placeholder="Dejar en blanco para no cambiar"
              className="form-input"
            />
          </div>

          {/* Pie del Modal con Botones */}
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
