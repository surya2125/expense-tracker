const express = require("express");
const { verifyJWT } = require("../../shared/middlewares/auth.middleware");
const { addTransaction } = require("./transactions.controller");
const router = express.Router();

router.post("/add-transaction", verifyJWT, addTransaction);

module.exports = router;
