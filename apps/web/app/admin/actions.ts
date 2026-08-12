'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseAdminClient, createSupabaseServerClient } from '../../lib/phase2a/supabase';
import { requireStaff, type Staff } from '../../lib/phase2a/staff';

const uuid = z.string().uuid();
const safeStoragePath = z.string().regex(/^[a-z0-9][a-z0-9/_-]*\.webp$/u);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(160);

function rublesToKopecks(value: FormDataEntryValue | null): number {
  const normalized = String(value ?? '').replace(',', '.');
  if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) throw new Error('INVALID_PRICE');
  const [rubles = '0', kopecks = ''] = normalized.split('.');
  const result = Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < 1 || result > 2_000_000_000) {
    throw new Error('INVALID_PRICE');
  }
  return result;
}

async function audit(
  staff: Staff,
  action: string,
  entity: string,
  entityId: string | null,
  safeDiff: Record<string, unknown>,
): Promise<void> {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('admin_audit_log').insert({
    action,
    actor_auth_user_id: staff.auth_user_id,
    actor_display_name: staff.display_name,
    entity,
    entity_id: entityId,
    safe_diff: safeDiff,
  });
  if (error) throw new Error('AUDIT_WRITE_FAILED');
}

async function rasterToWebp(file: File): Promise<Uint8Array> {
  if (file.size < 1 || file.size > 3 * 1024 * 1024) throw new Error('UNSAFE_UPLOAD_SIZE');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('UNSAFE_UPLOAD_TYPE');
  }
  // @ts-expect-error sharp 0.35.0 ships declarations but omits the `types` export condition.
  const { default: sharp } = await import('sharp');
  try {
    return await sharp(await file.arrayBuffer(), {
      failOn: 'warning',
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({ fit: 'inside', height: 1600, width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error('UNSAFE_UPLOAD_CONTENT');
  }
}

async function uploadRaster(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  bucket: 'branding' | 'portfolio',
  prefix: string,
  file: File,
): Promise<string> {
  const bytes = await rasterToWebp(file);
  const path = safeStoragePath.parse(`${prefix}/${crypto.randomUUID()}.webp`);
  const { error } = await client.storage.from(bucket).upload(path, bytes, {
    cacheControl: '31536000',
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw new Error('STORAGE_UPLOAD_FAILED');
  return path;
}

export async function createCategory(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const categorySlug = slug.parse(form.get('slug'));
  const item = {
    description: z.string().trim().max(2000).parse(form.get('description')) || null,
    is_published: form.get('published') === 'on',
    name: z.string().trim().min(1).max(160).parse(form.get('name')),
    legacy_source_id: `admin:${categorySlug}`,
    slug: categorySlug,
    sort_order: z.coerce.number().int().min(0).max(100_000).parse(form.get('sortOrder')),
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await client.from('categories').insert(item).select('id').single();
  if (error || !data) throw new Error('CATEGORY_CREATE_FAILED');
  await audit(staff, 'CATEGORY_CREATED', 'categories', data.id, {
    is_published: item.is_published,
    slug: item.slug,
  });
  revalidatePath('/admin/materials');
  revalidatePath('/catalog');
}

export async function updateCategory(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const id = uuid.parse(form.get('id'));
  const update = {
    description: z.string().trim().max(2000).parse(form.get('description')) || null,
    is_published: form.get('published') === 'on',
    name: z.string().trim().min(1).max(160).parse(form.get('name')),
    sort_order: z.coerce.number().int().min(0).max(100_000).parse(form.get('sortOrder')),
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('categories').update(update).eq('id', id);
  if (error) throw new Error('CATEGORY_UPDATE_FAILED');
  await audit(staff, 'CATEGORY_UPDATED', 'categories', id, update);
  revalidatePath('/admin/materials');
  revalidatePath('/catalog');
}

export async function updateMaterial(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const id = uuid.parse(form.get('id'));
  const mode = z.enum(['AREA', 'FIXED', 'MANUAL']).parse(form.get('pricingMode'));
  const price = mode === 'MANUAL' ? null : rublesToKopecks(form.get('price'));
  const update = {
    availability: z
      .enum(['AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY'])
      .parse(form.get('availability')),
    fixed_price_kopecks: mode === 'FIXED' ? price : null,
    is_published: form.get('published') === 'on',
    minimum_price_kopecks: mode === 'AREA' ? 150_000 : null,
    price_per_m2_kopecks: mode === 'AREA' ? price : null,
    pricing_mode: mode,
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('materials').update(update).eq('id', id);
  if (error) throw new Error('MATERIAL_UPDATE_FAILED');
  await audit(staff, 'MATERIAL_UPDATED', 'materials', id, update);
  revalidatePath('/admin/materials');
  revalidatePath('/catalog');
}

export async function updateOrder(form: FormData): Promise<void> {
  const staff = await requireStaff();
  const id = uuid.parse(form.get('id'));
  const update = {
    internal_note: z.string().max(4000).parse(form.get('note')) || null,
    status: z
      .enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'COMPLETED', 'CANCELLED'])
      .parse(form.get('status')),
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('orders').update(update).eq('id', id);
  if (error) throw new Error('ORDER_UPDATE_FAILED');
  await audit(staff, 'ORDER_UPDATED', 'orders', id, { status: update.status });
  revalidatePath('/admin/orders');
}

export async function updateSettings(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const logo = form.get('logo');
  const logoPath =
    logo instanceof File && logo.size > 0
      ? await uploadRaster(client, 'branding', 'logos', logo)
      : null;
  const update = {
    free_delivery: form.get('delivery') === 'on',
    free_installation: form.get('installation') === 'on',
    free_measurement: form.get('measurement') === 'on',
    installment_text: z.string().trim().min(1).max(1000).parse(form.get('installment')),
    lead_time_text: z.string().trim().min(1).max(160).parse(form.get('leadTime')),
    phone: z
      .string()
      .regex(/^\+7[0-9]{10}$/u)
      .parse(form.get('phone')),
    region: z.string().trim().min(1).max(160).parse(form.get('region')),
    site_name: z.string().trim().min(1).max(160).parse(form.get('siteName')),
    warranty_text: z.string().trim().min(1).max(160).parse(form.get('warranty')),
    whatsapp_phone: z
      .string()
      .regex(/^7[0-9]{10}$/u)
      .parse(form.get('whatsapp')),
    ...(logoPath === null ? {} : { logo_path: logoPath }),
  };
  const { error } = await client.from('site_settings').update(update).eq('id', true);
  if (error) throw new Error('SETTINGS_UPDATE_FAILED');
  await audit(staff, 'SITE_SETTINGS_UPDATED', 'site_settings', 'public', {
    logoChanged: logoPath !== null,
    services: {
      delivery: update.free_delivery,
      installation: update.free_installation,
      measurement: update.free_measurement,
    },
  });
  revalidatePath('/');
  revalidatePath('/admin/settings');
}

export async function addPortfolio(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const file = form.get('image');
  if (!(file instanceof File)) throw new Error('PORTFOLIO_IMAGE_REQUIRED');
  const path = await uploadRaster(client, 'portfolio', 'works', file);
  const item = {
    cover_image_path: path,
    description: z.string().trim().max(2000).parse(form.get('description')) || null,
    is_published: form.get('published') === 'on',
    sort_order: z.coerce.number().int().min(0).max(100_000).parse(form.get('sortOrder')),
    title: z.string().trim().min(1).max(255).parse(form.get('title')),
  };
  const { data, error } = await client.from('portfolio_items').insert(item).select('id').single();
  if (error || !data) {
    await client.storage.from('portfolio').remove([path]);
    throw new Error('PORTFOLIO_CREATE_FAILED');
  }
  await audit(staff, 'PORTFOLIO_CREATED', 'portfolio_items', data.id, {
    is_published: item.is_published,
    sort_order: item.sort_order,
  });
  revalidatePath('/admin/portfolio');
  revalidatePath('/portfolio');
}

export async function updatePortfolio(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const id = uuid.parse(form.get('id'));
  const update = {
    is_published: form.get('published') === 'on',
    sort_order: z.coerce.number().int().min(0).max(100_000).parse(form.get('sortOrder')),
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('portfolio_items').update(update).eq('id', id);
  if (error) throw new Error('PORTFOLIO_UPDATE_FAILED');
  await audit(staff, 'PORTFOLIO_UPDATED', 'portfolio_items', id, update);
  revalidatePath('/admin/portfolio');
  revalidatePath('/portfolio');
}

export async function createStaff(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER']);
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error('SUPABASE_NOT_CONFIGURED');
  const email = z.string().email().parse(form.get('email'));
  const password = z
    .string()
    .min(12)
    .max(128)
    .regex(/[a-z]/u)
    .regex(/[A-Z]/u)
    .regex(/[0-9]/u)
    .regex(/[^A-Za-z0-9]/u)
    .parse(form.get('password'));
  const displayName = z.string().trim().min(1).max(160).parse(form.get('displayName'));
  const role = z.enum(['OWNER', 'ADMIN', 'MANAGER']).parse(form.get('role'));
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (error || !data.user) throw new Error('STAFF_AUTH_CREATE_FAILED');
  const { error: profileError } = await admin.from('staff_profiles').insert({
    auth_user_id: data.user.id,
    display_name: displayName,
    must_change_password: false,
    role,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error('STAFF_PROFILE_CREATE_FAILED');
  }
  await admin.from('admin_audit_log').insert({
    action: 'STAFF_CREATED',
    actor_auth_user_id: staff.auth_user_id,
    actor_display_name: staff.display_name,
    entity: 'staff_profiles',
    entity_id: data.user.id,
    safe_diff: { role },
  });
  revalidatePath('/admin/staff');
}

export async function updateStaff(form: FormData): Promise<void> {
  const actor = await requireStaff(['OWNER']);
  const id = uuid.parse(form.get('id'));
  const update = {
    is_active: form.get('active') === 'on',
    role: z.enum(['OWNER', 'ADMIN', 'MANAGER']).parse(form.get('role')),
  };
  const client = await createSupabaseServerClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('staff_profiles').update(update).eq('id', id);
  if (error) throw new Error('STAFF_UPDATE_FAILED');
  await audit(actor, 'STAFF_UPDATED', 'staff_profiles', id, update);
  revalidatePath('/admin/staff');
}
