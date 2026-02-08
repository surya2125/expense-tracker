class AppError extends Error {
  /**
   * Production-ready AppError
   * @param {string} message - human friendly message
   * @param {number} [statusCode=500]
   * @param {object} [opts]
   * @param {boolean} [opts.isOperational=true] - whether this error is expected and safe to show
   * @param {any} [opts.details] - optional additional details for logs (not sent to clients in prod)
   */
  constructor(message, statusCode = 500, opts = {}) {
    super(message);

    this.statusCode = Number(statusCode) || 500;
    this.status = `${this.statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational =
      opts.isOperational !== undefined ? !!opts.isOperational : true;
    this.details = opts.details || null;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      status: this.status,
      statusCode: this.statusCode,
    };
  }

  // convenience constructors
  static badRequest(message = "Bad Request", details) {
    return new AppError(message, 400, { details });
  }

  static unauthorized(message = "Unauthorized", details) {
    return new AppError(message, 401, { details });
  }

  static forbidden(message = "Forbidden", details) {
    return new AppError(message, 403, { details });
  }

  static notFound(message = "Not Found", details) {
    return new AppError(message, 404, { details });
  }

  static internal(message = "Internal Server Error", details) {
    return new AppError(message, 500, { isOperational: false, details });
  }
}

module.exports = { AppError };
