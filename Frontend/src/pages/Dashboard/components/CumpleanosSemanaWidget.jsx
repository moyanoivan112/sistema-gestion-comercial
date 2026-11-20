import React from "react";
import Icon from "../../../components/common/Icon";
import "./BirthdaysWidget.css"; // Puedes reutilizar los mismos estilos o crear unos propios

export default function CumpleanosUltimaSemanaWidget({ members = [] }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const anioActual = hoy.getFullYear();

  // Calcular el rango de la última semana (desde hace 7 días hasta ayer / hoy)
  const hace7Dias = new Date(hoy);
  hace7Dias.setDate(hoy.getDate() - 7);

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

  // Filtrar miembros que cumplieron años en los últimos 7 días
  const cumpleañerosRecientes = members.filter((member) => {
    if (!member.fecha_nacimiento) return false;
    const [anioNac, mesNac, diaNacStr] = member.fecha_nacimiento
      .split("T")[0]
      .split("-");
    const mesNacNum = parseInt(mesNac, 10) - 1;
    const diaNac = parseInt(diaNacStr, 10);

    // Fecha de cumpleaños en el año actual
    const fechaCumpleEsteAnio = new Date(anioActual, mesNacNum, diaNac);
    fechaCumpleEsteAnio.setHours(0, 0, 0, 0);

    // Incluye desde hace 7 días hasta hoy inclusive (o puedes ajustar si solo quieres días pasados)
    return fechaCumpleEsteAnio >= hace7Dias && fechaCumpleEsteAnio <= hoy;
  });

  // Ordenar del más reciente al más antiguo de la semana
  cumpleañerosRecientes.sort((a, b) => {
    const [_, mesA, diaA] = a.fecha_nacimiento.split("T")[0].split("-");
    const [__, mesB, diaB] = b.fecha_nacimiento.split("T")[0].split("-");
    const dateA = new Date(
      anioActual,
      parseInt(mesA, 10) - 1,
      parseInt(diaA, 10),
    );
    const dateB = new Date(
      anioActual,
      parseInt(mesB, 10) - 1,
      parseInt(diaB, 10),
    );
    return dateB - dateA; // Orden descendente (los más cercanos a hoy primero)
  });

  return (
    <article className="widget-card">
      <header className="widget-header">
        <h3 className="birthdays-title">
          <Icon name="cumpleanos" size={22} color="rgb(255, 140, 0)" />{" "}
          Cumpleaños a celebrar
        </h3>
      </header>

      {cumpleañerosRecientes.length === 0 ? (
        <p className="birthdays-empty-msg">
          No hubo cumpleaños en los últimos 7 días para celebrar este fin de
          semana.
        </p>
      ) : (
        <ul className="alert-list birthdays-scroll-container">
          {cumpleañerosRecientes.map((member) => {
            const [anioNac, mesNac, diaNacStr] = member.fecha_nacimiento
              .split("T")[0]
              .split("-");
            const diaNac = parseInt(diaNacStr, 10);
            let edad = anioActual - parseInt(anioNac, 10);
            const mesCortoStr = mesesCortos[parseInt(mesNac, 10) - 1];

            const fechaCumpleObj = new Date(
              anioActual,
              parseInt(mesNac, 10) - 1,
              diaNac,
            );
            fechaCumpleObj.setHours(0, 0, 0, 0);

            const diffTime = hoy.getTime() - fechaCumpleObj.getTime();
            const diasPasados = Math.round(diffTime / (1000 * 60 * 60 * 24));

            return (
              <li key={member.id} className="alert-item birthday-item">
                <div>
                  <span className="alert-date">
                    {diaNac}{" "}
                    {mesCortoStr.charAt(0).toUpperCase() + mesCortoStr.slice(1)}
                  </span>
                  <span className="alert-text birthday-member-name">
                    {member.nombre} {member.apellido}
                  </span>
                </div>

                <div className="birthday-badges-container">
                  <span className="birthday-badge badge-passed">
                    {diasPasados === 0
                      ? "¡Fue hoy!"
                      : diasPasados === 1
                        ? "Ayer"
                        : `Hace ${diasPasados} días`}
                  </span>
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
