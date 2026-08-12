import type { StaffRole } from './types';
export type Capability = 'ORDERS' | 'CATALOG' | 'PORTFOLIO' | 'SETTINGS' | 'STAFF' | 'AI_VISUALIZATIONS';
const matrix: Record<StaffRole, Capability[]> = {
  OWNER: ['ORDERS', 'CATALOG', 'PORTFOLIO', 'SETTINGS', 'STAFF', 'AI_VISUALIZATIONS'],
  ADMIN: ['ORDERS', 'CATALOG', 'PORTFOLIO', 'SETTINGS', 'AI_VISUALIZATIONS'],
  MANAGER: ['ORDERS', 'AI_VISUALIZATIONS'],
};
export function can(role: StaffRole, capability: Capability) {
  return matrix[role].includes(capability);
}
