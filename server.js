'use strict';

require('dotenv').config();

const app = require('./app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`
      );
    });

    // ── Graceful shutdown on unhandled promise rejections ─────────────────────
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // ── Graceful shutdown on uncaught exceptions ──────────────────────────────
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err.name, err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
};

start();
