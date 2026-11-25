const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const verificarToken = require("../middlewares/authMiddleware");
const autorizarRoles = require("../middlewares/roleMiddleware");

// ==========================================
// RUTA DE LOGIN (con organización y marca blanca)
// ==========================================
router.post("/login", async (req, res) => {
  const { nombre_usuario, password } = req.body;

  if (!nombre_usuario || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    const query = `
      SELECT 
        u.*, 
        p.nombre, 
        p.apellido,
        o.nombre AS organizacion_nombre,
        o.slug AS organizacion_slug,
        o.logo_url AS organizacion_logo_url,
        o.color_primario AS organizacion_color_primario,
        o.color_secundario AS organizacion_color_secundario,
        o.activo AS organizacion_activa
      FROM usuarios u
      JOIN personas p ON u.id_persona = p.id
      LEFT JOIN organizaciones o ON COALESCE(u.id_organizacion, 1) = o.id
      WHERE u.nombre_usuario = ?
    `;
    const [results] = await db.query(query, [nombre_usuario.trim()]);

    if (results.length === 0) {
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos" });
    }

    const usuario = results[0];

    if (usuario.password !== password.trim()) {
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos" });
    }

    if (usuario.organizacion_activa === 0) {
      return res.status(403).json({
        error: "La organización asociada a este usuario se encuentra inactiva.",
      });
    }

    const idOrganizacion = usuario.id_organizacion ?? 1;

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol,
        id_organizacion: idOrganizacion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      mensaje: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        id_persona: usuario.id_persona,
        id_organizacion: idOrganizacion,
        nombre_usuario: usuario.nombre_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
      },
      organizacion: {
        id: idOrganizacion,
        nombre: usuario.organizacion_nombre || "Organización Principal",
        slug: usuario.organizacion_slug || "organizacion-principal",
        logo_url: usuario.organizacion_logo_url || null,
        color_primario: usuario.organizacion_color_primario || null,
        color_secundario: usuario.organizacion_color_secundario || null,
      },
    });
  } catch (err) {
    console.error("❌ Error SQL en login:", err);
    return res
      .status(500)
      .json({ error: "Error en el servidor de base de datos" });
  }
});

// ==========================================
// RUTA DE ACTUALIZACIÓN DE PERFIL / USUARIO
// ==========================================
router.put("/update/:id", verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre_usuario, password_actual, password_nueva } = req.body;

  if (Number(req.user.id) !== Number(id) && req.user.rol !== "Administrador") {
    return res.status(403).json({ error: "No podés modificar otro usuario." });
  }

  if (!nombre_usuario || !password_actual) {
    return res.status(400).json({
      error: "Faltan datos obligatorios (usuario o contraseña actual)",
    });
  }

  try {
    const [users] = await db.query(
      "SELECT * FROM usuarios WHERE id = ? AND id_organizacion = ?",
      [id, req.idOrganizacion],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = users[0];

    if (usuario.password !== password_actual) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    let updateQuery = "UPDATE usuarios SET nombre_usuario = ?";
    const queryParams = [nombre_usuario.trim()];

    if (password_nueva && password_nueva.trim() !== "") {
      updateQuery += ", password = ?";
      queryParams.push(password_nueva.trim());
    }

    updateQuery += " WHERE id = ? AND id_organizacion = ?";
    queryParams.push(id, req.idOrganizacion);

    await db.query(updateQuery, queryParams);

    res.json({ mensaje: "Perfil actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

// ==========================================
// RUTA DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================
router.post("/recuperar", async (req, res) => {
  const { dni, email, nueva_password } = req.body;

  if (!dni || !email || !nueva_password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const [personaResults] = await db.query(
      "SELECT id, id_organizacion FROM personas WHERE dni = ? AND email = ?",
      [dni.trim(), email.trim()],
    );

    if (personaResults.length === 0) {
      return res.status(404).json({
        error: "Los datos ingresados no coinciden con ningún registro",
      });
    }

    const idPersona = personaResults[0].id;
    const idOrganizacion = personaResults[0].id_organizacion ?? 1;

    const [usuarioResults] = await db.query(
      "SELECT id FROM usuarios WHERE id_persona = ? AND id_organizacion = ?",
      [idPersona, idOrganizacion],
    );

    if (usuarioResults.length === 0) {
      return res.status(404).json({
        error: "No se encontró un usuario asociado a estos datos personales",
      });
    }

    const idUsuario = usuarioResults[0].id;

    await db.query(
      "UPDATE usuarios SET password = ? WHERE id = ? AND id_organizacion = ?",
      [nueva_password.trim(), idUsuario, idOrganizacion],
    );

    res.json({
      mensaje: "¡Contraseña actualizada con éxito! Ya podés iniciar sesión.",
    });
  } catch (err) {
    console.error("❌ Error en recuperación de contraseña:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

// ==========================================
// RUTA PARA ASIGNAR ROL / USUARIO A UNA PERSONA EXISTENTE
// ==========================================
router.post(
  "/crear-usuario",
  verificarToken,
  autorizarRoles("Administrador"),
  async (req, res) => {
    const { id_persona, nombre_usuario, password, rol } = req.body;

    if (!id_persona || !nombre_usuario || !password || !rol) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    try {
      const [personaCheck] = await db.query(
        "SELECT id, email FROM personas WHERE id = ? AND id_organizacion = ?",
        [id_persona, req.idOrganizacion],
      );

      if (personaCheck.length === 0) {
        return res
          .status(404)
          .json({
            error: "La persona seleccionada no existe en tu organización.",
          });
      }

      const persona = personaCheck[0];

      if (!persona.email || persona.email.trim() === "") {
        return res.status(400).json({
          error:
            "La persona seleccionada no tiene un correo electrónico registrado. Es obligatorio para poder recuperar la contraseña.",
        });
      }

      const query =
        "INSERT INTO usuarios (id_persona, id_organizacion, nombre_usuario, password, rol) VALUES (?, ?, ?, ?, ?)";
      await db.query(query, [
        id_persona,
        req.idOrganizacion,
        nombre_usuario.trim(),
        password.trim(),
        rol,
      ]);

      res
        .status(201)
        .json({ mensaje: "¡Usuario creado y rol asignado con éxito!" });
    } catch (err) {
      console.error("❌ Error al asignar usuario:", err);
      if (err.code === "ER_DUP_ENTRY") {
        return res
          .status(400)
          .json({ error: "El nombre de usuario ya se encuentra registrado." });
      }
      res.status(500).json({ error: "Error en el servidor de base de datos" });
    }
  },
);

// ==========================================
// RUTA PARA ACTUALIZAR EL ROL DE UN USUARIO
// ==========================================
router.put(
  "/actualizar-rol/:id_persona",
  verificarToken,
  autorizarRoles("Administrador"),
  async (req, res) => {
    const { id_persona } = req.params;
    const { rol } = req.body;

    if (!rol) {
      return res.status(400).json({ error: "El nuevo rol es obligatorio." });
    }

    try {
      const query =
        "UPDATE usuarios SET rol = ? WHERE id_persona = ? AND id_organizacion = ?";
      const [result] = await db.query(query, [
        rol,
        id_persona,
        req.idOrganizacion,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "No se encontró un usuario vinculado a esta persona.",
        });
      }

      res.json({ mensaje: "¡Rol actualizado correctamente!" });
    } catch (err) {
      console.error("❌ Error al actualizar el rol:", err);
      res.status(500).json({ error: "Error en el servidor de base de datos" });
    }
  },
);

module.exports = router;
