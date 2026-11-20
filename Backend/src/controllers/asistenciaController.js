const db = require("../config/db");

// 1. Obtener personas para tomar asistencia (Estrictamente basado en las casillas / tabla personas_ministerios)
const getPersonasParaAsistencia = async (req, res) => {
  try {
    const { tipo } = req.query; // ID del ministerio o reunión seleccionado

    if (!tipo) {
      return res
        .status(400)
        .json({ mensaje: "Debe especificar el ministerio o reunión." });
    }

    const query = `
      SELECT p.id, p.nombre, p.apellido, p.fecha_nacimiento, p.bautizado 
      FROM personas p
      JOIN personas_ministerios pm ON p.id = pm.id_persona
      WHERE p.activo = 1 AND pm.id_ministerio = ?
      ORDER BY p.apellido ASC
    `;

    const [personas] = await db.query(query, [tipo]);
    res.json(personas);
  } catch (error) {
    console.error("Error al obtener personas para asistencia:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 2. Guardar o actualizar la asistencia (con retorno del error SQL real para depuración)
const guardarAsistencia = async (req, res) => {
  try {
    const { fecha_registro, id_ministerio, registros } = req.body;

    if (!fecha_registro || !registros || !Array.isArray(registros)) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para guardar la asistencia.",
      });
    }

    const ministerioId =
      id_ministerio && !isNaN(id_ministerio) ? Number(id_ministerio) : null;

    for (const item of registros) {
      const { id_persona, presente } = item;

      let checkQuery = "";
      let checkParams = [];

      if (ministerioId === null) {
        checkQuery = `
          SELECT id FROM asistencia 
          WHERE id_persona = ? AND fecha_registro = ? AND id_ministerio IS NULL
        `;
        checkParams = [id_persona, fecha_registro];
      } else {
        checkQuery = `
          SELECT id FROM asistencia 
          WHERE id_persona = ? AND fecha_registro = ? AND id_ministerio = ?
        `;
        checkParams = [id_persona, fecha_registro, ministerioId];
      }

      const [existing] = await db.query(checkQuery, checkParams);

      if (existing.length > 0) {
        const updateQuery = `
          UPDATE asistencia 
          SET presente = ? 
          WHERE id = ?
        `;
        await db.query(updateQuery, [presente ? 1 : 0, existing[0].id]);
      } else {
        const insertQuery = `
          INSERT INTO asistencia (id_persona, id_ministerio, presente, fecha_registro) 
          VALUES (?, ?, ?, ?)
        `;
        await db.query(insertQuery, [
          id_persona,
          ministerioId,
          presente ? 1 : 0,
          fecha_registro,
        ]);
      }
    }

    res.json({ mensaje: "Asistencia guardada correctamente 📋" });
  } catch (error) {
    console.error("Error al guardar asistencia:", error);
    res.status(500).json({ mensaje: `Error de BD: ${error.message}` });
  }
};

// 3. Obtener el historial de asistencia por fecha y tipo/ministerio
const getHistorialAsistencia = async (req, res) => {
  try {
    const { fecha, id_ministerio } = req.query;

    if (!fecha) {
      return res.status(400).json({
        mensaje: "La fecha es obligatoria para consultar el historial.",
      });
    }

    let query = `
      SELECT a.id, a.id_persona, a.presente, a.fecha_registro, p.nombre, p.apellido, p.dni 
      FROM asistencia a
      JOIN personas p ON a.id_persona = p.id
      WHERE a.fecha_registro = ?
    `;
    let params = [fecha];

    const isGeneralType = [
      "general",
      "oracion",
      "cena",
      "jovenes",
      "undefined",
      "null",
      "",
    ].includes(String(id_ministerio));

    if (id_ministerio && !isGeneralType && !isNaN(id_ministerio)) {
      query += ` AND a.id_ministerio = ?`;
      params.push(Number(id_ministerio));
    } else {
      query += ` AND a.id_ministerio IS NULL`;
    }

    query += ` ORDER BY p.apellido ASC`;

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener el historial de asistencia:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno al consultar el historial" });
  }
};

