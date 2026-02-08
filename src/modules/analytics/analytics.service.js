const dayjs = require("dayjs");
const mongoose = require("mongoose");
const Account = require("../finance/accounts.model");
const MonthlySnapshot = require("./monthlySnapshot.model");
const Transaction = require("../transactions/transactions.model");
const { AppError } = require("../../shared/errors/appError");

class AnalyticsService {
  normalizeAccountId(accountId) {
    if (!accountId) {
      return null;
    }
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new AppError("Valid account ID is required", { status: 400 });
    }
    return new mongoose.Types.ObjectId(accountId);
  }

  async getMonthlyReport(userId, params) {
    return this.getReport({ userId, ...params });
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

  async getReport({
    userId,
    month,
    week,
    startDate,
    endDate,
    accountId,
    type,
  }) {
    if (!userId) {
      throw new AppError("User ID is required", { status: 400 });
    }

    const normalizedAccountId = this.normalizeAccountId(accountId);
    let normalizedType = null;
    if (type) {
      if (!["EXPENSE", "INCOME"].includes(type)) {
        throw new AppError("Type must be EXPENSE or INCOME", { status: 400 });
      }
      normalizedType = type;
    }

    let start;
    let end;

    if (startDate || endDate) {
      if (!startDate || !endDate) {
        throw new AppError("Start date and end date are required", {
          status: 400,
        });
      }
      start = dayjs(startDate).startOf("day");
      end = dayjs(endDate).endOf("day");
    } else if (month) {
      start = dayjs(month).startOf("month");
      end = dayjs(month).endOf("month");
    } else if (week) {
      start = dayjs(week).startOf("week");
      end = dayjs(week).endOf("week");
    } else {
      throw new AppError("Month, week, or date range is required", {
        status: 400,
      });
    }

    if (!start.isValid() || !end.isValid()) {
      throw new AppError("Invalid date range", { status: 400 });
    }

    if (normalizedAccountId) {
      const account = await Account.findOne({
        _id: normalizedAccountId,
        userId,
      }).lean();
      if (!account) {
        throw new AppError("Account not found", { status: 404 });
      }
    }

    const matchBase = {
      userId,
      isDeleted: false,
    };

    if (normalizedAccountId) {
      matchBase.accountId = normalizedAccountId;
    }

    const openingAgg = await Transaction.aggregate([
      {
        $match: {
          ...matchBase,
          date: { $lt: start.toDate() },
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
                    case: { $eq: ["$type", "INCOME"] },
                    then: "$amount",
                  },
                  {
                    case: { $eq: ["$type", "EXPENSE"] },
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

    const rangeMatch = {
      ...matchBase,
      date: { $gte: start.toDate(), $lte: end.toDate() },
      ...(normalizedType ? { type: normalizedType } : {}),
    };

    const totalsAgg = await Transaction.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0],
            },
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const income = totalsAgg[0]?.income || 0;
    const expense = totalsAgg[0]?.expense || 0;
    const cashflow = income - expense;
    const closingBalance = openingBalance + cashflow;

    const spendType = normalizedType || "EXPENSE";
    const highestDayAgg = await Transaction.aggregate([
      { $match: { ...rangeMatch, type: spendType } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);

    const highestDay = highestDayAgg[0]
      ? { date: highestDayAgg[0]._id, total: highestDayAgg[0].total }
      : null;

    const highestTransactionAgg = await Transaction.aggregate([
      { $match: { ...rangeMatch, type: spendType } },
      { $sort: { amount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          transactionId: "$_id",
          amount: 1,
          date: 1,
          type: 1,
          accountId: 1,
          categoryId: 1,
          categoryName: "$category.name",
        },
      },
    ]);

    const highestTransaction = highestTransactionAgg[0] || null;

    let categoryBreakdown = [];
    let highestCategory = null;

    if (spendType === "EXPENSE") {
      const categoryAgg = await Transaction.aggregate([
        {
          $match: {
            ...rangeMatch,
            type: spendType,
          },
        },
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

      categoryBreakdown = categoryAgg;
      if (categoryAgg[0]) {
        highestCategory = {
          categoryId: categoryAgg[0].categoryId,
          categoryName: categoryAgg[0].categoryName,
          total: categoryAgg[0].total,
        };
      }
    }

    return {
      userId,
      accountId: normalizedAccountId,
      range: {
        startDate: start.toDate(),
        endDate: end.toDate(),
      },
      type: normalizedType,
      openingBalance,
      income,
      expense,
      cashflow,
      closingBalance,
      highestDay,
      highestTransaction,
      highestCategory,
      categoryBreakdown,
    };
  }
}

module.exports = new AnalyticsService();
