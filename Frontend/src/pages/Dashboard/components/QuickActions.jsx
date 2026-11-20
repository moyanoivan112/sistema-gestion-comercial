import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/common/Icon";
import "./QuickActions.css";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="quick-actions">
      <button className="btn-quick" onClick={() => navigate("/registro")}>
        <span className="quick-action-icon-wrapper">
          <Icon name="agregar-hermano" size={20} />
        </span>
        Nuevo Hermano
      </button>

      <button
        className="btn-quick primary"
        onClick={() => navigate("/asistencia")}
      >
        <span className="quick-action-icon-wrapper">
          <Icon name="asistencia" size={20} />
        </span>
        Tomar Asistencia
      </button>

      <button className="btn-quick" onClick={() => navigate("/estadisticas")}>
        <span className="quick-action-icon-wrapper">
          <Icon name="reportes" size={20} />
        </span>
        Ver Reportes
      </button>
    </div>
  );
}
