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

  // Filtrar miembros que cumplen años en el mes actual
  const cumpleañeros = members.filter((member) => {
    if (!member.fecha_nacimiento) return false;
    const [_, mesNac] = member.fecha_nacimiento.split("T")[0].split("-");
    return parseInt(mesNac, 10) - 1 === mesActual;
  });

  // Ordenar por día del mes
  cumpleañeros.sort((a, b) => {
    const diaA = parseInt(a.fecha_nacimiento.split("-")[2], 10);
    const diaB = parseInt(b.fecha_nacimiento.split("-")[2], 10);
    return diaA - diaB;
  });

  return (
    <article className="widget-card">
      <header className="widget-header">
        <h3 className="birthdays-title">
          <Icon name="cumpleanos" size={24} color="rgb(255, 0, 85)" />{" "}
          Cumpleaños ({nombreMesActual})
        </h3>
      </header>

      {cumpleañeros.length === 0 ? (
        <p className="birthdays-empty-msg">
          No hay cumpleaños registrados este mes.
        </p>
      ) : (
        <ul className="alert-list birthdays-scroll-container">
          {cumpleañeros.map((member) => {
            const [anioNac, mesNac, diaNacStr] = member.fecha_nacimiento
              .split("T")[0]
              .split("-");
            const diaNac = parseInt(diaNacStr, 10);

            let edad = anioActual - parseInt(anioNac, 10);
            const mesCortoStr = mesesCortos[parseInt(mesNac, 10) - 1];

            // Lógica de estado: ¿Ya pasó, es hoy o faltan días?
            const yaPasou = diaNac < diaActual;
            const esHoy = diaNac === diaActual;
            const diasFaltantes = diaNac - diaActual;

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
