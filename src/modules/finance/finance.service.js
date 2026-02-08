const { AppError } = require("../../shared/errors/appError");
const Category = require("./categories.model");
const Budget = require("./budget.model");
const Account = require("./accounts.model");
const mongoose = require("mongoose");

class FinanceService {
  async addCategory(categoryData, userId) {
    if (!categoryData) {
      throw AppError.badRequest("Category data is required", { status: 400 });
    }
    const session = await mongoose.startSession();
    let createdCategory = null;
    try {
      await session.withTransaction(async () => {
        const [parent] = await Category.create(
          [
            {
              userId,
              name: categoryData.name,
              level: 0,
              parentCategoryId: null,
              accountId: categoryData.accountId || null,
            },
          ],
          { session },
        );
        if (categoryData.subcategories?.length) {
          const children = categoryData.subcategories.map((sub) => ({
            userId,
            name: sub.name,
            parentCategoryId: parent._id,
            level: 1,
          }));

          await Category.insertMany(children, { session });
        }

        await session.commitTransaction();
        createdCategory = parent;
      });
      return createdCategory;
    } catch (err) {
      throw err;
    } finally {
      session.endSession();
    }
  }

  async createBudget(budgetData, userId) {
    if (!budgetData) {
      throw AppError.badRequest("Budget data is required", { status: 400 });
    }
    try {
      const budgetDoc = new Budget({ ...budgetData, userId });
      await budgetDoc.save();
      return budgetDoc;
    } catch (err) {
      throw err;
    }
  }

  async createAccount(accountData, userId) {
    if (!accountData) {
      throw AppError.badRequest("Account data is required", { status: 400 });
    }
    try {
      const accountDoc = new Account({
        ...accountData,
        userId,
        currentBalance: accountData.openingBalance || 0,
      });
      await accountDoc.save();
      return accountDoc;
    } catch (err) {
      throw err;
    }
  }

  async updateAccountBalance({ account, type, amount, session, userId }) {
    let inc = 0;

    if (account.type === "CREDIT_CARD") {
      if (type === "EXPENSE") inc = amount;
      else throw AppError.badRequest("Invalid credit card operation");
    } else {
      if (type === "INCOME") inc = amount;
      if (type === "EXPENSE") inc = -amount;
    }

    await Account.updateOne(
      { _id: account.accountId, userId },
      {
        $inc: { currentBalance: inc },
        $set: { lastTransactionAt: new Date() },
      },
      { session },
    );
  }

  async validateCategories(categoryIds, userId) {
    const count = await Category.countDocuments({
      _id: { $in: categoryIds },
      userId,
    });
    return count === categoryIds.length;
  }

  async applyTransfer({ fromAccountId, toAccountId, amount, session, userId }) {
    await Account.updateOne(
      { _id: fromAccountId, userId },
      { $inc: { currentBalance: -amount } },
      { session },
    );

    await Account.updateOne(
      { _id: toAccountId },
      { $inc: { currentBalance: amount } },
      { session },
    );
  }
}

module.exports = new FinanceService();
