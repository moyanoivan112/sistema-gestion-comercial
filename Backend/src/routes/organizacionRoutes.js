const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verificarToken = require("../middlewares/authMiddleware");
const autorizarRoles = require("../middlewares/roleMiddleware");

router.use(verificarToken);

router.get("/actual", async (req, res) => {
  try {
    const idOrganizacion = req.idOrganizacion ?? req.user?.id_organizacion ?? 1;
    const [rows] = await db.query(
      `SELECT id, nombre, slug, logo_url, color_primario, color_secundario, telefono, email, direccion, activo
       FROM organizaciones
       WHERE id = ?`,
      [idOrganizacion],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Organización no encontrada." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error al obtener organización actual:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

router.put("/actual", autorizarRoles("Administrador"), async (req, res) => {
  try {
    const idOrganizacion = req.idOrganizacion ?? req.user?.id_organizacion ?? 1;
    const {
      nombre,
      logo_url,
      color_primario,
      color_secundario,
      telefono,
      email,
      direccion,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res
        .status(400)
        .json({ error: "El nombre de la organización es obligatorio." });
    }

    await db.query(
      `UPDATE organizaciones
         SET nombre = ?,
             logo_url = ?,
             color_primario = ?,
             color_secundario = ?,
             telefono = ?,
             email = ?,
             direccion = ?
         WHERE id = ?`,
      [
        nombre.trim(),
        logo_url && logo_url.trim() ? logo_url.trim() : null,
        color_primario && color_primario.trim() ? color_primario.trim() : null,
        color_secundario && color_secundario.trim()
          ? color_secundario.trim()
          : null,
        telefono && telefono.trim() ? telefono.trim() : null,
        email && email.trim() ? email.trim() : null,
        direccion && direccion.trim() ? direccion.trim() : null,
        idOrganizacion,
      ],
    );

    const [updatedRows] = await db.query(
      `SELECT id, nombre, slug, logo_url, color_primario, color_secundario, telefono, email, direccion, activo
         FROM organizaciones
         WHERE id = ?`,
      [idOrganizacion],
    );

    res.json({
      mensaje: "Configuración de la organización actualizada con éxito.",
      organizacion: updatedRows[0],
    });
  } catch (err) {
    console.error("❌ Error al actualizar organización:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

module.exports = router;
