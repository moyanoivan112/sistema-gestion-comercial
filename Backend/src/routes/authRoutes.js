// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// ==========================================
// RUTA DE LOGIN
// ==========================================
router.post("/login", async (req, res) => {
  console.log("-> ¡Ruta /api/auth/login alcanzada con éxito!", req.body);
  const { nombre_usuario, password } = req.body;

  if (!nombre_usuario || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    // MODIFICACIÓN: Hacemos un JOIN con la tabla personas para traer el nombre y apellido
    const query = `
      SELECT u.*, p.nombre, p.apellido 
      FROM usuarios u 
      JOIN personas p ON u.id_persona = p.id
      WHERE u.nombre_usuario = ?
    `;
    const [results] = await db.query(query, [nombre_usuario.trim()]);

    console.log("-> Resultados de MySQL:", results);

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

    // Generamos el token que expira en 8 horas (por ejemplo)
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    console.log("-> Login exitoso para el usuario:", usuario.nombre_usuario);
    res.json({
      mensaje: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        id_persona: usuario.id_persona,
        nombre_usuario: usuario.nombre_usuario,
        nombre: usuario.nombre, // <-- MODIFICACIÓN: Enviamos el nombre real
        apellido: usuario.apellido, // <-- MODIFICACIÓN: Opcional, por si quieres usar el apellido también
        rol: usuario.rol,
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
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre_usuario, password_actual, password_nueva } = req.body;

  if (!nombre_usuario || !password_actual) {
    return res.status(400).json({
      error: "Faltan datos obligatorios (usuario o contraseña actual)",
    });
  }

  try {
    // 1. Verificamos que el usuario exista y la contraseña actual sea correcta
    const [users] = await db.query("SELECT * FROM usuarios WHERE id = ?", [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = users[0];

    if (usuario.password !== password_actual) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    // 2. Preparamos la consulta de actualización dinámica
    let updateQuery = "UPDATE usuarios SET nombre_usuario = ?";
    let queryParams = [nombre_usuario.trim()];

    // Si mandó una contraseña nueva, la actualizamos también
    if (password_nueva && password_nueva.trim() !== "") {
      updateQuery += ", password = ?";
      queryParams.push(password_nueva.trim());
    }

    updateQuery += " WHERE id = ?";
    queryParams.push(id);

    // 3. Ejecutamos el update en MySQL
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
    // 1. Buscamos en la tabla personas si existe una coincidencia con el DNI y el correo
    // (Ajusta los nombres de las columnas 'dni' y 'email' según tu base de datos)
    const [personaResults] = await db.query(
      "SELECT id FROM personas WHERE dni = ? AND email = ?",
      [dni.trim(), email.trim()],
    );

    if (personaResults.length === 0) {
      return res.status(404).json({
        error: "Los datos ingresados no coinciden con ningún registro",
      });
    }

    const idPersona = personaResults[0].id;

    // 2. Buscamos el usuario asociado a ese id_persona
    const [usuarioResults] = await db.query(
      "SELECT id FROM usuarios WHERE id_persona = ?",
      [idPersona],
    );

    if (usuarioResults.length === 0) {
      return res.status(404).json({
        error: "No se encontró un usuario asociado a estos datos personales",
      });
    }

    const idUsuario = usuarioResults[0].id;

    // 3. Actualizamos la contraseña del usuario
    await db.query("UPDATE usuarios SET password = ? WHERE id = ?", [
      nueva_password.trim(),
      idUsuario,
    ]);

    res.json({
      mensaje: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.",
    });
  } catch (err) {
    console.error("❌ Error en recuperación de contraseña:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

// ==========================================
// RUTA PARA ASIGNAR ROL / USUARIO A UNA PERSONA EXISTENTE
// ==========================================
router.post("/crear-usuario", async (req, res) => {
  const { id_persona, nombre_usuario, password, rol } = req.body;

  if (!id_persona || !nombre_usuario || !password || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // 1. Verificamos que la persona exista y traemos su email
    const [personaCheck] = await db.query(
      "SELECT id, email FROM personas WHERE id = ?",
      [id_persona],
    );

    if (personaCheck.length === 0) {
      return res
        .status(404)
        .json({ error: "La persona seleccionada no existe." });
    }

    const persona = personaCheck[0];

    // 2. Validamos obligatoriamente que tenga un email cargado (necesario para recuperación)
    if (!persona.email || persona.email.trim() === "") {
      return res.status(400).json({
        error:
          "La persona seleccionada no tiene un correo electrónico registrado. Es obligatorio para poder recuperar la contraseña.",
      });
    }

    // 3. Insertamos el usuario vinculado a esa persona
    const query =
      "INSERT INTO usuarios (id_persona, nombre_usuario, password, rol) VALUES (?, ?, ?, ?)";
    await db.query(query, [
      id_persona,
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
});

// ==========================================
// RUTA PARA ACTUALIZAR EL ROL DE UN USUARIO
// ==========================================
router.put("/actualizar-rol/:id_persona", async (req, res) => {
  const { id_persona } = req.params;
  const { rol } = req.body;

  if (!rol) {
    return res.status(400).json({ error: "El nuevo rol es obligatorio." });
  }

  try {
    const query = "UPDATE usuarios SET rol = ? WHERE id_persona = ?";
    const [result] = await db.query(query, [rol, id_persona]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró un usuario vinculado a esta persona." });
    }

    res.json({ mensaje: "¡Rol actualizado correctamente!" });
  } catch (err) {
    console.error("❌ Error al actualizar el rol:", err);
    res.status(500).json({ error: "Error en el servidor de base de datos" });
  }
});

module.exports = router;
