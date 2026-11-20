// src/routes/memberRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/registrar", async (req, res) => {
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

  // Si marcó dar acceso, exigimos usuario, contraseña y un email válido
  if (darAcceso && (!nombre_usuario || !password || !email)) {
    return res.status(400).json({
      error:
        "Para dar acceso al sistema, el usuario, la contraseña y el correo electrónico son obligatorios.",
    });
  }

  try {
    // Iniciamos transacción para asegurar la integridad de los datos
    await db.query("START TRANSACTION");

    // 1. Insertamos a la persona (el email puede ser null o vacío si no tiene)
    const [resultPersona] = await db.query(
      `INSERT INTO personas (nombre, apellido, dni, email, fecha_nacimiento, direccion, telefono, fecha_registro) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
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

    // 2. Si marcó "dar acceso", insertamos el usuario vinculado
    if (darAcceso) {
      await db.query(
        "INSERT INTO usuarios (id_persona, nombre_usuario, password, rol) VALUES (?, ?, ?, ?)",
        [idPersona, nombre_usuario.trim(), password.trim(), rol],
      );
    }

    await db.query("COMMIT");
    res.json({ mensaje: "¡Miembro registrado correctamente en el sistema!" });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("❌ Error al registrar miembro:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "El DNI o el nombre de usuario ya se encuentran registrados.",
      });
    }
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

module.exports = router;
