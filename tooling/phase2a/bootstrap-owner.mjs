import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve('apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');

const email = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_OWNER_PASSWORD;
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !password || !url || !serviceKey) {
  throw new Error(
    'INITIAL_OWNER_EMAIL, INITIAL_OWNER_PASSWORD, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
  );
}
if (password.length < 10)
  throw new Error('Initial owner password must contain at least 10 characters');

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let user;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (data.users.length < 100) break;
}
if (user) {
  const { data, error } = await client.auth.admin.updateUserById(user.id, {
    email_confirm: true,
    password,
  });
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (error || !data.user) throw error ?? new Error('Supabase did not return the created user');
  user = data.user;
}
const { error: profileError } = await client.from('staff_profiles').upsert(
  {
    auth_user_id: user.id,
    display_name: 'Рамзан Батаев',
    is_active: true,
    must_change_password: false,
    role: 'OWNER',
  },
  { onConflict: 'auth_user_id' },
);
if (profileError) throw profileError;
console.log(JSON.stringify({ role: 'OWNER', status: 'ready' }));
