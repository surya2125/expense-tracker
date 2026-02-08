const { AppError } = require("../../shared/errors/appError");
const AuthService = require("./auth.service");

const registerUser = async (req, res, next) => {
  try {
    const auth = await AuthService.registerUser(req.body);
    if (auth) {
      return res.status(201).json({ message: "User registered successfully" });
    }
    throw AppError.badRequest("Registration failed", { status: 400 });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const auth = await AuthService.loginUser(req.body);
    if (auth) {
      return res.status(200).json(auth);
    }
  } catch (error) {
    return next(error);
  }
};

module.exports = { registerUser, loginUser };
