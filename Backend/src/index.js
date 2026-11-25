const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const personaRoutes = require("./routes/personaRoutes");
const authRoutes = require("./routes/authRoutes");
const asistenciaRoutes = require("./routes/asistenciaRoutes");
const ministerioRoutes = require("./routes/ministerioRoutes");
const backupRoutes = require("./routes/backupRoutes");
const organizacionRoutes = require("./routes/organizacionRoutes");

// 👈 Importamos el servicio de respaldos automáticos diarios con node-cron
require("./services/cronBackup");

const app = express();

const isDevScript = process.env.npm_lifecycle_event === "dev";
const PORT = Number(process.env.PORT) || (isDevScript ? 5000 : 80);

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api/personas", personaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/personas", require("./routes/memberRoutes"));
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/ministerios", ministerioRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/organizacion", organizacionRoutes);

// Ruta hacia el build del Frontend (Backend/src -> ../../Frontend/dist)
const frontendDistPath = path.join(__dirname, "../../Frontend/dist");

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // Cualquier ruta que no sea /api devuelve index.html (soporte para React Router)
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor corriendo exitosamente en el puerto ${PORT} (${isDevScript ? "DEV" : "BUILD/PROD"})`,
  );
});
