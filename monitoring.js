// ==================== PRODUCTION MONITORING & ERROR TRACKING ====================
// Sentry integration for error tracking, APM, and performance monitoring
// Winston for structured logging

const Sentry = require("@sentry/node");
const winston = require("winston");
require("dotenv").config();

// ==================== WINSTON LOGGER ====================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "village-api" },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, meta }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    // Write errors to error.log
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// ==================== SENTRY INITIALIZATION ====================
const initializeSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    logger.warn("Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || "0.1"),
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event, hint) {
      // Filter out 404 errors
      if (event.exception) {
        const error = hint.originalException;
        if (error?.status === 404) return null;
      }
      return event;
    },
  });

  // Attach Sentry to Express
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  logger.info("✅ Sentry APM initialized successfully");
};

// ==================== ERROR HANDLING MIDDLEWARE ====================
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Capture error in Sentry
  Sentry.captureException(err, {
    contexts: {
      express: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
      },
    },
  });

  // Don't expose error details in production
  const statusCode = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    errorId: Sentry.getCurrentHub().getClient().lastEventId(),
    environment: process.env.NODE_ENV,
  });
};

// ==================== REQUEST LOGGING MIDDLEWARE ====================
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || req.apiKeyId || "anonymous",
    };

    if (res.statusCode >= 400) {
      logger.warn("Request Error", logData);
    } else {
      logger.info("Request", logData);
    }
  });

  next();
};

// ==================== PERFORMANCE MONITORING ====================
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to ms

    // Log slow queries (>1000ms)
    if (duration > 1000) {
      logger.warn({
        message: "Slow Request Detected",
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        status: res.statusCode,
      });

      // Send to Sentry for analysis
      Sentry.captureMessage(`Slow request: ${req.path} took ${duration}ms`, "warning");
    }

    // Add timing header
    res.setHeader("X-Response-Time", `${duration.toFixed(2)}ms`);
  });

  next();
};

// ==================== HEALTH CHECK DATA ====================
let serverHealthData = {
  startTime: new Date(),
  requestsProcessed: 0,
  errorsOccurred: 0,
  databaseConnected: false,
  cacheConnected: false,
};

const updateHealthData = (metric, value) => {
  serverHealthData[metric] = value;
};

const getHealthStatus = () => ({
  success: true,
  status: serverHealthData.databaseConnected ? "operational" : "degraded",
  timestamp: new Date().toISOString(),
  uptime: formatUptime(Date.now() - serverHealthData.startTime.getTime()),
  database: serverHealthData.databaseConnected ? "connected" : "disconnected",
  cache:
    serverHealthData.cacheConnected === "in-memory"
      ? "in-memory fallback"
      : serverHealthData.cacheConnected
        ? "redis"
        : "disconnected",
  requests: serverHealthData.requestsProcessed,
  errors: serverHealthData.errorsOccurred,
  environment: process.env.NODE_ENV,
  version: process.env.npm_package_version || "1.0.0",
  memory: process.memoryUsage(),
});

const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// ==================== UNCAUGHT ERROR HANDLERS ====================
const setupUnhandledErrorHandlers = () => {
  process.on("uncaughtException", (err) => {
    logger.error({
      message: "Uncaught Exception",
      error: err.message,
      stack: err.stack,
    });
    Sentry.captureException(err);
    // Exit process after logging
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error({
      message: "Unhandled Rejection",
      reason,
      promise: promise.toString(),
    });
    Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
  });
};

// ==================== EXPORTS ====================
module.exports = {
  initializeSentry,
  errorHandler,
  requestLogger,
  performanceMonitor,
  Sentry,
  logger,
  updateHealthData,
  getHealthStatus,
  setupUnhandledErrorHandlers,
};
