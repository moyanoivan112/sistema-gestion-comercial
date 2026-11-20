// db.js
const mysql = require("mysql2");
require("dotenv").config();

// Creamos el pool de conexiones usando variables de entorno o datos directos
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "tu_contraseña_aqui", // Cambiala por tu clave de MySQL
  database: process.env.DB_NAME || "sistema_congregacional",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Probamos la conexión
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("La conexión con la base de datos fue cerrada.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("La base de datos tiene demasiadas conexiones.");
    }
    if (err.code === "ECONNREFUSED") {
      console.error(
        "Conexión rechazada. ¿Está encendido MySQL en XAMPP / Servidor?",
      );
    }
    return;
  }
  if (connection) {
    console.log("¡Conexión exitosa a la base de datos sistema_congregacional!");
    connection.release();
  }
});

// Exportamos usando .promise() para poder usar async/await en tus rutas
module.exports = pool.promise();
