const express = require("express");
const router = express.Router();
const {
  exportarBackup,
  importarBackup,
} = require("../controllers/backupController");
const verificarToken = require("../middlewares/authMiddleware");
const autorizarRoles = require("../middlewares/roleMiddleware");

router.use(verificarToken);

router.get("/exportar", autorizarRoles("Administrador"), exportarBackup);
router.post("/importar", autorizarRoles("Administrador"), importarBackup);

module.exports = router;
