const express = require("express");
const router = express.Router();
const {
  getPersonasParaAsistencia,
  guardarAsistencia,
  getHistorialAsistencia, // 👈 Importarla
  verificarAsistencia, // 👈 Nueva función
  registrarAsistencia, // 👈 Nueva función
  getAusenciasProlongadas,
  getFechasAsistenciasRegistradas,
  obtenerComparativaReunion,
} = require("../controllers/asistenciaController");

const verificarToken = require("../middlewares/authMiddleware");

// Rutas para asistencia
router.get("/personas", getPersonasParaAsistencia);
router.get("/historial", getHistorialAsistencia); // 👈 Nueva ruta para ver el historial
router.get("/verificar", verificarAsistencia); // 👈 Nueva ruta para verificar asistencia
router.post("/", registrarAsistencia); // 👈 Nueva ruta para registrar asistencia
// Registra la ruta GET para las ausencias
router.get("/ausencias", getAusenciasProlongadas);
router.get("/fechas-registradas", getFechasAsistenciasRegistradas);

router.get(
  "/comparativa/:tipoReunion",
  verificarToken,
  obtenerComparativaReunion,
);

module.exports = router;
