import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase';
import type { StaffRole } from './types';
export type Staff = {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  must_change_password: boolean;
};
export async function currentStaff(): Promise<Staff | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: claims } = await client.auth.getClaims();
  const subject = claims?.claims?.sub;
  if (!subject) return null;
  const { data } = await client
    .from('staff_profiles')
    .select('id,auth_user_id,display_name,role,is_active,must_change_password')
    .eq('auth_user_id', subject)
    .eq('is_active', true)
    .maybeSingle();
  return data as Staff | null;
}
export async function requireStaff(roles: StaffRole[] = ['OWNER', 'ADMIN', 'MANAGER']) {
  const staff = await currentStaff();
  if (!staff || !roles.includes(staff.role)) redirect('/admin/login');
  return staff;
}
