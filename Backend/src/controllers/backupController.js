const db = require("../config/db");

const getOrgId = (req) => req.idOrganizacion ?? req.user?.id_organizacion ?? 1;

const exportarBackup = async (req, res) => {
  try {
    const idOrganizacion = getOrgId(req);

    const consultaSegura = async (sql, params, nombreTabla) => {
      try {
        const [rows] = await db.query(sql, params);
        return Array.isArray(rows) ? rows : [];
      } catch (e) {
        console.warn(`Tabla ${nombreTabla} no disponible o vacía:`, e.message);
        return [];
      }
    };

    const [
      organizacionRows,
      personas,
      ministerios,
      usuarios,
      personasMinisterios,
      asistencia,
    ] = await Promise.all([
      consultaSegura(
        "SELECT id, nombre, slug, logo_url, color_primario, color_secundario, telefono, email, direccion FROM organizaciones WHERE id = ?",
        [idOrganizacion],
        "organizaciones",
      ),
      consultaSegura(
        "SELECT * FROM personas WHERE id_organizacion = ?",
        [idOrganizacion],
        "personas",
      ),
      consultaSegura(
        "SELECT * FROM ministerios WHERE id_organizacion = ?",
        [idOrganizacion],
        "ministerios",
      ),
      consultaSegura(
        "SELECT id, id_persona, id_organizacion, nombre_usuario, rol FROM usuarios WHERE id_organizacion = ?",
        [idOrganizacion],
        "usuarios",
      ),
      consultaSegura(
        `SELECT pm.* 
         FROM personas_ministerios pm
         JOIN personas p ON pm.id_persona = p.id
         WHERE p.id_organizacion = ?`,
        [idOrganizacion],
        "personas_ministerios",
      ),
      consultaSegura(
        "SELECT * FROM asistencia WHERE id_organizacion = ?",
        [idOrganizacion],
        "asistencia",
      ),
    ]);

    const orgInfo = organizacionRows[0] || {
      id: idOrganizacion,
      nombre: "Organización",
    };

    const backupData = {
      version: "1.1",
      fecha: new Date().toISOString(),
      id_organizacion: idOrganizacion,
      institucion: orgInfo.nombre,
      organizacion: orgInfo,
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
      `attachment; filename=backup_org_${idOrganizacion}_${Date.now()}.json`,
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
  const idOrganizacion = getOrgId(req);
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

    if (tablas.personas.length > 0) {
      const queryPersona = `
        INSERT INTO personas (
          id, id_organizacion, nombre, apellido, dni, email, telefono,
          bautizado, en_discipulado, activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nombre = IF(id_organizacion = VALUES(id_organizacion), VALUES(nombre), nombre),
          apellido = IF(id_organizacion = VALUES(id_organizacion), VALUES(apellido), apellido),
          dni = IF(id_organizacion = VALUES(id_organizacion), VALUES(dni), dni),
          email = IF(id_organizacion = VALUES(id_organizacion), VALUES(email), email),
          telefono = IF(id_organizacion = VALUES(id_organizacion), VALUES(telefono), telefono),
          bautizado = IF(id_organizacion = VALUES(id_organizacion), VALUES(bautizado), bautizado),
          en_discipulado = IF(id_organizacion = VALUES(id_organizacion), VALUES(en_discipulado), en_discipulado),
          activo = IF(id_organizacion = VALUES(id_organizacion), VALUES(activo), activo)
      `;

      for (const p of tablas.personas) {
        await connection.query(queryPersona, [
          p.id || null,
          idOrganizacion,
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

    await connection.commit();

    return res.json({ mensaje: "¡Copia de seguridad restaurada con éxito!" });
  } catch (err) {
    if (connection) {
      try {
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