// 4. Verificar si ya se tomó asistencia para esa fecha, ministerio y (opcionalmente) por profesor
const verificarAsistencia = async (req, res) => {
  try {
    const { fecha, id_ministerio, id_lider } = req.query;

    if (id_lider && id_lider !== "undefined" && id_lider !== "null") {
      const query = `
        SELECT COUNT(*) as total 
        FROM asistencia a
        JOIN lider_alumnos la ON a.id_persona = la.id_alumno 
        WHERE a.fecha_registro = ? 
          AND a.id_ministerio = ? 
          AND la.id_lider = ? 
          AND la.id_ministerio = ?
      `;
      const [rows] = await db.query(query, [
        fecha,
        id_ministerio,
        id_lider,
        id_ministerio,
      ]);
      return res.json({ yaExiste: rows[0].total > 0 });
    } else {
      const [rows] = await db.query(
        "SELECT COUNT(*) as total FROM asistencia WHERE fecha_registro = ? AND id_ministerio = ?",
        [fecha, id_ministerio],
      );
      res.json({ yaExiste: rows[0].total > 0 });
    }
  } catch (error) {
    console.error("Error al verificar asistencia:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 5. Registrar asistencia con validación inteligente del día de la semana (Permitiendo recuperar días pasados con aviso)
const registrarAsistencia = async (req, res) => {
  try {
    const { fecha_registro, id_ministerio, registros } = req.body;

    if (!fecha_registro) {
      return res
        .status(400)
        .json({ mensaje: "La fecha de registro es obligatoria." });
    }

    // Identificar el día de la semana de la fecha seleccionada (0: Domingo, 1: Lunes, ..., 6: Sábado)
    // Usamos UTC para evitar desfases de zona horaria al parsear la fecha YYYY-MM-DD
    const partesFecha = fecha_registro.split("-");
    const fechaObj = new Date(
      Date.UTC(partesFecha[0], partesFecha[1] - 1, partesFecha[2]),
    );
    const diaSemana = fechaObj.getUTCDay();

    // Consultamos el nombre del ministerio para aplicar las reglas de días correspondientes
    let nombreMinisterio = "";
    if (id_ministerio && !isNaN(id_ministerio)) {
      const [minRows] = await db.query(
        "SELECT nombre FROM ministerios WHERE id = ?",
        [id_ministerio],
      );
      if (minRows.length > 0) {
        nombreMinisterio = minRows[0].nombre.toLowerCase();
      }
    }

    // REGLAS DE VALIDACIÓN DE DÍAS:
    // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
    let diaValido = true;
    let mensajeErrorDia = "";

    if (
      nombreMinisterio.includes("oración") ||
      nombreMinisterio.includes("oracion")
    ) {
      // Oración: Solo Miércoles (3)
      if (diaSemana !== 3) {
        diaValido = false;
        mensajeErrorDia =
          "⚠️ Las reuniones de oración se realizan exclusivamente los días Miércoles.";
      }
    } else if (
      nombreMinisterio.includes("jovenes") ||
      nombreMinisterio.includes("jóvenes") ||
      nombreMinisterio.includes("pre adolescente")
    ) {
      // Jóvenes / Pre-adolescentes: Sábados (6) o excepcionalmente Viernes (5)
      if (diaSemana !== 6 && diaSemana !== 5) {
        diaValido = false;
        mensajeErrorDia =
          "⚠️ Las reuniones de Jóvenes / Pre-adolescentes se realizan los Sábados (o Viernes excepcionales).";
      }
    } else if (
      nombreMinisterio.includes("escuela bíblica") ||
      nombreMinisterio.includes("biblica")
    ) {
      // Escuela Bíblica: Domingos (0) o excepcionalmente Sábados (6)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diaValido = false;
        mensajeErrorDia =
          "⚠️ La Escuela Bíblica se realiza los Domingos (o Sábados excepcionales).";
      }
    } else {
      // General / Cena del Señor u otros: Domingos (0) o Sábados tarde (6)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diaValido = false;
        mensajeErrorDia =
          "⚠️ Las reuniones Generales o Cenas del Señor se realizan los Domingos (o Sábados por la tarde).";
      }
    }

    if (!diaValido) {
      return res.status(400).json({ mensaje: mensajeErrorDia });
    }

    // Si pasa la validación, procedemos a registrar o actualizar (permitiendo fechas pasadas para recuperar datos)
    await db.query(
      "DELETE FROM asistencia WHERE fecha_registro = ? AND id_ministerio = ?",
      [fecha_registro, id_ministerio],
    );

    for (let reg of registros) {
      await db.query(
        "INSERT INTO asistencia (id_persona, id_ministerio, fecha_registro, presente) VALUES (?, ?, ?, ?)",
        [reg.id_persona, id_ministerio, fecha_registro, reg.presente],
      );
    }

    res.json({ mensaje: "¡Asistencia guardada correctamente con éxito! 📋" });
  } catch (error) {
    console.error("Error al registrar asistencia:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// 6. Obtener ausencias prolongadas (miembros cuya última asistencia positiva supere los 21 días)
const getAusenciasProlongadas = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS id_persona,
        p.nombre, 
        p.apellido, 
        COALESCE(MAX(m.nombre), 'Reunión General') AS nombre_ministerio,
        MAX(CASE WHEN a.presente = 1 THEN a.fecha_registro ELSE NULL END) AS ultima_asistencia,
        DATEDIFF(CURDATE(), MAX(CASE WHEN a.presente = 1 THEN a.fecha_registro ELSE NULL END)) AS dias_ausente
      FROM personas p
      LEFT JOIN asistencia a ON p.id = a.id_persona AND a.presente = 1
      LEFT JOIN ministerios m ON a.id_ministerio = m.id
      WHERE p.activo = 1
      GROUP BY p.id, p.nombre, p.apellido
      HAVING dias_ausente >= 21 OR ultima_asistencia IS NULL
      ORDER BY dias_ausente DESC
      LIMIT 20
    `;

    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ausencias prolongadas:", error);
    res.status(500).json({ mensaje: "Error interno al calcular ausencias" });
  }
};

// 7. Obtener lista de fechas y ministerios con asistencias tomadas (para el historial paginado)
const getFechasAsistenciasRegistradas = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.fecha_registro,
        a.id_ministerio,
        COALESCE(m.nombre, 'Reunión General') AS nombre_ministerio,
        COUNT(a.id) AS total_registrados,
        SUM(CASE WHEN a.presente = 1 THEN 1 ELSE 0 END) AS total_presentes
      FROM asistencia a
      LEFT JOIN ministerios m ON a.id_ministerio = m.id
      GROUP BY a.fecha_registro, a.id_ministerio, m.nombre
      ORDER BY a.fecha_registro DESC
    `;

    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener fechas de asistencias:", error);
    res
      .status(500)
      .json({ mensaje: "Error interno al consultar el historial" });
  }
};

const obtenerComparativaReunion = async (req, res) => {
  try {
    const { tipoReunion } = req.params;
    console.log("Calculando comparativa para:", tipoReunion);

    // 1. Buscar las últimas 2 fechas distintas para este ministerio/reunión uniendo con la tabla ministerios
    const [fechas] = await db.query(
      `SELECT DISTINCT a.fecha_registro 
       FROM asistencia a 
       JOIN ministerios m ON a.id_ministerio = m.id 
       WHERE m.nombre = ? 
       ORDER BY a.fecha_registro DESC LIMIT 2`,
      [tipoReunion],
    );

    if (!fechas || fechas.length < 2) {
      return res.status(400).json({
        error: `No hay suficientes registros históricos (se encontraron ${fechas ? fechas.length : 0} fechas) para "${tipoReunion}".`,
      });
    }

    const fechaUltima = fechas[0].fecha_registro;
    const fechaPenultima = fechas[1].fecha_registro;

    // 2. Obtener los asistentes de la penúltima fecha (solo los presentes)
    const [asistentesPenultima] = await db.query(
      `SELECT p.id, p.nombre, p.apellido, p.telefono 
       FROM asistencia a 
       JOIN personas p ON a.id_persona = p.id 
       JOIN ministerios m ON a.id_ministerio = m.id 
       WHERE m.nombre = ? AND a.fecha_registro = ? AND a.presente = 1`,
      [tipoReunion, fechaPenultima],
    );

    // 3. Obtener los asistentes de la última fecha (solo los presentes)
    const [asistentesUltima] = await db.query(
      `SELECT p.id, p.nombre, p.apellido, p.telefono 
       FROM asistencia a 
       JOIN personas p ON a.id_persona = p.id 
       JOIN ministerios m ON a.id_ministerio = m.id 
       WHERE m.nombre = ? AND a.fecha_registro = ? AND a.presente = 1`,
      [tipoReunion, fechaUltima],
    );

    const idsPenultima = new Set(asistentesPenultima.map((p) => p.id));
    const idsUltima = new Set(asistentesUltima.map((p) => p.id));

    // Faltaron en la última (estaban en la penúltima pero no en la última)
    const ausentesUltima = asistentesPenultima.filter(
      (p) => !idsUltima.has(p.id),
    );

    // Reingresos / Nuevos asistentes (no estaban en la penúltima pero sí vinieron a la última)
    const reingresosUltima = asistentesUltima.filter(
      (p) => !idsPenultima.has(p.id),
    );

    return res.json({
      fechaUltima,
      fechaPenultima,
      totalUltima: asistentesUltima.length,
      totalPenultima: asistentesPenultima.length,
      ausentesUltima,
      reingresosUltima,
    });
  } catch (err) {
    console.error("ERROR CRÍTICO EN COMPARATIVA DE ASISTENCIA:", err.message);
    return res.status(500).json({
      error: "Error en el servidor al obtener la comparativa: " + err.message,
    });
  }
};

module.exports = {
  getPersonasParaAsistencia,
  guardarAsistencia,
  getHistorialAsistencia,
  verificarAsistencia,
  registrarAsistencia,
  getAusenciasProlongadas,
  getFechasAsistenciasRegistradas,
  obtenerComparativaReunion,
};
