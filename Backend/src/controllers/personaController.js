const db = require("../config/db");

const getOrgId = (req) => req.idOrganizacion ?? req.user?.id_organizacion ?? 1;

// Función auxiliar para normalizar el campo genero
const normalizarGenero = (valor) => {
  if (valor === "Masculino" || valor === "Femenino") return valor;
  return null;
};

// 1. Obtener todas las personas de la organización con su rol del sistema (si lo tienen)
const getPersonas = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const query = `
      SELECT p.*, u.rol AS rol_sistema, u.nombre_usuario 
      FROM personas p 
      LEFT JOIN usuarios u 
        ON p.id = u.id_persona AND u.id_organizacion = ?
      WHERE p.activo = 1 AND p.id_organizacion = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [idOrganizacion, idOrganizacion]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener personas:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 2. Obtener estadísticas generales, operativas y comparativas de asistencia para el Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);

    // 1. Nuevos registros del mes actual
    const [nuevosRows] = await db.query(
      `
      SELECT COUNT(*) as total 
      FROM personas 
      WHERE activo = 1 
        AND id_organizacion = ?
        AND MONTH(fecha_registro) = MONTH(CURDATE()) 
        AND YEAR(fecha_registro) = YEAR(CURDATE())
    `,
      [idOrganizacion],
    );

    // 2. Pendientes de mentoría (Miembros activos que NO están en discipulado)
    const [pendientesRows] = await db.query(
      `
      SELECT COUNT(*) as total 
      FROM personas 
      WHERE activo = 1 
        AND id_organizacion = ?
        AND (en_discipulado = 0 OR en_discipulado IS NULL)
    `,
      [idOrganizacion],
    );

    // Función que busca las últimas dos fechas y conteos filtrando por el Nombre del Ministerio
    const getComparativaPorNombre = async (nombreMinisterio) => {
      const [fechas] = await db.query(
        `
        SELECT DISTINCT a.fecha_registro 
        FROM asistencia a
        JOIN ministerios m ON a.id_ministerio = m.id
        WHERE m.nombre LIKE ?
          AND a.id_organizacion = ?
          AND m.id_organizacion = ?
        ORDER BY a.fecha_registro DESC 
        LIMIT 2
      `,
        [`%${nombreMinisterio}%`, idOrganizacion, idOrganizacion],
      );

      if (fechas.length === 0) {
        return { actual: 0, anterior: 0, diferencia: 0, tendencia: "igual" };
      }

      const fechaUltima = fechas[0].fecha_registro;
      const fechaAnterior = fechas.length > 1 ? fechas[1].fecha_registro : null;

      const [resUltima] = await db.query(
        `
        SELECT COUNT(*) as total 
        FROM asistencia a
        JOIN ministerios m ON a.id_ministerio = m.id
        WHERE a.fecha_registro = ? 
          AND m.nombre LIKE ? 
          AND a.presente = 1
          AND a.id_organizacion = ?
          AND m.id_organizacion = ?
      `,
        [fechaUltima, `%${nombreMinisterio}%`, idOrganizacion, idOrganizacion],
      );

      const totalUltima = resUltima[0].total || 0;

      let totalAnterior = 0;
      if (fechaAnterior) {
        const [resAnterior] = await db.query(
          `
          SELECT COUNT(*) as total 
          FROM asistencia a
          JOIN ministerios m ON a.id_ministerio = m.id
          WHERE a.fecha_registro = ? 
            AND m.nombre LIKE ? 
            AND a.presente = 1
            AND a.id_organizacion = ?
            AND m.id_organizacion = ?
        `,
          [
            fechaAnterior,
            `%${nombreMinisterio}%`,
            idOrganizacion,
            idOrganizacion,
          ],
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
    const idOrganizacion = getOrgId(req);
    const [ministerios] = await db.query(
      `SELECT id, nombre FROM ministerios WHERE id_organizacion = ?`,
      [idOrganizacion],
    );

    const tendenciasPorMinisterio = {};

    for (const min of ministerios) {
      const [inscritosRows] = await db.query(
        `
        SELECT COUNT(*) as total 
        FROM personas_ministerios pm
        JOIN personas p ON pm.id_persona = p.id
        WHERE pm.id_ministerio = ?
          AND p.id_organizacion = ?
          AND p.activo = 1
      `,
        [min.id, idOrganizacion],
      );
      const totalInscritos = inscritosRows[0]?.total || 0;

      const [fechasRows] = await db.query(
        `
        SELECT DISTINCT a.fecha_registro 
        FROM asistencia a
        WHERE a.id_ministerio = ? AND a.id_organizacion = ?
        ORDER BY a.fecha_registro DESC 
        LIMIT 6
      `,
        [min.id, idOrganizacion],
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

        const [conteo] = await db.query(
          `
          SELECT COUNT(*) as total 
          FROM asistencia 
          WHERE id_ministerio = ? 
            AND id_organizacion = ?
            AND DATE(fecha_registro) = DATE(?) 
            AND presente = 1
        `,
          [min.id, idOrganizacion, fecha],
        );

        historialMinisterio.push({
          fecha: etiquetaFecha,
          asistentes: conteo[0].total || 0,
          inscritos: totalInscritos,
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

// 3. Obtener una persona por ID dentro de la organización
const getPersonaById = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM personas WHERE id = ? AND id_organizacion = ?",
      [id, idOrganizacion],
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener persona por ID:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 4. Registrar una nueva persona (Con auto-asignación inicial de ministerios de la organización)
const createPersona = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
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
      INSERT INTO personas 
      (id_organizacion, nombre, apellido, dni, email, fecha_nacimiento, genero, direccion, telefono, contacto_referencia, bautizado, en_discipulado, discipulador, fecha_registro) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const isBautizadoBool = bautizado ? 1 : 0;

    const [result] = await db.query(query, [
      idOrganizacion,
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
        "SELECT * FROM ministerios WHERE activo = 1 AND id_organizacion = ?",
        [idOrganizacion],
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

// 5. Actualizar una persona dentro de la organización
const updatePersona = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
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
      UPDATE personas 
      SET nombre = ?, apellido = ?, dni = ?, email = ?, fecha_nacimiento = ?, genero = ?, direccion = ?, telefono = ?, contacto_referencia = ?, bautizado = ?, en_discipulado = ?, discipulador = ?, fecha_registro = ? 
      WHERE id = ? AND id_organizacion = ?
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
      idOrganizacion,
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

// 6. Dar de baja a una persona dentro de la organización
const deletePersona = async (req, res) => {
  if (req.user.rol !== "Administrador" && req.user.rol !== "Pastor") {
    return res.status(403).json({
      error: "No tienes permisos de Administrador o Pastor para hacer esto.",
    });
  }

  try {
    const idOrganizacion = getOrgId(req);
    const { id } = req.params;
    const query =
      "UPDATE personas SET activo = 0 WHERE id = ? AND id_organizacion = ?";
    const [result] = await db.query(query, [id, idOrganizacion]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.json({ mensaje: "Persona dada de baja con éxito" });
  } catch (error) {
    console.error("Error al eliminar persona:", error);
    res.status(500).json({ mensaje: "Error al procesar la baja" });
  }
};

// 7. Obtener solo las personas dadas de baja (inactivas) de la organización
const getPersonasInactivas = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const query = `
      SELECT * FROM personas 
      WHERE activo = 0 AND id_organizacion = ?
      ORDER BY apellido ASC
    `;
    const [rows] = await db.query(query, [idOrganizacion]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener personas inactivas:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 8. Dar de alta nuevamente a una persona (Restaurar) dentro de la organización
const reactivarPersona = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { id } = req.params;
    const query =
      "UPDATE personas SET activo = 1 WHERE id = ? AND id_organizacion = ?";
    const [result] = await db.query(query, [id, idOrganizacion]);

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
