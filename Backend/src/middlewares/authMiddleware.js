const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. No se proporcionó un token." });
  }

  // El formato suele ser "Bearer TOKEN_AQUÍ"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token mal formado." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Guardamos los datos del usuario decodificados en la petición
    next(); // Permite que la petición continúe hacia su destino
  } catch (err) {
    res.status(403).json({ error: "Token inválido o expirado." });
  }
};

module.exports = verificarToken;
