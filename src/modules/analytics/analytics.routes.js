const express = require("express");
const { getMonthlyReport } = require("./analytics.controller");
const { verifyJWT } = require("../../shared/middlewares/auth.middleware");
const router = express.Router();

router.get("/monthly-report", verifyJWT, getMonthlyReport);

module.exports = router;
