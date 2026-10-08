'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./src/middleware/errorHandler');
const AppError = require('./src/utils/AppError');

// ── Routers ──────────────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const leadRoutes = require('./src/routes/lead.routes');
const customerRoutes = require('./src/routes/customer.routes');
const dealRoutes = require('./src/routes/deal.routes');
const activityRoutes = require('./src/routes/activity.routes');
const timelineRoutes = require('./src/routes/timeline.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const configRoutes = require('./src/routes/config.routes');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
    credentials: true,
  })
);

// ── HTTP request logger ───────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Cookie parser ─────────────────────────────────────────────────────────────
app.use(cookieParser());

// ── Rate limiter on all /api routes ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'CRM API is running' });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ── Global error handler (must be last, 4-arg signature) ─────────────────────
app.use(errorHandler);

module.exports = app;
