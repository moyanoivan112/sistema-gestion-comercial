// src/pages/Attendance/components/AttendanceCards.jsx
import portadaCena from "../../../assets/portadas/cena-del-senor.jpg";
import portadaEscuela from "../../../assets/portadas/escuela-biblica.jpg";
import portadaPreAdolescentes from "../../../assets/portadas/pre-adolescentes.jpg";
import portadaJovenes from "../../../assets/portadas/reunion-jovenes.jpg";
import portadaOracion from "../../../assets/portadas/reunion-oracion.jpg";
import portadaGeneral from "../../../assets/portadas/reunion-general.jpg";
import "./AttendanceCards.css";

export default function AttendanceCards({ ministerios, onSelect }) {
  const fechaActual = new Date().toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const getPortada = (nombre) => {
    const n = nombre.toLowerCase();
    if (n.includes("cena")) return portadaCena;
    if (n.includes("bíblica") || n.includes("biblica")) return portadaEscuela;
    if (n.includes("adolescentes")) return portadaPreAdolescentes;
    if (n.includes("jóvenes") || n.includes("jovenes")) return portadaJovenes;
    if (n.includes("oración") || n.includes("oracion")) return portadaOracion;
    return portadaGeneral;
  };

  return (
    <div className="attendance-cards-wrapper">
      {/* Cabecera con título y etiqueta estática de la fecha */}
      <div className="attendance-cards-header">
        <div>
          <h3 className="attendance-cards-title">
            Selecciona el Grupo o Reunión
          </h3>
          <p className="attendance-cards-subtitle">
            Haz clic en una tarjeta para comenzar a tomar asistencia.
          </p>
        </div>

        {/* Etiqueta estática (badge) */}
        <div className="attendance-date-badge">
          <span>📅</span>
          <span>{fechaActual}</span>
        </div>
      </div>

      {/* Grilla de tarjetas */}
      <div className="attendance-cards-grid">
        {ministerios.map((min) => (
          <div
            key={min.id}
            onClick={() => onSelect(min)}
            className="attendance-card-item"
          >
            {/* Imagen Grande de Portada de Lado a Lado */}
            <div className="attendance-card-image-container">
              <img
                src={getPortada(min.nombre)}
                alt={min.nombre}
                className="attendance-card-img"
              />
            </div>

            {/* Contenido compacto sin espacios libres excesivos */}
            <div className="attendance-card-content">
              <div>
                <h4 className="attendance-card-name">{min.nombre}</h4>
                <p className="attendance-card-meta">
                  {min.requiere_bautismo
                    ? "🔒 Requiere Bautismo"
                    : "👥 Abierto a todos"}
                </p>
              </div>

              <span className="attendance-card-action">Tomar Asistencia →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
