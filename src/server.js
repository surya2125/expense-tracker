require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const connectDB = require("./config/db");
const morgan = require("morgan");
const app = express();
const port = process.env.APP_PORT;

const authRouter = require("./modules/auth/auth.routes");
const financeRouter = require("./modules/finance/finance.routes");
const transactionRouter = require("./modules/transactions/transactions.routes");
const analyticsRouter = require("./modules/analytics/analytics.routes");
const { AppError } = require("./shared/errors/appError");
// const EventConsumer = require("./events/consumer");

connectDB();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "*"],
    credentials: true,
  }),
);

app.use(morgan("dev")); /**used as logger function of incoming req/** */
app.use(express.json()); /**used as parse body of incoming req/** */

// (async () => {
//   const consumer = EventConsumer;
//   await consumer.consume("transaction_created");
// })();

app.use("/api/auth", authRouter);
app.use("/api/finance", financeRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/analytics", analyticsRouter);

/*
 *the below middleware is used to catch all routes and send a json response instead of html file
 */
// forward 404s to the centralized error handler
app.use((req, res, next) =>
  next(AppError.notFound("Can't find the requested resource")),
);

// centralized error handler
app.use(require("./shared/middlewares/error.middleware"));

/**
 * used to check if the app is conected to db.
 */
mongoose.connection.once("open", () => {
  console.log("Connected to mongoDB");
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log(err);
});
