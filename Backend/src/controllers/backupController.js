// src/controllers/backupController.js
const db = require("../config/db"); // Ajusta según tu ruta real de conexión a MySQL

const exportarBackup = async (req, res) => {
  try {
    // Consultamos usando los nombres exactos de tu base de datos
    let personas = [];
    let ministerios = [];
    let usuarios = [];
    let personasMinisterios = [];
    let asistencia = [];

    try {
      const [res] = await db.query("SELECT * FROM personas");
      personas = res;
    } catch (e) {
      console.log("personas vacía");
    }
    try {
      const [res] = await db.query("SELECT * FROM ministerios");
      ministerios = res;
    } catch (e) {
      console.log("ministerios vacía");
    }
    try {
      const [res] = await db.query("SELECT * FROM usuarios");
      usuarios = res;
    } catch (e) {
      console.log("usuarios vacía");
    }
    try {
      const [res] = await db.query("SELECT * FROM personas_ministerios");
      personasMinisterios = res;
    } catch (e) {
      console.log("personas_ministerios vacía");
    }
    try {
      const [res] = await db.query("SELECT * FROM asistencia");
      asistencia = res;
    } catch (e) {
      console.log("asistencia vacía");
    }

    const backupData = {
      version: "1.0",
      fecha: new Date().toISOString(),
      institucion: "Sistema Congregacional",
      tablas: {
        personas,
        ministerios,
        usuarios,
        personas_ministerios: personasMinisterios,
        asistencia,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=backup_congregacion_${Date.now()}.json`,
    );

    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error("Error crítico al generar el backup:", err);
    return res
      .status(500)
      .json({
        error: "Error en el servidor al generar el backup: " + err.message,
      });
  }
};

const importarBackup = async (req, res) => {
  try {
    const { tablas } = req.body;

    if (!tablas || !tablas.personas) {
      return res
        .status(400)
        .json({
          error: "El archivo de respaldo no es válido o está incompleto.",
        });
    }

    await db.query("SET FOREIGN_KEY_CHECKS = 0;");

    if (Array.isArray(tablas.personas) && tablas.personas.length > 0) {
      for (const p of tablas.personas) {
        const query = `
          INSERT INTO personas (id, nombre, apellido, dni, email, telefono, bautizado, en_discipulado, activo) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido=VALUES(apellido);
        `;
        await db.query(query, [
          p.id || null,
          p.nombre || "",
          p.apellido || "",
          p.dni || null,
          p.email || null,
          p.telefono || null,
          p.bautizado || 0,
          p.en_discipulado || 0,
          p.activo !== undefined ? p.activo : 1,
        ]);
      }
    }

    await db.query("SET FOREIGN_KEY_CHECKS = 1;");
    return res.json({ mensaje: "¡Copia de seguridad restaurada con éxito!" });
  } catch (err) {
    await db.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.error("Error al restaurar backup:", err);
    return res
      .status(500)
      .json({ error: "Error al procesar la importación: " + err.message });
  }
};

module.exports = { exportarBackup, importarBackup };
