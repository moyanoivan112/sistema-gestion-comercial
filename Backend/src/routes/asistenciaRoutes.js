const express = require("express");
const router = express.Router();
const {
  getPersonasParaAsistencia,
  guardarAsistencia,
  getHistorialAsistencia,
  verificarAsistencia,
  registrarAsistencia,
  getAusenciasProlongadas,
  getFechasAsistenciasRegistradas,
  obtenerComparativaReunion,
} = require("../controllers/asistenciaController");

const verificarToken = require("../middlewares/authMiddleware");

router.use(verificarToken);

router.get("/personas", getPersonasParaAsistencia);
router.get("/historial", getHistorialAsistencia);
router.get("/verificar", verificarAsistencia);
router.post("/", registrarAsistencia);
router.put("/guardar", guardarAsistencia);
router.get("/ausencias", getAusenciasProlongadas);
router.get("/fechas-registradas", getFechasAsistenciasRegistradas);
router.get("/comparativa/:tipoReunion", obtenerComparativaReunion);

module.exports = router;
