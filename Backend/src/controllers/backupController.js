const db = require("../config/db");

const exportarBackup = async (req, res) => {
  try {
    const consultaSegura = async (sql, nombreTabla) => {
      try {
        const [rows] = await db.query(sql);
        return Array.isArray(rows) ? rows : [];
      } catch (e) {
        console.warn(`Tabla ${nombreTabla} no disponible o vacía:`, e.message);
        return [];
      }
    };

    const [personas, ministerios, usuarios, personasMinisterios, asistencia] =
      await Promise.all([
        consultaSegura("SELECT * FROM personas", "personas"),
        consultaSegura("SELECT * FROM ministerios", "ministerios"),
        consultaSegura("SELECT * FROM usuarios", "usuarios"),
        consultaSegura(
          "SELECT * FROM personas_ministerios",
          "personas_ministerios",
        ),
        consultaSegura("SELECT * FROM asistencia", "asistencia"),
      ]);

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
    return res.status(500).json({
      error: "Error en el servidor al generar el backup: " + err.message,
    });
  }
};

const importarBackup = async (req, res) => {
  const { tablas } = req.body || {};

  if (!tablas || !Array.isArray(tablas.personas)) {
    return res.status(400).json({
      error: "El archivo de respaldo no es válido o está incompleto.",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    if (tablas.personas.length > 0) {
      const queryPersona = `
        INSERT INTO personas (
          id, nombre, apellido, dni, email, telefono,
          bautizado, en_discipulado, activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          apellido = VALUES(apellido),
          dni = VALUES(dni),
          email = VALUES(email),
          telefono = VALUES(telefono),
          bautizado = VALUES(bautizado),
          en_discipulado = VALUES(en_discipulado),
          activo = VALUES(activo)
      `;

      for (const p of tablas.personas) {
        await connection.query(queryPersona, [
          p.id || null,
          p.nombre || "",
          p.apellido || "",
          p.dni || null,
          p.email || null,
          p.telefono || null,
          p.bautizado ? 1 : 0,
          p.en_discipulado ? 1 : 0,
          p.activo !== undefined ? (p.activo ? 1 : 0) : 1,
        ]);
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();

    return res.json({ mensaje: "¡Copia de seguridad restaurada con éxito!" });
  } catch (err) {
    if (connection) {
      try {
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Error al revertir transacción de backup:", rollbackErr);
      }
    }
    console.error("Error al restaurar backup:", err);
    return res.status(500).json({
      error: "Error al procesar la importación: " + err.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = { exportarBackup, importarBackup };
