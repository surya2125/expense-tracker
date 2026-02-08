const { AppError } = require("../../shared/errors/appError");
const { generateUuid, generateJwt } = require("../../shared/utils/helper.util");
const UserService = require("../users/users.service");
const Auth = require("./auth.model");
const mongoose = require("mongoose");

class AuthService {
  /**
   * Register User
   * @param {*} userData
   * @returns Created Auth Document
   */
  async registerUser(userData) {
    if (!userData) {
      throw AppError.badRequest("User data is required", { status: 400 });
    }
    const session = await mongoose.startSession();
    let createdAuth = null;
    try {
      await session.withTransaction(async () => {
        const userId = await generateUuid();
        const authData = { ...userData, userId };
        const authDoc = new Auth(authData);
        await authDoc.save({ session });
        createdAuth = authDoc;
        await UserService.createUser(authData, { session });
      });
      return createdAuth;
    } catch (err) {
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Login User
   * @param {*} loginData
   * @returns JWT Token and Auth Data
   */
  async loginUser(loginData) {
    const { email, password } = loginData;
    if (!email || !password) {
      throw AppError.badRequest("Invalid credentials", { status: 400 });
    }
    try {
      const authRecord = await Auth.findOne({ email }).select("+password");
      if (
        !authRecord ||
        !(await authRecord.checkPassword(password, authRecord.password))
      ) {
        throw AppError.unauthorized("Invalid email or password", {
          status: 401,
        });
      }

      const token = generateJwt({
        userId: authRecord.userId,
        email: authRecord.email,
      });

      authRecord.password = undefined;

      return { status: "success", token, data: authRecord };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = new AuthService();
