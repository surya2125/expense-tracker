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

module.exports = { getMonthlyReport };
