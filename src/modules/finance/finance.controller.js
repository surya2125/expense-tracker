const { AppError } = require("../../shared/errors/appError");
const FinanceService = require("./finance.service");

const addCategory = async (req, res, next) => {
  try {
    const category = await FinanceService.addCategory(
      req.body,
      req.user.userId
    );

    if (category) {
      return res.status(201).json(category);
    }
    throw AppError.badRequest("Category creation failed", { status: 400 });
  } catch (error) {
    return next(error);
  }
};

const createBudget = async (req, res, next) => {
  try {
    const budget = await FinanceService.createBudget(req.body, req.user.userId);
    if (budget) {
      return res.status(201).json(budget);
    }
    throw AppError.badRequest("Budget creation failed", { status: 400 });
  } catch (error) {
    return next(error);
  }
};

const createAccount = async (req, res, next) => {
  try {
    if (req.body.categories && req.body.categories.length > 0) {
      const validCategories = await FinanceService.validateCategories(
        req.body.categories,
        req.user.userId
      );
      if (!validCategories) {
        throw AppError.badRequest("One or more categories are invalid", {
          status: 400,
        });
      }
    }
    const account = await FinanceService.createAccount(
      req.body,
      req.user.userId
    );
    if (account) {
      return res.status(201).json(account);
    }
    throw AppError.badRequest("Account creation failed", { status: 400 });
  } catch (error) {
    return next(error);
  }
};

module.exports = { addCategory, createBudget, createAccount };
