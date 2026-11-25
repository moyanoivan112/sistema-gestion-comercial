import React from "react";
import Icon from "../../../components/common/Icon";
import "./BirthdaysWidget.css";

export default function BirthdaysWidget({ members = [] }) {
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth();
  const diaActual = fechaActual.getDate();
  const anioActual = fechaActual.getFullYear();

  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const nombreMesActual = nombresMeses[mesActual];

  const mesesCortos = [
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

  const getDiaNacimiento = (fechaStr) => {
    const [, , diaStr] = String(fechaStr).split("T")[0].split("-");
    return parseInt(diaStr, 10);
  };

  // Filtrar miembros que cumplen años en el mes actual
  const cumpleaneros = members.filter((member) => {
    if (!member.fecha_nacimiento) return false;
    const [, mesNac] = String(member.fecha_nacimiento).split("T")[0].split("-");
    return parseInt(mesNac, 10) - 1 === mesActual;
  });

  // Ordenar: primero hoy, luego próximos (más cercanos primero), y al final los que ya pasaron
  cumpleaneros.sort((a, b) => {
    const diaA = getDiaNacimiento(a.fecha_nacimiento);
    const diaB = getDiaNacimiento(b.fecha_nacimiento);

    const diffA = diaA - diaActual; // 0 = hoy, > 0 = próximo, < 0 = ya pasó
    const diffB = diaB - diaActual;

    const getPrioridad = (diff) => {
      if (diff === 0) return 0; // Hoy primero
      if (diff > 0) return 1; // Próximos segundo
      return 2; // Pasados al final
    };

    const prioA = getPrioridad(diffA);
    const prioB = getPrioridad(diffB);

    if (prioA !== prioB) return prioA - prioB;

    // Dentro de próximos: menor diferencia primero (mañana antes que en 5 días)
    if (prioA === 1) return diffA - diffB;

    // Dentro de pasados: por día del mes (si preferís el más reciente primero, usá diaB - diaA)
    return diaA - diaB;
  });

  return (
    <article className="widget-card">
      <header className="widget-header">
        <h3 className="birthdays-title">
          <Icon name="Cake" size={24} color="rgb(255, 0, 85)" /> Cumpleaños (
          {nombreMesActual})
        </h3>
      </header>

      {cumpleaneros.length === 0 ? (
        <p className="birthdays-empty-msg">
          No hay cumpleaños registrados este mes.
        </p>
      ) : (
        <ul className="alert-list birthdays-scroll-container">
          {cumpleaneros.map((member) => {
            const [anioNac, mesNac] = String(member.fecha_nacimiento)
              .split("T")[0]
              .split("-");
            const diaNac = getDiaNacimiento(member.fecha_nacimiento);

            const edad = anioActual - parseInt(anioNac, 10);
            const mesCortoStr = mesesCortos[parseInt(mesNac, 10) - 1];

            // Lógica de estado: ¿Ya pasó, es hoy o faltan días?
            const diasFaltantes = diaNac - diaActual;
            const yaPasou = diasFaltantes < 0;
            const esHoy = diasFaltantes === 0;

            return (
              <li
                key={member.id}
                className={`alert-item birthday-item ${yaPasou ? "birthday-passed" : ""}`}
              >
                <div>
                  <span
                    className={`alert-date ${yaPasou ? "date-passed" : ""}`}
                  >
                    {diaNac}{" "}
                    {mesCortoStr.charAt(0).toUpperCase() + mesCortoStr.slice(1)}
                  </span>
                  <span className="alert-text birthday-member-name">
                    {member.nombre} {member.apellido}
                  </span>
                </div>

                <div className="birthday-badges-container">
                  {/* Etiqueta de estado de tiempo */}
                  {esHoy ? (
                    <span className="birthday-badge badge-today">¡Hoy! 🎉</span>
                  ) : yaPasou ? (
                    <span className="birthday-badge badge-passed">Pasó</span>
                  ) : diasFaltantes === 1 ? (
                    <span className="birthday-badge badge-tomorrow">
                      Mañana
                    </span>
                  ) : (
                    <span className="birthday-badge badge-future">
                      Faltan {diasFaltantes} días
                    </span>
                  )}

                  <span className="birthday-badge badge-age">{edad} años</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
