import 'server-only';
import { z } from 'zod';
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});
const serverSchema = publicSchema.extend({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(20) });
export function publicEnv() {
  return publicSchema.safeParse(process.env);
}
export function serverEnv() {
  return serverSchema.safeParse(process.env);
}
