require("dotenv").config();
const db = require("../src/config/db");
const { hashearPassword } = require("../src/utils/passwordHelper");

const crearOrganizacionCompleta = async ({
  nombreOrganizacion,
  slug,
  telefono = null,
  email = null,
  direccion = null,
  adminNombre,
  adminApellido,
  adminDni,
  adminEmail,
  adminGenero = "Masculino",
  adminFechaNacimiento = "1990-01-01",
  adminUsuario,
  adminPassword,
}) => {
  if (
    !nombreOrganizacion ||
    !adminUsuario ||
    !adminPassword ||
    !adminNombre ||
    !adminApellido
  ) {
    throw new Error(
      "Faltan datos obligatorios para crear la organización y su administrador.",
    );
  }

  const slugLimpio =
    slug ||
    nombreOrganizacion
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Crear organización
    const [orgResult] = await connection.query(
      `INSERT INTO organizaciones (nombre, slug, telefono, email, direccion, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nombreOrganizacion.trim(), slugLimpio, telefono, email, direccion],
    );
    const idOrganizacion = orgResult.insertId;

    // 2. Crear ministerios base para la nueva organización
    const ministeriosBase = [
      ["Reunión General", 0, null, 0, 0, 1],
      ["Oración", 0, null, 0, 0, 1],
      ["Jóvenes", 13, 30, 0, 0, 1],
      ["Escuela Bíblica", 0, null, 0, 0, 1],
    ];

    for (const min of ministeriosBase) {
      await connection.query(
        `INSERT INTO ministerios (id_organizacion, nombre, edad_minima, edad_maxima, requiere_bautismo, es_exclusivo, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [idOrganizacion, ...min],
      );
    }

    // 3. Crear persona administradora inicial
    const [personaResult] = await connection.query(
      `INSERT INTO personas (id_organizacion, nombre, apellido, dni, email, fecha_nacimiento, genero, bautizado, en_discipulado, activo, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, CURDATE())`,
      [
        idOrganizacion,
        adminNombre.trim(),
        adminApellido.trim(),
        adminDni || null,
        adminEmail || email || null,
        adminFechaNacimiento,
        adminGenero,
      ],
    );
    const idPersona = personaResult.insertId;

    // 4. Crear usuario Administrador con contraseña hasheada con bcrypt
    const passwordHasheada = await hashearPassword(adminPassword);
    await connection.query(
      `INSERT INTO usuarios (id_persona, id_organizacion, nombre_usuario, password, rol)
       VALUES (?, ?, ?, ?, 'Administrador')`,
      [idPersona, idOrganizacion, adminUsuario.trim(), passwordHasheada],
    );

    await connection.commit();
    console.log(
      `✅ Organización "${nombreOrganizacion}" creada con ID ${idOrganizacion} y usuario admin "${adminUsuario}".`,
    );
    return { idOrganizacion, idPersona };
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error al crear organización:", err);
    throw err;
  } finally {
    connection.release();
  }
};

// Si se ejecuta directamente desde consola con argumentos o datos de prueba:
if (require.main === module) {
  crearOrganizacionCompleta({
    nombreOrganizacion: "Nueva Congregación Ejemplo",
    adminNombre: "Admin",
    adminApellido: "Inicial",
    adminDni: "30000001",
    adminEmail: "admin@ejemplo.com",
    adminUsuario: "admin_ejemplo",
    adminPassword: "CambiarClave123!",
  })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { crearOrganizacionCompleta };
