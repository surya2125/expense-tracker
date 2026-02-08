const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["EXPENSE", "INCOME", "TRANSFER"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: function () {
        return this.type === "EXPENSE";
      },
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },

    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: function () {
        return this.type === "TRANSFER";
      },
    },

    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: function () {
        return this.type === "TRANSFER";
      },
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    month: {
      type: String,
      index: true,
      function() {
        return dayjs(this.date).format("YYYY-MM");
      },
    },
    note: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        url: String,
        type: String,
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, month: 1 });

transactionSchema.index({ userId: 1, categoryId: 1, month: 1 });

transactionSchema.index({ userId: 1, accountId: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
