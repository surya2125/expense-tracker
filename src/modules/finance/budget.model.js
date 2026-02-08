const { default: mongoose } = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    period: {
      type: String,
      enum: ["MONTHLY"],
      default: "MONTHLY",
    },

    month: {
      type: String, // YYYY-MM
      required: true,
      index: true,
    },

    alertThresholds: {
      type: [Number],
      default: [80, 100],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * One budget per scope per month
 */
budgetSchema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
