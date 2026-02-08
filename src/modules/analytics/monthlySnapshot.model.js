const mongoose = require("mongoose");

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    openingBalance: Number,
    income: Number,
    expense: Number,
    cashflow: Number,
    closingBalance: Number,

    lastComputedAt: Date,
    lastTransactionAt: Date,
  },
  { timestamps: true },
);

analyticsSnapshotSchema.index(
  { userId: 1, month: 1, accountId: 1 },
  { unique: true },
);

module.exports = mongoose.model("AnalyticsSnapshot", analyticsSnapshotSchema);
