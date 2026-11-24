const db = require("../config/db");

// Función auxiliar para normalizar el campo genero
const normalizarGenero = (valor) => {
  if (valor === "Masculino" || valor === "Femenino") return valor;
  return null;
};

// 1. Obtener todas las personas con su rol del sistema (si lo tienen)
const getPersonas = async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.rol AS rol_sistema, u.nombre_usuario 
      FROM Personas p 
      LEFT JOIN usuarios u ON p.id = u.id_persona
      WHERE p.activo = 1 
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener personas:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 2. Obtener estadísticas generales, operativas y comparativas de asistencia para el Dashboard
const getDashboardStats = async (req, res) => {
  try {
    // 1. Nuevos registros del mes actual
    const [nuevosRows] = await db.query(`
      SELECT COUNT(*) as total 
      FROM Personas 
      WHERE activo = 1 
        AND MONTH(fecha_registro) = MONTH(CURDATE()) 
        AND YEAR(fecha_registro) = YEAR(CURDATE())
    `);

    // 2. Pendientes de mentoría (Miembros activos que NO están en discipulado)
    const [pendientesRows] = await db.query(`
      SELECT COUNT(*) as total 
      FROM Personas 
      WHERE activo = 1 AND (en_discipulado = 0 OR en_discipulado IS NULL)
    `);

    // Función que busca las últimas dos fechas y conteos filtrando por el Nombre del Ministerio
    const getComparativaPorNombre = async (nombreMinisterio) => {
      // Obtenemos las últimas 2 fechas distintas registradas para este ministerio por su nombre
      const [fechas] = await db.query(
        `
        SELECT DISTINCT a.fecha_registro 
        FROM asistencia a
        JOIN ministerios m ON a.id_ministerio = m.id
        WHERE m.nombre LIKE ?
        ORDER BY a.fecha_registro DESC 
        LIMIT 2
      `,
        [`%${nombreMinisterio}%`],
      );

      if (fechas.length === 0) {
        return { actual: 0, anterior: 0, diferencia: 0, tendencia: "igual" };
      }

      const fechaUltima = fechas[0].fecha_registro;
      const fechaAnterior = fechas.length > 1 ? fechas[1].fecha_registro : null;

      // Conteo de presentes en la última fecha
      const [resUltima] = await db.query(
        `
        SELECT COUNT(*) as total 
        FROM asistencia a
        JOIN ministerios m ON a.id_ministerio = m.id
        WHERE a.fecha_registro = ? AND m.nombre LIKE ? AND a.presente = 1
      `,
        [fechaUltima, `%${nombreMinisterio}%`],
      );

      const totalUltima = resUltima[0].total || 0;

      // Conteo de presentes en la fecha anterior (si existe)
      let totalAnterior = 0;
      if (fechaAnterior) {
        const [resAnterior] = await db.query(
          `
          SELECT COUNT(*) as total 
          FROM asistencia a
          JOIN ministerios m ON a.id_ministerio = m.id
          WHERE a.fecha_registro = ? AND m.nombre LIKE ? AND a.presente = 1
        `,
          [fechaAnterior, `%${nombreMinisterio}%`],
        );
        totalAnterior = resAnterior[0].total || 0;
      }

      const diferencia = totalUltima - totalAnterior;
      let tendencia = "igual";
      if (diferencia > 0) tendencia = "subio";
      if (diferencia < 0) tendencia = "bajo";

      return {
        actual: totalUltima,
        anterior: totalAnterior,
        diferencia: Math.abs(diferencia),
        tendencia,
      };
    };

    // Consultamos por los nombres exactos que se muestran en el historial de asistencias
    const cenaDelSenor = await getComparativaPorNombre("Cena del Señor");
    const reunionGeneral = await getComparativaPorNombre("Reunión General");

    res.json({
      nuevosRegistrosMes: nuevosRows[0].total || 0,
      pendientesMentoria: pendientesRows[0].total || 0,
      cenaDelSenor,
      reunionGeneral,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas del dashboard:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// Obtener la tendencia independiente de las últimas reuniones por cada ministerio
const getDashboardAttendanceTrend = async (req, res) => {
  try {
    // 1. Obtener todos los ministerios activos
    const [ministerios] = await db.query(`SELECT id, nombre FROM ministerios`);

    const tendenciasPorMinisterio = {};

    for (const min of ministerios) {
      // 1.1. Obtener el total de personas inscriptas/asignadas a este ministerio
      const [inscritosRows] = await db.query(
        `
        SELECT COUNT(*) as total 
        FROM personas_ministerios 
        WHERE id_ministerio = ?
      `,
        [min.id],
      );
      const totalInscritos = inscritosRows[0]?.total || 0;

      // 2. Para cada ministerio, obtener sus últimas fechas registradas
      const [fechasRows] = await db.query(
        `
        SELECT DISTINCT a.fecha_registro 
        FROM asistencia a
        WHERE a.id_ministerio = ?
        ORDER BY a.fecha_registro DESC 
        LIMIT 6
      `,
        [min.id],
      );

      if (fechasRows.length === 0) {
        tendenciasPorMinisterio[min.nombre] = {
          inscritos: totalInscritos,
          historial: [],
        };
        continue;
      }

      const fechas = fechasRows.map((f) => f.fecha_registro).reverse();
      const historialMinisterio = [];

      for (const fecha of fechas) {
        const fechaObj = new Date(fecha);
        const etiquetaFecha = `${fechaObj.getUTCDate()}/${fechaObj.getUTCMonth() + 1}`;

        // Contar presentes en esa fecha para este ministerio
        const [conteo] = await db.query(
          `
          SELECT COUNT(*) as total 
          FROM asistencia 
          WHERE id_ministerio = ? AND DATE(fecha_registro) = DATE(?) AND presente = 1
        `,
          [min.id, fecha],
        );

        historialMinisterio.push({
          fecha: etiquetaFecha,
          asistentes: conteo[0].total || 0,
          inscritos: totalInscritos, // 👈 Inyectamos el total de inscriptos aquí
        });
      }

      tendenciasPorMinisterio[min.nombre] = historialMinisterio;
    }

    res.json(tendenciasPorMinisterio);
  } catch (error) {
    console.error("Error al obtener tendencias independientes:", error);
    res.status(500).json({ mensaje: "Error interno al cargar tendencias" });
  }
};

// 3. Obtener una persona por ID
const getPersonaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM Personas WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener persona por ID:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 4. Registrar una nueva persona (Con auto-asignación inicial de ministerios)
const createPersona = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      dni,
      email,
      fecha_nacimiento,
      genero,
      direccion,
      telefono,
      contacto_referencia,
      bautizado,
      en_discipulado,
      discipulador,
      fecha_registro,
    } = req.body;

    const generoLimpio = normalizarGenero(genero);

    if (!nombre || !apellido || !fecha_nacimiento || !generoLimpio) {
      return res.status(400).json({
        mensaje:
          "Nombre, apellido, fecha de nacimiento y sexo/género son obligatorios.",
      });
    }

    const fechaLimpiaRegistro = fecha_registro
      ? fecha_registro.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const query = `
      INSERT INTO Personas 
      (nombre, apellido, dni, email, fecha_nacimiento, genero, direccion, telefono, contacto_referencia, bautizado, en_discipulado, discipulador, fecha_registro) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const isBautizadoBool = bautizado ? 1 : 0;

    const [result] = await db.query(query, [
      nombre,
      apellido,
      dni || null,
      email ? email.trim() : null,
      fecha_nacimiento,
      generoLimpio,
      direccion || null,
      telefono || null,
      contacto_referencia || null,
      isBautizadoBool,
      en_discipulado ? 1 : 0,
      en_discipulado ? discipulador || null : null,
      fechaLimpiaRegistro,
    ]);

    const personaId = result.insertId;

    // --- AUTO-ASIGNACIÓN INICIAL DE MINISTERIOS POR EDAD Y BAUTISMO ---
    try {
      const [ministerios] = await db.query(
        "SELECT * FROM ministerios WHERE activo = 1",
      );
      const hoy = new Date();
      const nacimiento = new Date(fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }

      const ministeriosPorDefecto = ministerios.filter((min) => {
        if (min.requiere_bautismo === 1 && !isBautizadoBool) return false;
        const minEdadMin = min.edad_minima ?? 0;
        const minEdadMax = min.edad_maxima ?? 150;
        if (edad < minEdadMin || edad > minEdadMax) return false;
        return true;
      });

      if (ministeriosPorDefecto.length > 0) {
        const values = ministeriosPorDefecto.map((min) => [personaId, min.id]);
        await db.query(
          "INSERT INTO personas_ministerios (id_persona, id_ministerio) VALUES ?",
          [values],
        );
      }
    } catch (autoErr) {
      console.error("Error en auto-asignación de ministerios:", autoErr);
    }
    // -----------------------------------------------------------------

    res.status(201).json({
      id: personaId,
      mensaje: "Persona creada exitosamente 🚀",
    });
  } catch (error) {
    console.error("Error al crear persona:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        mensaje: "Ya existe una persona registrada con ese número de DNI.",
      });
    }
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 5. Actualizar una persona
const updatePersona = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      dni,
      email,
      fecha_nacimiento,
      genero,
      direccion,
      telefono,
      contacto_referencia,
      bautizado,
      en_discipulado,
      discipulador,
      fecha_registro,
    } = req.body;

    const generoLimpio = normalizarGenero(genero);

    const fechaLimpiaNacimiento = fecha_nacimiento
      ? fecha_nacimiento.split("T")[0]
      : null;
    const fechaLimpiaRegistro = fecha_registro
      ? fecha_registro.split("T")[0]
      : new Date().toISOString().split("T")[0];

    const query = `
      UPDATE Personas 
      SET nombre = ?, apellido = ?, dni = ?, email = ?, fecha_nacimiento = ?, genero = ?, direccion = ?, telefono = ?, contacto_referencia = ?, bautizado = ?, en_discipulado = ?, discipulador = ?, fecha_registro = ? 
      WHERE id = ?
    `;

    const [result] = await db.query(query, [
      nombre,
      apellido,
      dni || null,
      email ? email.trim() : null,
      fechaLimpiaNacimiento,
      generoLimpio,
      direccion || null,
      telefono || null,
      contacto_referencia || null,
      bautizado ? 1 : 0,
      en_discipulado ? 1 : 0,
      en_discipulado ? discipulador || null : null,
      fechaLimpiaRegistro,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ mensaje: "Persona no encontrada para actualizar" });
    }

    res.json({ mensaje: "Persona actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar persona:", error);
    res.status(500).json({
      mensaje: "Error al actualizar el registro",
      error: error.message,
    });
  }
};

// 6. Eliminar una persona
const deletePersona = async (req, res) => {
  if (req.user.rol !== "Administrador" && req.user.rol !== "Pastor") {
    return res.status(403).json({
      error: "No tienes permisos de Administrador o Pastor para hacer esto.",
    });
  }

  try {
    const { id } = req.params;
    const query = "UPDATE Personas SET activo = 0 WHERE id = ?";
    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.json({ mensaje: "Persona dada de baja con éxito" });
  } catch (error) {
    console.error("Error al eliminar persona:", error);
    res.status(500).json({ mensaje: "Error al procesar la baja" });
  }
};

// 7. Obtener solo las personas dadas de baja (inactivas)
const getPersonasInactivas = async (req, res) => {
  try {
    const query = `
      SELECT * FROM Personas 
      WHERE activo = 0 
      ORDER BY apellido ASC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener personas inactivas:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 8. Dar de alta nuevamente a una persona (Restaurar)
const reactivarPersona = async (req, res) => {
  try {
    const { id } = req.params;
    const query = "UPDATE Personas SET activo = 1 WHERE id = ?";
    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.json({ mensaje: "Persona dada de alta nuevamente con éxito" });
  } catch (error) {
    console.error("Error al reactivar persona:", error);
    res.status(500).json({ mensaje: "Error al procesar la reactivación" });
  }
};

module.exports = {
  getPersonas,
  getDashboardStats,
  getPersonaById,
  createPersona,
  updatePersona,
  deletePersona,
  getPersonasInactivas,
  reactivarPersona,
  getDashboardAttendanceTrend,
};
