const { AppError } = require("../../shared/errors/appError");
const AnalyticsService = require("./analytics.service");

const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, accountId } = req.query;
    const report = await AnalyticsService.getMonthlyReport(
      req.user.userId,
      month,
      accountId,
    );
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

const getRangeReport = async (req, res, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const report = await AnalyticsService.getRangeReport(
      req.user.userId,
      startDate,
      endDate,
      accountId,
    );
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    const breakdown = await AnalyticsService.getCategoryBreakdown(
      req.user.userId,
      startDate,
      endDate,
      accountId,
    );
    return res.json(breakdown);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMonthlyReport, getRangeReport, getCategoryBreakdown };
