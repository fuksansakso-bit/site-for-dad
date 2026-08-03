export const foundationRoles = [
  'GUEST',
  'CUSTOMER',
  'MANAGER',
  'ADMIN',
  'OWNER',
  'SYSTEM_WORKER',
] as const;
export type FoundationRole = (typeof foundationRoles)[number];

export const foundationCapabilities = [
  'foundation.public.read',
  'foundation.identity.self_read',
  'foundation.audit.read',
  'foundation.role.manage',
  'foundation.system.execute',
] as const;
export type FoundationCapability = (typeof foundationCapabilities)[number];

export type PrincipalKind = 'ANONYMOUS' | 'HUMAN' | 'WORKLOAD';

export interface IdentityPrincipal {
  readonly actorId: string | null;
  readonly kind: PrincipalKind;
  readonly roles: readonly FoundationRole[];
  readonly sessionId: string | null;
}

export interface IdentityCredential {
  readonly kind: 'synthetic-session' | 'synthetic-workload';
  readonly token: string;
}

export interface IdentityPort {
  authenticate(credential: IdentityCredential): Promise<IdentityPrincipal>;
  revokeCredential(credential: IdentityCredential, context: AuditContextInput): Promise<void>;
}

export interface PermissionResourceContext {
  readonly ownerActorId?: string;
}

export interface PermissionRequest {
  readonly capability: string;
  readonly principal: IdentityPrincipal;
  readonly resource?: PermissionResourceContext;
}

export interface PermissionDecision {
  readonly outcome: 'ALLOW' | 'DENY';
  readonly reasonCode:
    | 'CAPABILITY_ALLOWED'
    | 'CAPABILITY_UNKNOWN'
    | 'INVALID_PRINCIPAL'
    | 'OBJECT_SCOPE_DENIED'
    | 'ROLE_DENIED';
}

export interface AuditContextInput {
  readonly correlationId: string;
  readonly requestId?: string;
}

export interface IdentityAuditContext extends AuditContextInput {
  readonly actorIdentityId: string | null;
  readonly actorType: 'ANONYMOUS' | 'IDENTITY' | 'SYSTEM_WORKER';
}
