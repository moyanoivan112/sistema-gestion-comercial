const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verificarToken = require("../middlewares/authMiddleware");

router.post("/registrar", verificarToken, async (req, res) => {
  const idOrganizacion = req.idOrganizacion ?? req.user?.id_organizacion ?? 1;
  const {
    nombre,
    apellido,
    dni,
    email,
    fecha_nacimiento,
    direccion,
    telefono,
    darAcceso,
    nombre_usuario,
    password,
    rol,
  } = req.body;

  if (!nombre || !apellido || !dni) {
    return res
      .status(400)
      .json({ error: "Nombre, apellido y DNI son obligatorios." });
  }

  if (darAcceso && (!nombre_usuario || !password || !email)) {
    return res.status(400).json({
      error:
        "Para dar acceso al sistema, el usuario, la contraseña y el correo electrónico son obligatorios.",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [resultPersona] = await connection.query(
      `INSERT INTO personas (id_organizacion, nombre, apellido, dni, email, fecha_nacimiento, direccion, telefono, fecha_registro) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        idOrganizacion,
        nombre.trim(),
        apellido.trim(),
        dni.trim(),
        email && email.trim() !== "" ? email.trim() : null,
        fecha_nacimiento || null,
        direccion ? direccion.trim() : null,
        telefono ? telefono.trim() : null,
      ],
    );

    const idPersona = resultPersona.insertId;

    if (darAcceso) {
      await connection.query(
        "INSERT INTO usuarios (id_persona, id_organizacion, nombre_usuario, password, rol) VALUES (?, ?, ?, ?, ?)",
        [
          idPersona,
          idOrganizacion,
          nombre_usuario.trim(),
          password.trim(),
          rol,
        ],
      );
    }

    await connection.commit();
    res.json({ mensaje: "¡Miembro registrado correctamente en el sistema!" });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("❌ Error al registrar miembro:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "El DNI o el nombre de usuario ya se encuentran registrados.",
      });
    }
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
