const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");
const {
  getPersonas,
  getDashboardStats,
  getPersonaById,
  createPersona,
  updatePersona,
  deletePersona,
  getPersonasInactivas,
  reactivarPersona,
  getDashboardAttendanceTrend,
} = require("../controllers/personaController");

// 1. Rutas específicas (DEBEN IR ANTES de /:id para que Express no las confunda con un ID)
router.get("/inactivas", verificarToken, getPersonasInactivas);
router.get("/dashboard/stats", verificarToken, getDashboardStats); // O sin verificarToken si tu dashboard lo necesita público, pero mantenlo acorde a tus demás rutas
router.get("/dashboard/trend", verificarToken, getDashboardAttendanceTrend);

// 2. Rutas generales y CRUD por ID
router.get("/", verificarToken, getPersonas);
router.get("/:id", verificarToken, getPersonaById);
router.post("/", verificarToken, createPersona);
router.put("/:id", verificarToken, updatePersona);
router.delete("/:id", verificarToken, deletePersona);

// 3. Ruta para dar de alta nuevamente (reactivar)
router.put("/reactivar/:id", verificarToken, reactivarPersona);

module.exports = router;
