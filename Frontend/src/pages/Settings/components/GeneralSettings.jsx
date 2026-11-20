// src/pages/Settings/components/GeneralSettings.jsx
import { useState, useEffect } from "react";
import "./GeneralSettings.css";

export default function GeneralSettings() {
  const [nombreIglesia, setNombreIglesia] = useState("ICE Sarmiento 764");

  // Al cargar, recuperamos el nombre guardado previamente si existe
  useEffect(() => {
    const iglesiaGuardada = localStorage.getItem("nombre_iglesia");
    if (iglesiaGuardada) {
      setNombreIglesia(iglesiaGuardada);
    }
  }, []);

  const handleGuardar = (e) => {
    e.preventDefault();

    // Guardamos en localStorage
    localStorage.setItem("nombre_iglesia", nombreIglesia);

    // Disparamos un evento personalizado para que el Sidebar se entere del cambio al instante
    window.dispatchEvent(new Event("churchNameChanged"));

    alert("¡Nombre de la iglesia actualizado con éxito!");
  };

  return (
    <div className="general-settings-card">
      <h3 className="general-settings-title">Información de la Institución</h3>
      <form onSubmit={handleGuardar} className="general-settings-form">
        <div className="general-form-group">
          <label className="general-form-label">Nombre de la Iglesia:</label>
          <input
            type="text"
            value={nombreIglesia}
            onChange={(e) => setNombreIglesia(e.target.value)}
            className="general-form-input"
            required
          />
        </div>
        <button type="submit" className="general-submit-btn">
          Guardar Cambios
        </button>
      </form>
    </div>
  );
}
