const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Role-based access control middleware
 * @param {string|string[]} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
function authorize(allowedRoles) {
  // Convert single role to array for consistent handling
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    try {
      // Get user role from request (attached by auth middleware)
      const userRole = req.user?.role;
      
      // Check if user has one of the allowed roles
      if (!userRole || !roles.includes(userRole)) {
        logger.warn(`Unauthorized access attempt by ${userRole} to ${req.method} ${req.path}`);
        throw new ForbiddenError('Insufficient permissions');
      }
      
      // If we get here, user is authorized
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user is the owner of the resource or has admin role
 * @param {string} resourceIdParam - Name of the parameter containing the resource ID
 * @param {string} modelName - Name of the model to check ownership against
 * @param {string} [idField='_id'] - Field to use for ID comparison (default: '_id')
 * @returns {Function} Express middleware function
 */
function checkOwnership(resourceIdParam, modelName, idField = '_id') {
  return async (req, res, next) => {
    try {
      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Get the resource ID from request params
      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        throw new BadRequestError(`Missing ${resourceIdParam} parameter`);
      }
      
      // Get the model
      const Model = require(`../models/${modelName}`);
      
      // Find the resource
      const resource = await Model.findOne({
        [idField]: resourceId,
        // For patient-specific resources, check if the user is the patient or a family member
        $or: [
          { patientId: req.user.id },
          { patientId: req.user.patientId } // For family members
        ]
      });
      
      if (!resource) {
        throw new NotFoundError('Resource not found or access denied');
      }
      
      // Attach the resource to the request for use in the route handler
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authorize,
  checkOwnership
};
