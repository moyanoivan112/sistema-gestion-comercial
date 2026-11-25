const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const DIAS_RETENCION = 30;
const BASE_BACKUPS_DIR = path.join(__dirname, "../../backups");

const consultaSegura = async (sql, params, nombreTabla) => {
  try {
    const [rows] = await db.query(sql, params);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn(
      `[CRON] Tabla ${nombreTabla} no disponible o vacía:`,
      e.message,
    );
    return [];
  }
};

const obtenerOrganizacionesActivas = async () => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, slug FROM organizaciones WHERE activo = 1 OR activo IS NULL ORDER BY id ASC",
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return rows;
    }
  } catch (e) {
    console.warn("[CRON] Tabla organizaciones aún no consultable:", e.message);
  }
  return [
    { id: 1, nombre: "Organización Principal", slug: "organizacion-principal" },
  ];
};

const limpiarBackupsAntiguos = (carpetaOrg) => {
  try {
    if (!fs.existsSync(carpetaOrg)) return;
    const ahora = Date.now();
    const maxEdadMs = DIAS_RETENCION * 24 * 60 * 60 * 1000;

    const archivos = fs.readdirSync(carpetaOrg);
    for (const archivo of archivos) {
      const rutaArchivo = path.join(carpetaOrg, archivo);
      const stat = fs.statSync(rutaArchivo);
      if (stat.isFile() && ahora - stat.mtimeMs > maxEdadMs) {
        fs.unlinkSync(rutaArchivo);
      }
    }
  } catch (err) {
    console.warn(
      "[CRON] No se pudieron limpiar respaldos antiguos:",
      err.message,
    );
  }
};

const generarBackupParaOrganizacion = async (org, fechaStr) => {
  const idOrg = org.id;

  const [personas, ministerios, usuarios, personasMinisterios, asistencia] =
    await Promise.all([
      consultaSegura(
        "SELECT * FROM personas WHERE id_organizacion = ?",
        [idOrg],
        "personas",
      ),
      consultaSegura(
        "SELECT * FROM ministerios WHERE id_organizacion = ?",
        [idOrg],
        "ministerios",
      ),
      consultaSegura(
        "SELECT id, id_persona, id_organizacion, nombre_usuario, rol FROM usuarios WHERE id_organizacion = ?",
        [idOrg],
        "usuarios",
      ),
      consultaSegura(
        `SELECT pm.*
         FROM personas_ministerios pm
         JOIN personas p ON pm.id_persona = p.id
         WHERE p.id_organizacion = ?`,
        [idOrg],
        "personas_ministerios",
      ),
      consultaSegura(
        "SELECT * FROM asistencia WHERE id_organizacion = ?",
        [idOrg],
        "asistencia",
      ),
    ]);

  const backupData = {
    version: "1.1",
    fecha: new Date().toISOString(),
    id_organizacion: idOrg,
    institucion: org.nombre || `Organización ${idOrg}`,
    organizacion: org,
    tablas: {
      personas,
      ministerios,
      usuarios,
      personas_ministerios: personasMinisterios,
      asistencia,
    },
  };

  const dirOrg = path.join(BASE_BACKUPS_DIR, `org_${idOrg}`);
  if (!fs.existsSync(dirOrg)) {
    fs.mkdirSync(dirOrg, { recursive: true });
  }

  const nombreArchivo = `auto_backup_org_${idOrg}_${fechaStr}.json`;
  const rutaCompleta = path.join(dirOrg, nombreArchivo);

  fs.writeFileSync(rutaCompleta, JSON.stringify(backupData, null, 2));
  limpiarBackupsAntiguos(dirOrg);

  console.log(
    `[CRON] Respaldo automático generado para org ${idOrg} (${org.nombre}): ${nombreArchivo}`,
  );
};

const generarBackupAutomatico = async () => {
  try {
    const fechaStr = new Date().toISOString().slice(0, 10);
    const organizaciones = await obtenerOrganizacionesActivas();

    for (const org of organizaciones) {
      await generarBackupParaOrganizacion(org, fechaStr);
    }
  } catch (err) {
    console.error(
      "[CRON] Error al generar el respaldo automático diario:",
      err,
    );
  }
};

// Programar la tarea: Todos los días a las 02:00 AM
cron.schedule("0 2 * * *", () => {
  console.log("[CRON] Ejecutando tarea programada de respaldo diario...");
  generarBackupAutomatico();
});

module.exports = generarBackupAutomatico;
