import { useState, useEffect } from "react";
import api from "../../../services/api";
import "./GeneralSettings.css";

export default function GeneralSettings() {
  const [nombreIglesia, setNombreIglesia] = useState("ICE Sarmiento 764");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarOrganizacion = async () => {
      const orgStorage = localStorage.getItem("organizacion");
      if (orgStorage) {
        try {
          const parsed = JSON.parse(orgStorage);
          if (parsed?.nombre) setNombreIglesia(parsed.nombre);
          if (parsed?.telefono) setTelefono(parsed.telefono);
          if (parsed?.email) setEmail(parsed.email);
          if (parsed?.direccion) setDireccion(parsed.direccion);
        } catch {
          // Ignorar JSON malformado
        }
      } else {
        const iglesiaGuardada = localStorage.getItem("nombre_iglesia");
        if (iglesiaGuardada) setNombreIglesia(iglesiaGuardada);
      }

      try {
        const { data } = await api.get("/organizacion/actual");
        if (data) {
          setNombreIglesia(data.nombre || "");
          setTelefono(data.telefono || "");
          setEmail(data.email || "");
          setDireccion(data.direccion || "");
          localStorage.setItem("organizacion", JSON.stringify(data));
          if (data.nombre) {
            localStorage.setItem("nombre_iglesia", data.nombre);
          }
        }
      } catch {
        // Si falla la red, mantiene lo guardado localmente
      }
    };

    cargarOrganizacion();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    // Preservamos logo_url y colores si ya vienen configurados desde BD/código
    let orgActual = {};
    try {
      orgActual = JSON.parse(localStorage.getItem("organizacion") || "{}");
    } catch {
      orgActual = {};
    }

    const payload = {
      nombre: nombreIglesia.trim(),
      logo_url: orgActual.logo_url || null,
      color_primario: orgActual.color_primario || null,
      color_secundario: orgActual.color_secundario || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: direccion.trim() || null,
    };

    try {
      const { data } = await api.put("/organizacion/actual", payload);
      const orgActualizada = data.organizacion || payload;

      localStorage.setItem("organizacion", JSON.stringify(orgActualizada));
      localStorage.setItem("nombre_iglesia", payload.nombre);
      window.dispatchEvent(new Event("churchNameChanged"));

      alert("¡Información de la institución guardada con éxito!");
    } catch (err) {
      localStorage.setItem("nombre_iglesia", payload.nombre);
      window.dispatchEvent(new Event("churchNameChanged"));
      const msg =
        err.response?.data?.error ||
        "No se pudo guardar en el servidor, pero se actualizó localmente.";
      alert(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="general-settings-card">
      <h3 className="general-settings-title">Información de la Institución</h3>
      <form onSubmit={handleGuardar} className="general-settings-form">
        <div className="general-form-group">
          <label className="general-form-label">
            Nombre de la Institución:
          </label>
          <input
            type="text"
            value={nombreIglesia}
            onChange={(e) => setNombreIglesia(e.target.value)}
            className="general-form-input"
            required
          />
        </div>

        <div className="general-form-group">
          <label className="general-form-label">Teléfono (opcional):</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="general-form-input"
          />
        </div>

        <div className="general-form-group">
          <label className="general-form-label">
            Correo electrónico (opcional):
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="general-form-input"
          />
        </div>

        <div className="general-form-group">
          <label className="general-form-label">Dirección (opcional):</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="general-form-input"
          />
        </div>

        <button
          type="submit"
          className="general-submit-btn"
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
}
