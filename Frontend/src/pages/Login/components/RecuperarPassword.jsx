// src/pages/Login/components/RecuperarPassword.jsx
import { useState } from "react";
import api from "../../../services/api"; // Instancia centralizada de axios
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
    setLoading(true);

    try {
      const response = await api.post("/auth/recuperar", {
        dni: dni.trim(),
        email: email.trim(),
        nueva_password: nuevaPassword.trim(),
      });

      const data = response.data;

      setMensaje(data.mensaje);
      setTimeout(() => {
        onBack(); // Regresa al login tras 2 segundos
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
        {/* Cabecera institucional idéntica al Login */}
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
              placeholder="Ingrese la nueva contraseña"
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
