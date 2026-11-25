const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: "No tenés permisos suficientes para realizar esta acción.",
      });
    }

    next();
  };
};

module.exports = autorizarRoles;
