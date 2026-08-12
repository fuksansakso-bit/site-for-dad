import type { StaffRole } from './types';
export type Capability = 'ORDERS' | 'CATALOG' | 'PORTFOLIO' | 'SETTINGS' | 'STAFF';
const matrix: Record<StaffRole, Capability[]> = {
  OWNER: ['ORDERS', 'CATALOG', 'PORTFOLIO', 'SETTINGS', 'STAFF'],
  ADMIN: ['ORDERS', 'CATALOG', 'PORTFOLIO', 'SETTINGS'],
  MANAGER: ['ORDERS'],
};
export function can(role: StaffRole, capability: Capability) {
  return matrix[role].includes(capability);
}
