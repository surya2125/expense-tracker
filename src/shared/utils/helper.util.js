const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

// Async UUID generator: prefer Node's built-in `randomUUID`, else dynamically
// import the ESM `uuid` package (works when `uuid` is ESM-only).
const generateUuid = async () => {
  if (typeof randomUUID === "function") return randomUUID();
  const { v4: uuidv4 } = await import("uuid");
  return uuidv4();
};

// JWT generator
const generateJwt = (payload) => {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN });
};

module.exports = { generateUuid, generateJwt };
