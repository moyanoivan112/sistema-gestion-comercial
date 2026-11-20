// src/routes/ministerioRoutes.js
const express = require("express");
const router = express.Router();
const {
  getMinisterios,
  getMinisteriosByPersona,
  actualizarMinisteriosPersona,
  crearMinisterio,
  actualizarMinisterio,
  getLideresByMinisterio,
  getAlumnosByLider,
  asignarAlumnoLider,
  quitarAlumnoLider,
  getLideresConfigByMinisterio,
  asignarLiderMinisterio,
  quitarLiderMinisterio,
  getPersonasByMinisterio,
} = require("../controllers/ministerioController");

// Rutas generales de ministerios
router.get("/", getMinisterios);
router.post("/", crearMinisterio);
router.put("/:id", actualizarMinisterio);

// 👈 2. NUEVA RUTA: Obtener personas de un ministerio específico por ID
router.get("/:idMinisterio/personas", getPersonasByMinisterio);

// Rutas de asignación por persona (excepciones individuales)
router.get("/persona/:idPersona", getMinisteriosByPersona);
router.put("/persona/:idPersona", actualizarMinisteriosPersona);

// Rutas: Escuela Bíblica y Líderes con Alumnos a cargo (Módulo Asistencia)
router.get("/:idMinisterio/lideres", getLideresByMinisterio);
router.get("/:idMinisterio/lideres/:idLider/alumnos", getAlumnosByLider);
router.post("/:idMinisterio/lideres/:idLider/alumnos", asignarAlumnoLider);
router.delete(
  "/:idMinisterio/lideres/:idLider/alumnos/:idPersona",
  quitarAlumnoLider,
);

// Rutas de Configuración de Profesores (Módulo Settings)
router.get("/:idMinisterio/config-lideres", getLideresConfigByMinisterio);
router.post("/:idMinisterio/config-lideres", asignarLiderMinisterio);
router.delete(
  "/:idMinisterio/config-lideres/:idPersona",
  quitarLiderMinisterio,
);

module.exports = router;
