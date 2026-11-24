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

  const normalizar = (texto = "") =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const getPortada = (nombre) => {
    const n = normalizar(nombre);
    if (n.includes("cena")) return portadaCena;
    if (n.includes("biblica")) return portadaEscuela;
    if (n.includes("pre") && n.includes("adolescentes")) {
      return portadaPreAdolescentes;
    }
    if (n.includes("jovenes")) return portadaJovenes;
    if (n.includes("oracion")) return portadaOracion;
    return portadaGeneral;
  };

  const getMetaMinisterio = (min) => {
    const tieneMin =
      min.edad_minima !== null &&
      min.edad_minima !== undefined &&
      min.edad_minima !== "";
    const tieneMax =
      min.edad_maxima !== null &&
      min.edad_maxima !== undefined &&
      min.edad_maxima !== "";

    const edadMin = tieneMin ? Number(min.edad_minima) : null;
    const edadMax = tieneMax ? Number(min.edad_maxima) : null;

    // Prioriza el rango de edad si está configurado en el ministerio
    if (edadMin !== null && edadMax !== null) {
      return `🎂 De ${edadMin} años a ${edadMax} años`;
    }
    if (edadMin !== null && edadMin > 0) {
      return `🎂 Desde los ${edadMin} años`;
    }
    if (edadMax !== null && edadMax > 0) {
      return `🎂 Hasta los ${edadMax} años`;
    }

    // Si no tiene límite de edad, evalúa bautismo o reunión abierta
    if (min.requiere_bautismo) {
      return "🔒 Requiere Bautismo";
    }

    return "👥 Abierto a todos";
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
                <p className="attendance-card-meta">{getMetaMinisterio(min)}</p>
              </div>

              <span className="attendance-card-action">Tomar Asistencia →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
