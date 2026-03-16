'use strict';

/**
 * src/middleware/errorHandler.js
 *
 * Global Express error-handling middleware.
 *
 * Express identifies error handlers by their 4-argument signature: (err, req, res, next).
 * This must be registered LAST, after all routes and other middleware.
 *
 * Behaviour:
 * - Operational errors (AppError subclasses) → use their statusCode + message
 * - Prisma known request errors → map to 4xx responses
 * - Everything else → 500 Internal Server Error (details hidden in production)
 */

const { Prisma } = require('@prisma/client');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // ── Operational errors (intentionally thrown) ───────────────
  if (err.isOperational) {
    logger.warn(
      { err: { message: err.message, code: err.code }, path: req.path, method: req.method },
      'Operational error'
    );

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // ── Prisma errors ────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ err }, 'Prisma validation error');
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid data provided', code: 'INVALID_DATA' },
    });
  }

  // ── JWT library errors (not caught in jwt.js) ────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' },
    });
  }

  // ── Unknown / programming errors ─────────────────────────────
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    error: {
      message: config.isProduction ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
      ...(config.isDevelopment && { stack: err.stack }),
    },
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = err.meta?.target?.join(', ') || 'field';
      return res.status(409).json({
        success: false,
        error: { message: `A record with this ${field} already exists`, code: 'CONFLICT' },
      });
    }
    case 'P2025':
      // Record not found (e.g. update/delete on missing record)
      return res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      });
    case 'P2003':
      return res.status(400).json({
        success: false,
        error: { message: 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' },
      });
    default:
      logger.error({ err }, 'Unhandled Prisma error');
      return res.status(500).json({
        success: false,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });
  }
}

module.exports = errorHandler;
