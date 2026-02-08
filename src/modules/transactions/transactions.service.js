const { AppError } = require("../../shared/errors/appError");
const Transaction = require("./transactions.model");
const Finance = require("../finance/finance.service");
const EventPublisher = require("../../events/publisher");
const { default: mongoose } = require("mongoose");

class TransactionService {
  async addTransaction(transactionData, userId) {
    if (!transactionData) {
      throw AppError.badRequest("Transaction data is required", {
        status: 400,
      });
    }
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const { type, amount } = transactionData;

        if (!["INCOME", "EXPENSE", "TRANSFER", "SAVING"].includes(type)) {
          throw AppError.badRequest("Invalid transaction type");
        }

        if (!amount || amount <= 0) {
          throw AppError.badRequest("Amount must be greater than zero");
        }

        // Handle Transfer or Saving
        if (type === "TRANSFER" || type === "SAVING") {
          const { fromAccountId, toAccountId } = transactionData;
          if (!fromAccountId || !toAccountId) {
            throw AppError.badRequest(
              "Both fromAccountId and toAccountId are required for Transfer or Saving transactions",
            );
          }

          await Finance.applyTransfer({
            fromAccountId,
            toAccountId,
            amount,
            session,
            userId,
          });
        }

        // Handle Income/Expense
        await Finance.updateAccountBalance({
          account: transactionData,
          type,
          amount,
          session,
          userId,
        });

        const transactionDoc = new Transaction({ ...transactionData, userId });
        await transactionDoc.save({ session });
        return transactionDoc;
      });
      return result;
    } catch (err) {
      throw err;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new TransactionService();
