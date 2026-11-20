// src/pages/Registry/InactiveMembers.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import "./InactiveMembers.css";

export default function InactiveMembers({ onBack }) {
  const [inactivas, setInactivas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInactivas = async () => {
    try {
      const response = await api.get("/personas/inactivas");
      setInactivas(response.data);
    } catch (error) {
      console.error("Error al cargar inactivos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactivas();
  }, []);

  const handleReactivar = async (id) => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas dar de alta a esta persona nuevamente?",
      )
    ) {
      return;
    }

    try {
      await api.put(`/personas/reactivar/${id}`);
      setInactivas(inactivas.filter((person) => person.id !== id));
      alert("¡Persona dada de alta con éxito!");
    } catch (error) {
      console.error("Error al reactivar:", error);
      alert("No se pudo dar de alta a la persona.");
    }
  };

  return (
    <div className="inactive-module">
      <div className="inactive-header-container">
        <h3 className="inactive-title">Miembros Inactivos (Dados de Baja)</h3>
        <p className="inactive-subtitle">
          Aquí puedes visualizar el historial de personas dadas de baja y
          reactivarlas si es necesario.
        </p>
      </div>

      {loading ? (
        <p className="inactive-state-text">Cargando registros inactivos...</p>
      ) : inactivas.length === 0 ? (
        <div className="inactive-empty-card">
          <p className="inactive-empty-text">
            No hay miembros dados de baja en este momento.
          </p>
        </div>
      ) : (
        <div className="inactive-table-card">
          <div className="table-responsive">
            <table className="inactive-table">
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {inactivas.map((person) => (
                  <tr key={person.id} className="inactive-table-row">
                    <td className="inactive-col-name">
                      {person.nombre} {person.apellido}
                    </td>
                    <td className="inactive-col-info">{person.dni || "N/D"}</td>
                    <td className="inactive-col-info">
                      {person.telefono || "N/D"}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleReactivar(person.id)}
                        className="inactive-reactivate-btn"
                      >
                        Dar de Alta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
