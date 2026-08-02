export { createIdentityAuditContext } from './audit.js';
export { IdentityError, identityErrorCodes, type IdentityErrorCode } from './errors.js';
export { authorizePermission, guestPrincipal, requirePermission } from './policy.js';
export {
  foundationCapabilities,
  foundationRoles,
  type AuditContextInput,
  type FoundationCapability,
  type FoundationRole,
  type IdentityAuditContext,
  type IdentityCredential,
  type IdentityPort,
  type IdentityPrincipal,
  type PermissionDecision,
  type PermissionRequest,
  type PermissionResourceContext,
  type PrincipalKind,
} from './types.js';
