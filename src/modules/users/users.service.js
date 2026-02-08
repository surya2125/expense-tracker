const User = require("./users.model");
const { AppError } = require("../../shared/errors/appError");

class UserService {
  async createUser(userData, options = {}) {
    if (!userData) {
      throw AppError.badRequest("User data is required");
    }
    const session = options.session;
    let user;
    if (session) {
      user = await new User(userData).save({ session });
    } else {
      user = await User.create(userData);
    }
    return user;
  }
}

module.exports = new UserService();
