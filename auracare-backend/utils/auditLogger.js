const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {string} options.action - Action performed (e.g., 'create', 'update', 'delete')
 * @param {string} options.entity - Entity type (e.g., 'Patient', 'Alert')
 * @param {string} options.entityId - ID of the affected entity
 * @param {Object} options.user - User performing the action
 * @param {Object} options.changes - Object containing changes (for updates)
 * @param {string} options.status - Status of the action ('success' or 'failure')
 * @param {string} options.ip - IP address of the requester
 * @param {string} options.userAgent - User agent of the requester
 * @param {Object} options.metadata - Additional metadata
 * @returns {Promise<Object>} The created audit log entry
 */
async function logAudit({
  action,
  entity,
  entityId,
  user,
  changes = {},
  status = 'success',
  ip = '',
  userAgent = '',
  metadata = {}
}) {
  try {
    const auditLog = new AuditLog({
      action,
      entity,
      entityId,
      userId: user?.id,
      userRole: user?.role,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      status,
      ip,
      userAgent,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      timestamp: new Date()
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw to avoid breaking the main operation
    return null;
  }
}

/**
 * Middleware to log API requests
 */
function auditMiddleware(req, res, next) {
  // Skip logging for health checks and other non-API routes
  if (req.path === '/health' || !req.path.startsWith('/api/')) {
    return next();
  }

  // Capture response data
  const originalSend = res.send;
  const startTime = Date.now();
  
  res.send = function (body) {
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log the request
    logAudit({
      action: req.method,
      entity: req.baseUrl + req.path,
      entityId: req.params.id || null,
      user: req.user || { id: 'anonymous', role: 'guest' },
      status: res.statusCode < 400 ? 'success' : 'error',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || '',
      metadata: {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        params: Object.keys(req.params).length > 0 ? req.params : undefined,
        // Don't log potentially sensitive request body for certain endpoints
        requestBody: ['POST', 'PUT', 'PATCH'].includes(req.method) && 
                    !['/api/auth/login', '/api/auth/register'].includes(req.path) ? 
                    req.body : undefined
      }
    }).catch(error => {
      logger.error('Error in audit middleware:', error);
    });
    
    // Call the original send function
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Wrapper for async route handlers to ensure errors are caught and logged
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Log the error
      await logAudit({
        action: req.method,
        entity: req.baseUrl + req.path,
        entityId: req.params.id || null,
        user: req.user || { id: 'anonymous', role: 'guest' },
        status: 'error',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        metadata: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
      
      // Pass to error handler
      next(error);
    }
  };
}

module.exports = {
  logAudit,
  auditMiddleware,
  asyncHandler
};
