const logger = require('./logger');

class BaseError extends Error {
  constructor(message, statusCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
    
    logger.error(`${this.statusCode} - ${this.message}`);
  }
}

// 400 Bad Request
class BadRequestError extends BaseError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// 401 Unauthorized
class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// 403 Forbidden
class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// 404 Not Found
class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// 409 Conflict
class ConflictError extends BaseError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

// 422 Unprocessable Entity
class ValidationError extends BaseError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

// 429 Too Many Requests
class RateLimitError extends BaseError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

// 500 Internal Server Error
class InternalServerError extends BaseError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

// 503 Service Unavailable
class ServiceUnavailableError extends BaseError {
  constructor(message = 'Service Unavailable') {
    super(message, 503);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code not set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    err = new ValidationError('Validation failed', errors);
  } else if (err.name === 'JsonWebTokenError') {
    err = new UnauthorizedError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    err = new UnauthorizedError('Token expired');
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    err = new ConflictError(`${field} '${value}' is already in use`);
  }

  // Log the error
  logger.error(err);

  // Send error response
  if (req.originalUrl.startsWith('/api')) {
    // API error response
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(err.errors && { errors: err.errors })
    });
  }

  // Rendered website error page (if applicable)
  // res.status(err.statusCode).render('error', {
  //   title: 'Something went wrong!',
  //   msg: err.message
  // });
};

module.exports = {
  BaseError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  errorHandler
};
