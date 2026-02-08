const { default: mongoose } = require("mongoose");

const accountSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["CASH", "BANK", "CREDIT_CARD", "WALLET", "SAVINGS"],
      required: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    lastTransactionAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

accountSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Account", accountSchema);
