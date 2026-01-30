const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(`Error: ${error.message}`);
    // process.exit(1); // Do not exit, keep server alive for diagnostics
  }
};

module.exports = connectDB;