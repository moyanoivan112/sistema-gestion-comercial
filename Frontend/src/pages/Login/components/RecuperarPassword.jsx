import { useState } from "react";
import api from "../../../services/api";
import "./RecuperarPassword.css";

export default function RecuperarPassword({ onBack }) {
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const dniLimpio = dni.trim();
    const emailLimpio = email.trim();
    const claveLimpia = nuevaPassword.trim();

    if (!dniLimpio || !emailLimpio || !claveLimpia) {
      setError("Completá el DNI, correo electrónico y nueva contraseña.");
      return;
    }

    if (claveLimpia.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/recuperar", {
        dni: dniLimpio,
        email: emailLimpio,
        nueva_password: claveLimpia,
      });

      const data = response.data;

      setMensaje(data.mensaje);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "No se pudo procesar la recuperación";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Sistema Congregacional</h2>
          <strong>
            <p className="login-subtitle">Recuperar Contraseña</p>
          </strong>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mensaje && <div className="alert-success">{mensaje}</div>}
          {error && <div className="error-alert">{error}</div>}

          <div className="form-group">
            <label>DNI</label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ingrese su DNI"
              required
            />
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Verificando..." : "Restablecer Contraseña"}
          </button>

          <div className="login-footer-links recover-footer">
            <button type="button" onClick={onBack} className="btn-back-link">
              ← Volver al Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
