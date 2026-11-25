const express = require("express");
const router = express.Router();
const verificarToken = require("../middlewares/authMiddleware");
const autorizarRoles = require("../middlewares/roleMiddleware");
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

router.use(verificarToken);

// Rutas generales de ministerios
router.get("/", getMinisterios);
router.post("/", autorizarRoles("Administrador"), crearMinisterio);
router.put("/:id", autorizarRoles("Administrador"), actualizarMinisterio);

// Obtener personas de un ministerio específico por ID
router.get("/:idMinisterio/personas", getPersonasByMinisterio);

// Rutas de asignación por persona
router.get("/persona/:idPersona", getMinisteriosByPersona);
router.put("/persona/:idPersona", actualizarMinisteriosPersona);

// Rutas: Líderes y personas a cargo (Módulo Asistencia)
router.get("/:idMinisterio/lideres", getLideresByMinisterio);
router.get("/:idMinisterio/lideres/:idLider/alumnos", getAlumnosByLider);
router.post("/:idMinisterio/lideres/:idLider/alumnos", asignarAlumnoLider);
router.delete(
  "/:idMinisterio/lideres/:idLider/alumnos/:idPersona",
  quitarAlumnoLider,
);

// Rutas de Configuración de Líderes/Profesores
router.get("/:idMinisterio/config-lideres", getLideresConfigByMinisterio);
router.post(
  "/:idMinisterio/config-lideres",
  autorizarRoles("Administrador"),
  asignarLiderMinisterio,
);
router.delete(
  "/:idMinisterio/config-lideres/:idPersona",
  autorizarRoles("Administrador"),
  quitarLiderMinisterio,
);

module.exports = router;
