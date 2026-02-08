const AnalyticsService = require("./analytics.service");

const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, week, startDate, endDate, accountId, type } = req.query;
    const report = await AnalyticsService.getMonthlyReport(
      req.user.userId,
      {
        month,
        week,
        startDate,
        endDate,
        accountId,
        type,
      },
    );
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMonthlyReport };
