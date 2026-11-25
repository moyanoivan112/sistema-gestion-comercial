import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RecuperarPassword from "./components/RecuperarPassword";
import api from "../../services/api";
import "./Login.css";

export default function Login() {
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        nombre_usuario: nombreUsuario.trim(),
        password: password.trim(),
      });

      const data = response.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.usuario));

      if (data.organizacion) {
        localStorage.setItem("organizacion", JSON.stringify(data.organizacion));
        if (data.organizacion.nombre) {
          localStorage.setItem("nombre_iglesia", data.organizacion.nombre);
        }
        window.dispatchEvent(new Event("churchNameChanged"));
      }

      navigate("/inicio");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "No se pudo conectar con el servidor backend";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (isRecovering) {
    return <RecuperarPassword onBack={() => setIsRecovering(false)} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Sistema Congregacional</h2>
          <strong>
            <p className="login-subtitle">Iniciar Sesión</p>
          </strong>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-alert">{error}</div>}

          {isReady && (
            <>
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={loading || !isReady}
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>

          <div className="login-footer-links">
            <a
              href="#recuperar"
              onClick={(e) => {
                e.preventDefault();
                setIsRecovering(true);
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}