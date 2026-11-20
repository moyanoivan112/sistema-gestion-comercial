// src/services/cronBackup.js
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const db = require("../config/db"); // Ajusta según la ruta real de tu conexión a MySQL

const generarBackupAutomatico = async () => {
  try {
    let personas = [];
    let ministerios = [];
    let usuarios = [];
    let personasMinisterios = [];
    let asistencia = [];

    try {
      const [res] = await db.query("SELECT * FROM personas");
      personas = res;
    } catch (e) {}
    try {
      const [res] = await db.query("SELECT * FROM ministerios");
      ministerios = res;
    } catch (e) {}
    try {
      const [res] = await db.query("SELECT * FROM usuarios");
      usuarios = res;
    } catch (e) {}
    try {
      const [res] = await db.query("SELECT * FROM personas_ministerios");
      personasMinisterios = res;
    } catch (e) {}
    try {
      const [res] = await db.query("SELECT * FROM asistencia");
      asistencia = res;
    } catch (e) {}

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

    const dirBackups = path.join(__dirname, "../../backups");
    if (!fs.existsSync(dirBackups)) {
      fs.mkdirSync(dirBackups, { recursive: true });
    }

    const nombreArchivo = `auto_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const rutaCompleta = path.join(dirBackups, nombreArchivo);

    fs.writeFileSync(rutaCompleta, JSON.stringify(backupData, null, 2));
    console.log(
      `[CRON] Respaldo automático diario generado con éxito: ${nombreArchivo}`,
    );
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
