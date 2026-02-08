const dayjs = require("dayjs");
const Account = require("../finance/accounts.model");
const MonthlySnapshot = require("./monthlySnapshot.model");
const Transaction = require("../transactions/transactions.model");
const { AppError } = require("../../shared/errors/appError");

class AnalyticsService {
  async getMonthlyReport(userId, month, accountId) {
    if (!userId || !month) {
      throw new AppError("User ID and month are required", { status: 400 });
    }
    try {
      const account = await Account.findById(accountId).lean();
      if (!account) throw new Error("Account not found");
      let snapshot = await MonthlySnapshot.findOne({
        userId,
        accountId,
        month,
      });

      const isStale =
        !snapshot ||
        (account.lastTransactionAt &&
          snapshot.lastComputedAt < account.lastTransactionAt);

      if (isStale) {
        snapshot = await this.recomputeMonthlySnapshot(
          userId,
          accountId,
          month,
        );
      }
      return snapshot;
    } catch (err) {
      throw err;
    }
  }

  async recomputeMonthlySnapshot(userId, accountId, month) {
    const start = dayjs(month).startOf("month").toDate();
    const end = dayjs(month).endOf("month").toDate();
    console.log(start);
    console.log(end);

    // 1. Opening balance = all history BEFORE this month
    const openingAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          date: { $lt: start },
          $or: [
            { accountId },
            // { fromAccountId: accountId },
            // { toAccountId: accountId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          balance: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $eq: ["$type", "INCOME"] },
                        { $eq: ["$accountId", accountId] },
                      ],
                    },
                    then: "$amount",
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$type", "EXPENSE"] },
                        { $eq: ["$accountId", accountId] },
                      ],
                    },
                    then: { $multiply: ["$amount", -1] },
                  },
                  //   {
                  //     case: { $eq: ["$fromAccountId", accountId] },
                  //     then: { $multiply: ["$amount", -1] },
                  //   },
                  //   {
                  //     case: { $eq: ["$toAccountId", accountId] },
                  //     then: "$amount",
                  //   },
                ],
                default: 0,
              },
            },
          },
        },
      },
    ]);

    const openingBalance = openingAgg[0]?.balance || 0;

    // 2. Monthly cashflow
    const monthlyAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          date: { $gte: start, $lte: end },
          $or: [
            { accountId },
            // { fromAccountId: accountId },
            // { toAccountId: accountId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$type", "INCOME"] },
                        { $eq: ["$accountId", accountId] },
                      ],
                    },
                    // { $eq: ["$toAccountId", accountId] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          expense: {
            $sum: {
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$type", "EXPENSE"] },
                        { $eq: ["$accountId", accountId] },
                      ],
                    },
                    // { $eq: ["$fromAccountId", accountId] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const income = monthlyAgg[0]?.income || 0;
    const expense = monthlyAgg[0]?.expense || 0;

    const cashflow = income - expense;
    const closingBalance = openingBalance + cashflow;

    return MonthlySnapshot.findOneAndUpdate(
      { userId, accountId, month },
      {
        userId,
        accountId,
        month,
        openingBalance,
        income,
        expense,
        cashflow,
        closingBalance,
        lastComputedAt: new Date(),
      },
      { upsert: true, new: true },
    );
  }
}

module.exports = new AnalyticsService();
