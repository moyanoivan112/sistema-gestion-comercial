import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./MemberForm.css";

export default function MemberForm({ initialData, onClose, onSave }) {
  const [formData, setFormData] = useState(
    initialData || {
      nombre: "",
      apellido: "",
      dni: "",
      email: "",
      fecha_nacimiento: "",
      telefono: "",
      direccion: "",
      contacto_referencia: "",
      bautizado: false,
      en_discipulado: false,
      discipulador: "",
    },
  );

  // Estados para la gestión de ministerios manuales
  const [ministeriosDisponibles, setMinisteriosDisponibles] = useState([]);
  const [ministeriosSeleccionados, setMinisteriosSeleccionados] = useState([]);

  // Estado para controlar la ventana de confirmación antes de guardar
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Cargar ministerios y determinar qué casillas marcar por defecto o por excepciones guardadas
  useEffect(() => {
    api
      .get("/ministerios")
      .then((res) =>
        setMinisteriosDisponibles(Array.isArray(res.data) ? res.data : []),
      )
      .catch((err) => console.error("Error al cargar ministerios:", err));

    if (initialData && initialData.id) {
      api
        .get(`/ministerios/persona/${initialData.id}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMinisteriosSeleccionados(res.data.map((m) => m.id));
          }
        })
        .catch((err) =>
          console.error("Error al cargar ministerios de la persona:", err),
        );
    } else {
      setMinisteriosSeleccionados([]);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Manejar selección de checkboxes de ministerios
  const handleMinisterioToggle = (idMinisterio) => {
    setMinisteriosSeleccionados((prev) => {
      if (prev.includes(idMinisterio)) {
        return prev.filter((id) => id !== idMinisterio);
      } else {
        return [...prev, idMinisterio];
      }
    });
  };

  // Intercepta el evento del formulario (click o Enter) para mostrar el cartel de confirmación
  const handleIntentarGuardar = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  // Función real que ejecuta la lógica de guardado tras confirmar en el modal
  const handleConfirmarGuardado = async () => {
    setShowConfirm(false);

    try {
      // 1. Guardamos los datos generales de la persona
      const savedPersona = await onSave(formData);
      const personaId = initialData?.id || savedPersona?.id;

      // 2. Actualizamos los ministerios seleccionados
      if (personaId) {
        await api.put(`/ministerios/persona/${personaId}`, {
          ministeriosIds: ministeriosSeleccionados,
        });
      }

      // Mensaje de éxito visual y cierre
      alert("¡Cambios guardados correctamente! ✅");
      if (onClose) onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Ocurrió un error al guardar los cambios.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content form-modal">
        <header className="modal-header">
          <h3>{initialData ? "Editar Hermano" : "Añadir Nuevo Hermano"}</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            ✖
          </button>
        </header>

        <form onSubmit={handleIntentarGuardar} className="member-form">
          <fieldset>
            <legend>Datos Personales</legend>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Apellido</label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>DNI</label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div className="form-group">
                <label>Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={
                    formData.fecha_nacimiento
                      ? formData.fecha_nacimiento.split("T")[0]
                      : ""
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Estado Espiritual</legend>
            <div className="form-grid">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="bautizado"
                    checked={formData.bautizado}
                    onChange={handleChange}
                  />
                  ¿Está Bautizado?
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="en_discipulado"
                    checked={formData.en_discipulado}
                    onChange={handleChange}
                  />
                  ¿Está en discipulado?
                </label>
              </div>

              {formData.en_discipulado && (
                <div className="form-group">
                  <label>¿Quién lo discipula?</label>
                  <input
                    type="text"
                    name="discipulador"
                    value={formData.discipulador || ""}
                    onChange={handleChange}
                    placeholder="Nombre del discipulador"
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Asignación de Ministerios / Excepciones */}
          <fieldset>
            <legend>Ministerios y Grupos (Asignación / Excepciones)</legend>
            <p className="ministerios-instruction">
              Marca o desmarca los ministerios a los que pertenece el hermano
              (ideal para quitar al Administrador genérico de las listas de
              asistencia o manejar excepciones):
            </p>
            <div className="ministerios-checkbox-grid">
              {ministeriosDisponibles.map((min) => (
                <label key={min.id} className="ministerio-checkbox-item">
                  <input
                    type="checkbox"
                    checked={ministeriosSeleccionados.includes(min.id)}
                    onChange={() => handleMinisterioToggle(min.id)}
                  />
                  {min.nombre}
                </label>
              ))}
            </div>
          </fieldset>

          <footer className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Registro
            </button>
          </footer>
        </form>
      </div>

      {/* Cartel de confirmación emergente (Previene envíos accidentales por Enter) */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content">
            <h3 className="confirm-modal-title">¿Confirmar guardado?</h3>
            <p className="confirm-modal-text">
              ¿Estás seguro de que deseas guardar este registro en la
              congregación?
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="confirm-btn-cancel"
              >
                No, revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmarGuardado}
                className="confirm-btn-save"
              >
                Sí, guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
