const express = require("express");
const router = express.Router();
const {
  exportarBackup,
  importarBackup,
} = require("../controllers/backupController");
const verificarToken = require("../middlewares/authMiddleware");

// Opcional: Si tienes un middleware específico para validar roles (ej. solo admin),
// puedes agregarlo aquí junto con verificarToken.
// Por seguridad, exigimos que la petición esté autenticada con token válido:

router.get("/exportar", verificarToken, exportarBackup);
router.post("/importar", verificarToken, importarBackup);

module.exports = router;
