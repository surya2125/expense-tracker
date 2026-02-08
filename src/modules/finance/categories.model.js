const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate category names per user
categorySchema.index(
  { userId: 1, name: 1, parentCategoryId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Category", categorySchema);
