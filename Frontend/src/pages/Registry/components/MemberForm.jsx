import { useState, useEffect, useCallback } from "react";
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
      genero: "",
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

  // Evita dobles envíos si se presiona Enter repetidamente
  const [isSaving, setIsSaving] = useState(false);

  // Mensaje de validación para el campo obligatorio de género
  const [generoError, setGeneroError] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        genero: initialData.genero || "",
      });
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

  // Selección rápida mediante toggle de 2 botones
  const handleSelectGenero = (valor) => {
    setFormData((prev) => ({
      ...prev,
      genero: valor,
    }));
    setGeneroError(false);
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

  // Intercepta el evento del formulario (click o Enter) para validar y mostrar confirmación
  const handleIntentarGuardar = (e) => {
    e.preventDefault();

    if (showConfirm || isSaving) return;

    if (!formData.genero) {
      setGeneroError(true);
      alert(
        "⚠️ Por favor, selecciona si es Masculino o Femenino antes de guardar.",
      );
      return;
    }

    setShowConfirm(true);
  };

  // Función real que ejecuta la lógica de guardado tras confirmar en el modal
  const handleConfirmarGuardado = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    initialData,
    ministeriosSeleccionados,
    onClose,
    onSave,
    isSaving,
  ]);

  // Atajos de teclado cuando el modal de confirmación está abierto:
  // Enter -> Confirma guardado | Escape -> Cierra confirmación
  useEffect(() => {
    if (!showConfirm) return;

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmarGuardado();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [showConfirm, handleConfirmarGuardado]);

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
                <label>Sexo / Género *</label>
                <div
                  className={`gender-toggle-group ${generoError ? "has-error" : ""}`}
                  role="group"
                  aria-label="Seleccionar sexo"
                >
                  <button
                    type="button"
                    className={`gender-toggle-btn ${
                      formData.genero === "Masculino" ? "active masculino" : ""
                    }`}
                    onClick={() => handleSelectGenero("Masculino")}
                  >
                    ♂ Masculino
                  </button>
                  <button
                    type="button"
                    className={`gender-toggle-btn ${
                      formData.genero === "Femenino" ? "active femenino" : ""
                    }`}
                    onClick={() => handleSelectGenero("Femenino")}
                  >
                    ♀ Femenino
                  </button>
                </div>
                {generoError && (
                  <small className="gender-error-text">
                    Selecciona una opción para continuar
                  </small>
                )}
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
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Registro"}
            </button>
          </footer>
        </form>
      </div>

      {/* Cartel de confirmación emergente: Enter confirma, Escape revisa */}
      {showConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content">
            <h3 className="confirm-modal-title">¿Confirmar guardado?</h3>
            <p className="confirm-modal-text">
              ¿Estás seguro de que deseas guardar este registro en la
              congregación? (Enter para confirmar · Esc para revisar)
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="confirm-btn-cancel"
                disabled={isSaving}
              >
                No, revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmarGuardado}
                className="confirm-btn-save"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Sí, guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
