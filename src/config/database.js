'use strict';

const mongoose = require('mongoose');

async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
}

module.exports = connectDB;
