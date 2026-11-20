import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import Icon from "../../../components/common/Icon";
import "./AbsenceAlertWidget.css";

export default function AbsenceAlertWidget() {
  const [ausentes, setAusentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAusencias = async () => {
      try {
        const response = await api.get("/asistencia/ausencias");
        setAusentes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error al cargar alertas de ausencia:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAusencias();
  }, []);

  // Función para formatear la fecha a un estilo legible (ej: "29 sept")
  const formatearFechaLegible = (fechaStr) => {
    if (!fechaStr) return null;
    const [anio, mes, dia] = fechaStr.split("T")[0].split("-");
    const meses = [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ];
    return `${parseInt(dia, 10)} ${meses[parseInt(mes, 10) - 1]}`;
  };

  return (
    <article className="widget-card alert-danger">
      <header className="widget-header">
        <h3>
          <Icon name="alerta" size={24} color="hsl(0, 100%, 50%)" /> Alerta de
          Ausencias
        </h3>
        <span className="badge-danger">Seguimiento</span>
      </header>

      {loading ? (
        <p className="absence-status-msg">Cargando alertas...</p>
      ) : ausentes.length === 0 ? (
        <p className="absence-status-msg success">
          ¡Excelente! No hay ausencias prolongadas este mes.
        </p>
      ) : (
        <ul className="alert-list absence-scroll-container">
          {ausentes.map((item, index) => {
            const fechaFormateada = formatearFechaLegible(
              item.ultima_asistencia,
            );
            const dias = item.dias_ausente;

            // Lógica para el texto de la insignia
            let textoBadge = "";
            if (!dias || dias > 30) {
              textoBadge = "+1 mes ausente";
            } else {
              const semanas = Math.floor(dias / 7);
              textoBadge = `${semanas} sem. ausente`;
            }

            return (
              <li
                key={`${item.id_persona}-${index}`}
                className="alert-item absence-alert-item"
              >
                <div>
                  <span className="alert-text absence-member-name">
                    {item.nombre} {item.apellido}
                  </span>
                  <span className="absence-member-date">
                    {fechaFormateada
                      ? `Última vez el ${fechaFormateada}`
                      : "Sin registros recientes"}
                  </span>
                </div>
                <span className="alert-subtext absence-badge-status">
                  {textoBadge}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
