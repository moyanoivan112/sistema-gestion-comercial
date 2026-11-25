const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. No se proporcionó un token." });
  }

  const parts = authHeader.split(" ");
  const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Token mal formado." });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // { id, rol, id_organizacion, iat, exp }
    req.idOrganizacion = verified.id_organizacion ?? 1;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
};

module.exports = verificarToken;
