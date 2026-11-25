const db = require("../config/db");

const getOrgId = (req) => req.idOrganizacion ?? req.user?.id_organizacion ?? 1;

// 1. Obtener todos los ministerios de la organización
const getMinisterios = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const [rows] = await db.query(
      "SELECT * FROM ministerios WHERE id_organizacion = ? ORDER BY nombre ASC",
      [idOrganizacion],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ministerios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 2. Obtener los ministerios a los que pertenece una persona específica
const getMinisteriosByPersona = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idPersona } = req.params;
    const query = `
      SELECT m.* 
      FROM ministerios m
      JOIN personas_ministerios pm ON m.id = pm.id_ministerio
      JOIN personas p ON pm.id_persona = p.id
      WHERE pm.id_persona = ?
        AND m.id_organizacion = ?
        AND p.id_organizacion = ?
    `;
    const [rows] = await db.query(query, [
      idPersona,
      idOrganizacion,
      idOrganizacion,
    ]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los ministerios de la persona:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 3. Asignar ministerios a una persona (validando pertenencia a la organización)
const actualizarMinisteriosPersona = async (req, res) => {
  const idOrganizacion = getOrgId(req);
  const { idPersona } = req.params;
  const { ministeriosIds } = req.body;

  if (!Array.isArray(ministeriosIds)) {
    return res
      .status(400)
      .json({ mensaje: "El formato de ministerios debe ser un arreglo." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [personaCheck] = await connection.query(
      "SELECT id FROM personas WHERE id = ? AND id_organizacion = ?",
      [idPersona, idOrganizacion],
    );

    if (personaCheck.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ mensaje: "La persona no pertenece a tu organización." });
    }

    await connection.query(
      "DELETE FROM personas_ministerios WHERE id_persona = ?",
      [idPersona],
    );

    if (ministeriosIds.length > 0) {
      const [validMins] = await connection.query(
        "SELECT id FROM ministerios WHERE id IN (?) AND id_organizacion = ?",
        [ministeriosIds, idOrganizacion],
      );
      const validIds = validMins.map((m) => m.id);

      if (validIds.length > 0) {
        const values = validIds.map((id_ministerio) => [
          idPersona,
          id_ministerio,
        ]);
        await connection.query(
          "INSERT INTO personas_ministerios (id_persona, id_ministerio) VALUES ?",
          [values],
        );
      }
    }

    await connection.commit();
    res.json({ mensaje: "Ministerios actualizados correctamente 👥" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error al actualizar ministerios de la persona:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// 4. Crear un nuevo ministerio o reunión
const crearMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const {
      nombre,
      edad_minima,
      edad_maxima,
      requiere_bautismo,
      es_exclusivo,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ mensaje: "El nombre es obligatorio." });
    }

    const query = `
      INSERT INTO ministerios (id_organizacion, nombre, edad_minima, edad_maxima, requiere_bautismo, es_exclusivo, activo) 
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `;
    await db.query(query, [
      idOrganizacion,
      nombre,
      edad_minima !== undefined && edad_minima !== "" ? Number(edad_minima) : 0,
      edad_maxima !== undefined && edad_maxima !== ""
        ? Number(edad_maxima)
        : null,
      requiere_bautismo ? 1 : 0,
      es_exclusivo ? 1 : 0,
    ]);

    res.status(201).json({ mensaje: "Ministerio creado correctamente 📋" });
  } catch (error) {
    console.error("Error al crear ministerio:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 5. Actualizar el estado o reglas de un ministerio
const actualizarMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { id } = req.params;
    const { nombre, edad_minima, edad_maxima, requiere_bautismo, activo } =
      req.body;

    const query = `
      UPDATE ministerios 
      SET nombre = ?, edad_minima = ?, edad_maxima = ?, requiere_bautismo = ?, activo = ? 
      WHERE id = ? AND id_organizacion = ?
    `;
    const [result] = await db.query(query, [
      nombre,
      edad_minima !== undefined && edad_minima !== "" ? Number(edad_minima) : 0,
      edad_maxima !== undefined && edad_maxima !== ""
        ? Number(edad_maxima)
        : null,
      requiere_bautismo ? 1 : 0,
      activo !== undefined ? Number(activo) : 1,
      id,
      idOrganizacion,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ mensaje: "Ministerio no encontrado en tu organización." });
    }

    res.json({ mensaje: "Ministerio actualizado correctamente ✨" });
  } catch (error) {
    console.error("Error al actualizar ministerio:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 6. Obtener los líderes/profesores asociados a un ministerio específico
const getLideresByMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const query = `
      SELECT DISTINCT p.id, p.nombre, p.apellido 
      FROM personas p
      JOIN ministerio_lideres ml ON p.id = ml.id_persona
      JOIN ministerios m ON ml.id_ministerio = m.id
      WHERE ml.id_ministerio = ?
        AND p.id_organizacion = ?
        AND m.id_organizacion = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [
      ministerioId,
      idOrganizacion,
      idOrganizacion,
    ]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener líderes del ministerio:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 7. Obtener los alumnos/personas a cargo de un líder en un ministerio
const getAlumnosByLider = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idLider, id_lider, idMinisterio, id_ministerio } = req.params;
    const liderId = idLider || id_lider;
    const ministerioId = idMinisterio || id_ministerio;

    const query = `
      SELECT p.id, p.nombre, p.apellido, p.dni, p.fecha_nacimiento 
      FROM personas p
      JOIN lider_grupo_personas lgp ON p.id = lgp.id_persona
      JOIN ministerios m ON lgp.id_ministerio = m.id
      WHERE lgp.id_lider = ? 
        AND lgp.id_ministerio = ?
        AND p.id_organizacion = ?
        AND m.id_organizacion = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [
      liderId,
      ministerioId,
      idOrganizacion,
      idOrganizacion,
    ]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener alumnos del líder:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 8. Asignar un alumno a un líder (con validación de duplicados / traspaso)
const asignarAlumnoLider = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { id_ministerio, idMinisterio, id_lider, idLider } = req.params;
    const ministerioId = id_ministerio || idMinisterio;
    const liderId = id_lider || idLider;
    const { id_persona, confirmarTraspaso } = req.body;

    if (!ministerioId || !liderId || !id_persona) {
      return res.status(400).json({
        mensaje: "Faltan parámetros de ministerio, líder o persona.",
      });
    }

    const [personaValida] = await db.query(
      "SELECT id FROM personas WHERE id = ? AND id_organizacion = ?",
      [id_persona, idOrganizacion],
    );
    const [minValido] = await db.query(
      "SELECT id FROM ministerios WHERE id = ? AND id_organizacion = ?",
      [ministerioId, idOrganizacion],
    );

    if (personaValida.length === 0 || minValido.length === 0) {
      return res
        .status(404)
        .json({
          mensaje: "Persona o ministerio no válido en tu organización.",
        });
    }

    const [existente] = await db.query(
      `SELECT lgp.id_lider, p.nombre, p.apellido 
       FROM lider_grupo_personas lgp
       JOIN personas p ON lgp.id_lider = p.id
       WHERE lgp.id_persona = ? 
         AND lgp.id_ministerio = ?
         AND p.id_organizacion = ?`,
      [id_persona, ministerioId, idOrganizacion],
    );

    if (existente.length > 0) {
      if (!confirmarTraspaso) {
        const nombreLiderActual = `${existente[0].apellido}, ${existente[0].nombre}`;
        return res.status(409).json({
          requiereConfirmacion: true,
          mensaje: `⚠️ Este hermano ya se encuentra asignado a la clase del profesor ${nombreLiderActual}. ¿Deseas realizar el traspaso a esta clase?`,
        });
      }

      await db.query(
        `UPDATE lider_grupo_personas 
         SET id_lider = ? 
         WHERE id_persona = ? AND id_ministerio = ?`,
        [liderId, id_persona, ministerioId],
      );

      return res.json({
        mensaje: "🔄 Alumno traspasado exitosamente a la nueva clase.",
      });
    }

    await db.query(
      `INSERT INTO lider_grupo_personas (id_ministerio, id_lider, id_persona) 
       VALUES (?, ?, ?)`,
      [ministerioId, liderId, id_persona],
    );

    res.json({ mensaje: "¡Alumno asignado a la clase correctamente! ✅" });
  } catch (error) {
    console.error("Error al asignar alumno:", error);
    res
      .status(500)
      .json({ mensaje: `Error interno del servidor: ${error.message}` });
  }
};

// 9. Quitar a un alumno de la clase de un líder
const quitarAlumnoLider = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { id_ministerio, idMinisterio, id_lider, idLider, id_persona } =
      req.params;
    const ministerioId = id_ministerio || idMinisterio;
    const liderId = id_lider || idLider;

    const [personaValida] = await db.query(
      "SELECT id FROM personas WHERE id = ? AND id_organizacion = ?",
      [id_persona, idOrganizacion],
    );

    if (personaValida.length === 0) {
      return res
        .status(404)
        .json({ mensaje: "Persona no encontrada en tu organización." });
    }

    await db.query(
      `DELETE FROM lider_grupo_personas 
       WHERE id_ministerio = ? AND id_lider = ? AND id_persona = ?`,
      [ministerioId, liderId, id_persona],
    );

    res.json({ mensaje: "Alumno removido de la clase correctamente 🗑️" });
  } catch (error) {
    console.error("Error al quitar alumno del líder:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 10. Obtener los líderes designados de un ministerio en configuración
const getLideresConfigByMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const query = `
      SELECT p.id, p.nombre, p.apellido, ml.id as id_asignacion
      FROM ministerio_lideres ml
      JOIN personas p ON ml.id_persona = p.id
      JOIN ministerios m ON ml.id_ministerio = m.id
      WHERE ml.id_ministerio = ?
        AND p.id_organizacion = ?
        AND m.id_organizacion = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [
      ministerioId,
      idOrganizacion,
      idOrganizacion,
    ]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener líderes de configuración:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 11. Asignar un profesor/líder a un ministerio desde configuración
const asignarLiderMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const { id_persona } = req.body;

    if (!id_persona) {
      return res
        .status(400)
        .json({ mensaje: "El ID de la persona es obligatorio." });
    }

    const [personaValida] = await db.query(
      "SELECT id FROM personas WHERE id = ? AND id_organizacion = ?",
      [id_persona, idOrganizacion],
    );
    const [minValido] = await db.query(
      "SELECT id FROM ministerios WHERE id = ? AND id_organizacion = ?",
      [ministerioId, idOrganizacion],
    );

    if (personaValida.length === 0 || minValido.length === 0) {
      return res
        .status(404)
        .json({
          mensaje: "Persona o ministerio no válido en tu organización.",
        });
    }

    await db.query(
      "INSERT INTO ministerio_lideres (id_ministerio, id_persona) VALUES (?, ?)",
      [ministerioId, id_persona],
    );

    res
      .status(201)
      .json({ mensaje: "Profesor asignado al ministerio correctamente 👨‍🏫" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ mensaje: "Esta persona ya es profesor en este ministerio." });
    }
    console.error("Error al asignar profesor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 12. Quitar un profesor/líder de un ministerio
const quitarLiderMinisterio = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);
    const { idMinisterio, id_ministerio, idPersona, id_persona } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const personaId = idPersona || id_persona;

    const [personaValida] = await db.query(
      "SELECT id FROM personas WHERE id = ? AND id_organizacion = ?",
      [personaId, idOrganizacion],
    );

    if (personaValida.length === 0) {
      return res
        .status(404)
        .json({ mensaje: "Persona no encontrada en tu organización." });
    }

    await db.query(
      "DELETE FROM ministerio_lideres WHERE id_ministerio = ? AND id_persona = ?",
      [ministerioId, personaId],
    );
    res.json({ mensaje: "Profesor removido del ministerio correctamente 🗑️" });
  } catch (error) {
    console.error("Error al quitar profesor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 13. Obtener personas activas de un ministerio específico por ID
const getPersonasByMinisterio = async (req, res) => {
  const idOrganizacion = getOrgId(req);
  const { idMinisterio } = req.params;
  try {
    const query = `
      SELECT p.* FROM personas p
      JOIN personas_ministerios pm ON p.id = pm.id_persona
      JOIN ministerios m ON pm.id_ministerio = m.id
      WHERE pm.id_ministerio = ? 
        AND p.activo = 1
        AND p.id_organizacion = ?
        AND m.id_organizacion = ?
    `;

    const [personas] = await db.query(query, [
      idMinisterio,
      idOrganizacion,
      idOrganizacion,
    ]);

    res.json(personas);
  } catch (err) {
    console.error("Error al obtener personas del ministerio:", err);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
};

module.exports = {
  getMinisterios,
  getMinisteriosByPersona,
  actualizarMinisteriosPersona,
  crearMinisterio,
  actualizarMinisterio,
  getLideresByMinisterio,
  getAlumnosByLider,
  asignarAlumnoLider,
  quitarAlumnoLider,
  getLideresConfigByMinisterio,
  asignarLiderMinisterio,
  quitarLiderMinisterio,
  getPersonasByMinisterio,
};
