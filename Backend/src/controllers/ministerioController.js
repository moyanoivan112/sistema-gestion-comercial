const db = require("../config/db");

// 1. Obtener todos los ministerios
const getMinisterios = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM ministerios ORDER BY nombre ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ministerios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 2. Obtener los ministerios a los que pertenece una persona específica (estrictamente por lo guardado / excepciones manuales)
const getMinisteriosByPersona = async (req, res) => {
  try {
    const { idPersona } = req.params;
    const query = `
      SELECT m.* 
      FROM ministerios m
      JOIN personas_ministerios pm ON m.id = pm.id_ministerio
      WHERE pm.id_persona = ?
    `;
    const [rows] = await db.query(query, [idPersona]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener los ministerios de la persona:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 3. Asignar ministerios a una persona (Sincronizar / Reemplazar o Agregar)
const actualizarMinisteriosPersona = async (req, res) => {
  try {
    const { idPersona } = req.params;
    const { ministeriosIds } = req.body; // Array de IDs de ministerios, ej: [1, 3]

    if (!Array.isArray(ministeriosIds)) {
      return res
        .status(400)
        .json({ mensaje: "El formato de ministerios debe ser un arreglo." });
    }

    // Primero eliminamos las asignaciones anteriores para evitar duplicados y actualizar limpiamente
    await db.query("DELETE FROM personas_ministerios WHERE id_persona = ?", [
      idPersona,
    ]);

    // Luego insertamos las nuevas selecciones si existen
    if (ministeriosIds.length > 0) {
      const values = ministeriosIds.map((id_ministerio) => [
        idPersona,
        id_ministerio,
      ]);
      const insertQuery =
        "INSERT INTO personas_ministerios (id_persona, id_ministerio) VALUES ?";
      await db.query(insertQuery, [values]);
    }

    res.json({ mensaje: "Ministerios actualizados correctamente 👥" });
  } catch (error) {
    console.error("Error al actualizar ministerios de la persona:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 4. Crear un nuevo ministerio o reunión
const crearMinisterio = async (req, res) => {
  try {
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
      INSERT INTO ministerios (nombre, edad_minima, edad_maxima, requiere_bautismo, es_exclusivo, activo) 
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    await db.query(query, [
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

// 5. Actualizar el estado o reglas de un ministerio (incluyendo desactivar / activar)
const actualizarMinisterio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, edad_minima, edad_maxima, requiere_bautismo, activo } =
      req.body;

    const query = `
      UPDATE ministerios 
      SET nombre = ?, edad_minima = ?, edad_maxima = ?, requiere_bautismo = ?, activo = ? 
      WHERE id = ?
    `;
    await db.query(query, [
      nombre,
      edad_minima !== undefined && edad_minima !== "" ? Number(edad_minima) : 0,
      edad_maxima !== undefined && edad_maxima !== ""
        ? Number(edad_maxima)
        : null,
      requiere_bautismo ? 1 : 0,
      activo !== undefined ? Number(activo) : 1,
      id,
    ]);

    res.json({ mensaje: "Ministerio actualizado correctamente ✨" });
  } catch (error) {
    console.error("Error al actualizar ministerio:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 6. Obtener los líderes/profesores asociados a un ministerio específico
const getLideresByMinisterio = async (req, res) => {
  try {
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const query = `
      SELECT DISTINCT p.id, p.nombre, p.apellido 
      FROM personas p
      JOIN ministerio_lideres ml ON p.id = ml.id_persona
      WHERE ml.id_ministerio = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [ministerioId]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener líderes del ministerio:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 7. Obtener los alumnos/personas a cargo de un líder en un ministerio
const getAlumnosByLider = async (req, res) => {
  try {
    const { idLider, id_lider, idMinisterio, id_ministerio } = req.params;
    const liderId = idLider || id_lider;
    const ministerioId = idMinisterio || id_ministerio;

    const query = `
      SELECT p.id, p.nombre, p.apellido, p.dni, p.fecha_nacimiento 
      FROM personas p
      JOIN lider_grupo_personas lgp ON p.id = lgp.id_persona
      WHERE lgp.id_lider = ? AND lgp.id_ministerio = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [liderId, ministerioId]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener alumnos del líder:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 8. Asignar un alumno a un líder (con validación de duplicados / traspaso)
const asignarAlumnoLider = async (req, res) => {
  try {
    const { id_ministerio, idMinisterio, id_lider, idLider } = req.params;
    const ministerioId = id_ministerio || idMinisterio;
    const liderId = id_lider || idLider;
    const { id_persona, confirmarTraspaso } = req.body;

    if (!ministerioId || !liderId) {
      return res.status(400).json({
        mensaje: "Faltan parámetros de ministerio o líder en la URL.",
      });
    }

    // 1. Verificar si ya está asignado a otro líder en este ministerio
    const [existente] = await db.query(
      `SELECT la.id_lider, p.nombre, p.apellido 
       FROM lider_grupo_personas la
       JOIN personas p ON la.id_lider = p.id
       WHERE la.id_persona = ? AND la.id_ministerio = ?`,
      [id_persona, ministerioId],
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
    const { id_ministerio, idMinisterio, id_lider, idLider, id_persona } =
      req.params;
    const ministerioId = id_ministerio || idMinisterio;
    const liderId = id_lider || idLider;

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
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const query = `
      SELECT p.id, p.nombre, p.apellido, ml.id as id_asignacion
      FROM ministerio_lideres ml
      JOIN personas p ON ml.id_persona = p.id
      WHERE ml.id_ministerio = ?
      ORDER BY p.apellido ASC
    `;
    const [rows] = await db.query(query, [ministerioId]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener líderes de configuración:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 11. Asignar un profesor/líder a un ministerio desde configuración
const asignarLiderMinisterio = async (req, res) => {
  try {
    const { idMinisterio, id_ministerio } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const { id_persona } = req.body;

    if (!id_persona) {
      return res
        .status(400)
        .json({ mensaje: "El ID de la persona es obligatorio." });
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
    const { idMinisterio, id_ministerio, idPersona, id_persona } = req.params;
    const ministerioId = idMinisterio || id_ministerio;
    const personaId = idPersona || id_persona;

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

const getPersonasByMinisterio = async (req, res) => {
  const { idMinisterio } = req.params;
  try {
    // 👈 Agregamos el SELECT que faltaba al principio de la consulta
    const query = `
      SELECT p.* FROM personas p
      JOIN personas_ministerios pm ON p.id = pm.id_persona
      WHERE pm.id_ministerio = ? AND p.activo = 1
    `;

    // Dependiendo de cómo maneje tu proyecto la conexión a MySQL (db o pool):
    const [personas] = await db.query(query, [idMinisterio]);

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
