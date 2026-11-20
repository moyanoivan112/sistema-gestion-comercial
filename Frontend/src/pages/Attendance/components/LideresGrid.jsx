// src/pages/Attendance/components/LideresGrid.jsx
import "./LideresGrid.css";

export default function LideresGrid({
  ministerio,
  lideres,
  loading,
  onSelectLider,
}) {
  return (
    <div className="lideres-grid-wrapper">
      <h3 className="lideres-grid-title">
        Profesores / Líderes de {ministerio.nombre}
      </h3>
      <p className="lideres-grid-subtitle">
        Selecciona al profesor o líder para ver su clase a cargo:
      </p>

      {loading ? (
        <p className="lideres-state-text">Cargando profesores...</p>
      ) : lideres.length === 0 ? (
        <div className="lideres-empty-card">
          <p className="lideres-empty-text">
            No hay profesores o líderes asignados a este ministerio todavía.
          </p>
        </div>
      ) : (
        <div className="lideres-cards-grid">
          {lideres.map((lider) => (
            <div
              key={lider.id}
              onClick={() => onSelectLider(lider)}
              className="lider-card-item"
            >
              <h4 className="lider-card-name">
                {lider.apellido} {lider.nombre}
              </h4>
              <span className="lider-card-action">Ver Clase y Alumnos →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
