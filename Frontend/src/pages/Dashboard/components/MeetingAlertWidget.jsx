import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/common/Icon";
import api from "../../../services/api";
import "./MeetingAlertWidget.css";

export default function MeetingAlertWidget() {
  const navigate = useNavigate();
  const [asistenciasTomadasHoy, setAsistenciasTomadasHoy] = useState({});
  const [loading, setLoading] = useState(true);

  // Obtener el día actual de la semana (0: Domingo, 3: Miércoles, 6: Sábado, etc.)
  const hoy = new Date();
  const diaSemana = hoy.getDay();

  // Definir las reuniones según el día de la semana solicitado
  let reunionesHoy = [];

  if (diaSemana === 3) {
    // Miércoles
    reunionesHoy = [
      { id: "oracion", nombre: "Reunión de Oración", ministerioId: null },
    ];
  } else if (diaSemana === 6) {
    // Sábados (Pre-Adolescentes, Escuelita, Jóvenes)
    reunionesHoy = [
      {
        id: "pre_adolescentes",
        nombre: "Pre Adolescentes",
        ministerioId: null,
      },
      { id: "escuela_biblica", nombre: "Escuela Bíblica", ministerioId: null },
      {
        id: "reunion_jovenes",
        nombre: "Reunión de Jóvenes",
        ministerioId: null,
      },
    ];
  } else if (diaSemana === 0) {
    // Domingos (Cena del Señor, Reunión General)
    reunionesHoy = [
      { id: "cena_senor", nombre: "Cena del Señor", ministerioId: null },
      { id: "reunion_general", nombre: "Reunión General", ministerioId: null },
    ];
  }

  // Verificar en la base de datos si ya se tomó asistencia hoy para estas reuniones
  useEffect(() => {
    const verificarAsistenciasHoy = async () => {
      try {
        const fechaHoyStr = hoy.toISOString().split("T")[0];
        // Consultamos el historial o el estado de asistencia de hoy
        const res = await api.get(`/personas/dashboard/trend`);
        setLoading(false);
      } catch (err) {
        console.error("Error al verificar asistencia diaria:", err);
        setLoading(false);
      }
    };

    verificarAsistenciasHoy();
  }, []);

  // Función para marcar como tomada y redirigir al módulo de asistencia
  const handleIrAAsistencia = (reunion) => {
    // Marcamos localmente como tomada para que el botón cambie de estado inmediatamente
    setAsistenciasTomadasHoy((prev) => ({ ...prev, [reunion.id]: true }));
    // Redirige al módulo de Asistencia
    navigate("/asistencia");
  };

  // Si el día de hoy no hay reuniones configuradas, mostrar mensaje de día de descanso
  if (reunionesHoy.length === 0) {
    return (
      <div className="meeting-widget-card meeting-empty-card">
        <div className="meeting-empty-icon-wrapper">
          <Icon name="calendario" size={24} color="#64748b" />
        </div>
        <div>
          <h4 className="meeting-empty-title">Agenda Diaria al Día</h4>
          <p className="meeting-empty-text">
            No hay reuniones programadas para el día de hoy. ¡Buen trabajo en el
            seguimiento semanal!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-widget-card">
      <div className="meeting-widget-header-top">
        <span className="meeting-bell-wrapper">
          <span className="meeting-bell-icon">🔔</span>
        </span>
        <div>
          <h3 className="meeting-main-title">Alertas de Asistencia para Hoy</h3>
          <p className="meeting-main-subtitle">
            Reuniones pendientes correspondientes a la jornada de hoy.
          </p>
        </div>
      </div>

      <div className="meeting-list-container">
        {reunionesHoy.map((reunion) => {
          const tomada = asistenciasTomadasHoy[reunion.id];

          return (
            <div
              key={reunion.id}
              className={`meeting-item-row ${tomada ? "taken" : "pending"}`}
            >
              <div>
                <strong className="meeting-item-name">{reunion.nombre}</strong>
                <span
                  className={`meeting-item-status ${tomada ? "status-taken" : "status-pending"}`}
                >
                  {tomada
                    ? "✔ Asistencia tomada"
                    : "⚠ Pendiente de registrar asistencia"}
                </span>
              </div>

              <button
                onClick={() => handleIrAAsistencia(reunion)}
                className={`meeting-action-btn ${tomada ? "btn-taken" : "btn-pending"}`}
              >
                {tomada ? "Modificar Asistencia" : "Tomar Asistencia ➔"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
