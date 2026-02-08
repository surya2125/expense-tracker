const mongoose = require("mongoose");

/**
 * the below function is used to connect mongodb
 */

const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URI;
    await mongoose.connect(uri);
  } catch (err) {
    console.log(err);
  }
};

module.exports = connectDB;
