const express = require("express");
const {
  getMonthlyReport,
  getRangeReport,
  getCategoryBreakdown,
} = require("./analytics.controller");
const { verifyJWT } = require("../../shared/middlewares/auth.middleware");
const router = express.Router();

router.get("/monthly-report", verifyJWT, getMonthlyReport);
router.get("/range-report", verifyJWT, getRangeReport);
router.get("/category-breakdown", verifyJWT, getCategoryBreakdown);

module.exports = router;
