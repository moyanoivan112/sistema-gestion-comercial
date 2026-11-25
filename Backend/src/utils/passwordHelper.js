const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const esHashBcrypt = (valor) => {
  if (!valor || typeof valor !== "string") return false;
  return (
    valor.startsWith("$2a$") ||
    valor.startsWith("$2b$") ||
    valor.startsWith("$2y$")
  );
};

const hashearPassword = async (passwordPlano) => {
  return bcrypt.hash(passwordPlano.trim(), SALT_ROUNDS);
};

/**
 * Verifica una contraseña contra lo guardado en BD.
 * Si coincide en texto plano (usuarios antiguos), devuelve { valida: true, necesitaMigrar: true }.
 */
const verificarPassword = async (passwordIngresada, passwordGuardada) => {
  if (!passwordIngresada || !passwordGuardada) {
    return { valida: false, necesitaMigrar: false };
  }

  const limpia = passwordIngresada.trim();

  if (esHashBcrypt(passwordGuardada)) {
    const valida = await bcrypt.compare(limpia, passwordGuardada);
    return { valida, necesitaMigrar: false };
  }

  // Compatibilidad con claves antiguas en texto plano
  const coincideTextoPlano = passwordGuardada === limpia;
  return {
    valida: coincideTextoPlano,
    necesitaMigrar: coincideTextoPlano,
  };
};

module.exports = {
  hashearPassword,
  verificarPassword,
};
