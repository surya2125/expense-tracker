const { AppError } = require("../../shared/errors/appError");
const TransactionsService = require("./transactions.service");

const addTransaction = async (req, res, next) => {
  try {
    const transaction = await TransactionsService.addTransaction(
      req.body,
      req.user.userId
    );
    if (transaction) {
      return res.status(201).json(transaction);
    }
    throw AppError.badRequest("Transaction creation failed", { status: 400 });
  } catch (error) {
    return next(error);
  }
};

module.exports = { addTransaction };
