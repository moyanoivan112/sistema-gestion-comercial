export const obtenerUsuarioActual = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const obtenerRolActual = () => {
  const user = obtenerUsuarioActual();
  return user?.rol || "";
};

export const permisosPorRol = (rol) => {
  const esAdmin = rol === "Administrador";
  const esPastor = rol === "Pastor";
  const esLider = rol === "Líder";

  return {
    rol,
    esAdmin,
    esPastor,
    esLider,
    // Registro / Personas
    puedeVerRegistro: esAdmin || esPastor || esLider,
    puedeCrearEditarPersona: esAdmin || esPastor,
    puedeDarBajaPersona: esAdmin || esPastor,
    puedeVerInactivos: esAdmin || esPastor,
    // Asistencia
    puedeTomarAsistencia: esAdmin || esPastor || esLider,
    puedeAsignarAlumnos: esAdmin || esPastor,
    // Configuración / Sistema
    puedeVerConfiguracion: esAdmin,
  };
};
