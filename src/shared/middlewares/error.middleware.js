const { AppError } = require("../errors/appError");

const isProd = process.env.NODE_ENV === "production";

function handleMongoError(err) {
  // duplicate key
  if (err.code && err.code === 11000) {
    const keys = Object.keys(err.keyValue || {}).join(", ");
    return new AppError(`Duplicate field value: ${keys}`, 400, {
      details: err.keyValue,
    });
  }

  // validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return new AppError(messages.join(". "), 400, { details: err.errors });
  }

  // cast error (invalid id)
  if (err.name === "CastError") {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400, {
      details: err,
    });
  }

  return null;
}

module.exports = function errorHandler(err, req, res, next) {
  // ensure we always have an Error
  if (!(err instanceof Error)) err = new Error(String(err));

  // normalize AppError-like (backwards compatibility)
  if (!(err instanceof AppError)) {
    const fromMongo = handleMongoError(err);
    if (fromMongo) err = fromMongo;
    else {
      // unknown error -> wrap as non-operational
      err = new AppError(
        err.message || "An error occurred",
        err.statusCode || 500,
        {
          isOperational: false,
          details: err,
        }
      );
    }
  }

  // log full error server-side for debugging/alerts
  // keep logs verbose in non-production
  if (!isProd) {
    console.error(err);
  } else {
    // production: log minimal + details optionally to external system
    console.error({
      message: err.message,
      statusCode: err.statusCode,
      details: err.details || undefined,
    });
  }

  // prepare client-facing payload
  const payload = {
    status: err.status,
    message: err.isOperational ? err.message : "Internal Server Error",
  };

  // include additional data in development
  if (!isProd) {
    payload.error = {
      details: err.details || null,
    };
  }

  res.status(err.statusCode || 500).json(payload);
};
