const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Account = require("../finance/accounts.model");
const MonthlySnapshot = require("./monthlySnapshot.model");
const Transaction = require("../transactions/transactions.model");
const { AppError } = require("../../shared/errors/appError");

class AnalyticsService {
  normalizeAccountId(accountId) {
    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      throw new AppError("Valid account ID is required", { status: 400 });
    }
    return new mongoose.Types.ObjectId(accountId);
  }

  async getMonthlyReport(userId, month, accountId) {
    if (!userId || !month) {
      throw new AppError("User ID and month are required", { status: 400 });
    }
    try {
      const normalizedAccountId = this.normalizeAccountId(accountId);
      const account = await Account.findOne({
        _id: normalizedAccountId,
        userId,
      }).lean();
      if (!account) {
        throw new AppError("Account not found", { status: 404 });
      }
      let snapshot = await MonthlySnapshot.findOne({
        userId,
        accountId: normalizedAccountId,
        month,
      });

      const isStale =
        !snapshot ||
        (account.lastTransactionAt &&
          snapshot.lastComputedAt < account.lastTransactionAt);

      if (isStale) {
        snapshot = await this.recomputeMonthlySnapshot(
          userId,
          normalizedAccountId,
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

  async getRangeReport(userId, startDate, endDate, accountId) {
    if (!userId || !startDate || !endDate) {
      throw new AppError("User ID, start date, and end date are required", {
        status: 400,
      });
    }

    const normalizedAccountId = this.normalizeAccountId(accountId);
    const start = dayjs(startDate).startOf("day").toDate();
    const end = dayjs(endDate).endOf("day").toDate();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError("Invalid date range", { status: 400 });
    }

    const openingAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          date: { $lt: start },
          $or: [{ accountId: normalizedAccountId }],
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
                        { $eq: ["$accountId", normalizedAccountId] },
                      ],
                    },
                    then: "$amount",
                  },
                  {
                    case: {
                      $and: [
                        { $eq: ["$type", "EXPENSE"] },
                        { $eq: ["$accountId", normalizedAccountId] },
                      ],
                    },
                    then: { $multiply: ["$amount", -1] },
                  },
                ],
                default: 0,
              },
            },
          },
        },
      },
    ]);

    const openingBalance = openingAgg[0]?.balance || 0;

    const rangeAgg = await Transaction.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          date: { $gte: start, $lte: end },
          $or: [{ accountId: normalizedAccountId }],
        },
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "INCOME"] },
                    { $eq: ["$accountId", normalizedAccountId] },
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
                  $and: [
                    { $eq: ["$type", "EXPENSE"] },
                    { $eq: ["$accountId", normalizedAccountId] },
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

    const income = rangeAgg[0]?.income || 0;
    const expense = rangeAgg[0]?.expense || 0;
    const cashflow = income - expense;

    return {
      userId,
      accountId: normalizedAccountId,
      startDate: start,
      endDate: end,
      openingBalance,
      income,
      expense,
      cashflow,
      closingBalance: openingBalance + cashflow,
    };
  }

  async getCategoryBreakdown(userId, startDate, endDate, accountId) {
    if (!userId || !startDate || !endDate) {
      throw new AppError("User ID, start date, and end date are required", {
        status: 400,
      });
    }

    const normalizedAccountId = accountId
      ? this.normalizeAccountId(accountId)
      : null;
    const start = dayjs(startDate).startOf("day").toDate();
    const end = dayjs(endDate).endOf("day").toDate();

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError("Invalid date range", { status: 400 });
    }

    const match = {
      userId,
      isDeleted: false,
      type: "EXPENSE",
      date: { $gte: start, $lte: end },
    };

    if (normalizedAccountId) {
      match.accountId = normalizedAccountId;
    }

    return Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$category.name",
          total: 1,
          transactionCount: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);
  }
}

module.exports = new AnalyticsService();
