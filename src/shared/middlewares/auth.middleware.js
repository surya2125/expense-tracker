const jwt = require("jsonwebtoken");
const Auth = require("../../modules/auth/auth.model");
const { AppError } = require("../errors/appError");

const verifyJWT = async (req, res, next) => {
  let token;
  //   console.log(req.headers);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw AppError.badRequest("Unauthorized user", { status: 401 });
  }
  //   console.log(token);

  try {
    const decode = await jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decode);

    const userExist = await Auth.find({ userId: decode.userId });
    if (!userExist) {
      throw AppError.badRequest("Unauthorized user", { status: 401 });
    }

    if (userExist[0].changedPasswordAfter(decode.iat)) {
      throw AppError.badRequest(
        "Password has been Changed. please login again",
        { status: 401 }
      );
    }

    req.user = userExist[0];
    next();
  } catch (err) {
    return next(err);
  }
};
module.exports = { verifyJWT };
