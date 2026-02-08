const express = require("express");
const {
  addCategory,
  createBudget,
  createAccount,
} = require("./finance.controller");
const { verifyJWT } = require("../../shared/middlewares/auth.middleware");
const router = express.Router();

router.post("/categories/add-category", verifyJWT, addCategory);
router.post("/budgets/create-budget", verifyJWT, createBudget);
router.post("/accounts/create-account", verifyJWT, createAccount);

module.exports = router;
