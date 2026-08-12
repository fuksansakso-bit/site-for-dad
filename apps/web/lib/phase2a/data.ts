import 'server-only';

import { createSupabaseAdminClient, createSupabaseServerClient } from './supabase';
import type { Category, PortfolioItem, PublicMaterial, SiteSettings } from './types';

function toPublicMaterial(value: unknown): PublicMaterial | null {
  const candidate = value as Partial<PublicMaterial> | null;
  if (
    !candidate ||
    typeof candidate.primary_image_path !== 'string' ||
    candidate.primary_image_path.length === 0 ||
    typeof candidate.display_price_kopecks !== 'number' ||
    !Number.isSafeInteger(candidate.display_price_kopecks) ||
    candidate.display_price_kopecks <= 0
  ) {
    return null;
  }
  return candidate as PublicMaterial;
}

export async function listCategories(): Promise<Category[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data } = await client
    .from('public_categories')
    .select('name,slug,description,image_path')
    .order('sort_order');
  return (data ?? []) as Category[];
}

export async function listMaterials(categorySlug?: string): Promise<PublicMaterial[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const result: PublicMaterial[] = [];
  const batchSize = 1000;
  for (let offset = 0; ; offset += batchSize) {
    let query = client
      .from('public_materials')
      .select(
        'name,slug,article,description,color_name,material_type,primary_image_path,category_name,category_slug,availability_label,display_price_kopecks,display_price_suffix',
      )
      .order('sort_order')
      .range(offset, offset + batchSize - 1);
    if (categorySlug) query = query.eq('category_slug', categorySlug);
    const { data, error } = await query;
    if (error) return [];
    const rawBatch = data ?? [];
    const batch = rawBatch.map(toPublicMaterial).filter((item) => item !== null);
    result.push(...batch);
    if (rawBatch.length < batchSize) break;
  }
  return result;
}

export async function getMaterial(slug: string): Promise<PublicMaterial | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data } = await client
    .from('public_materials')
    .select(
      'name,slug,article,description,color_name,material_type,primary_image_path,category_name,category_slug,availability_label,display_price_kopecks,display_price_suffix',
    )
    .eq('slug', slug)
    .maybeSingle();
  return toPublicMaterial(data);
}

export async function listFeaturedMaterials(limit = 6): Promise<PublicMaterial[]> {
  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data, error } = await client
    .from('public_materials')
    .select(
      'name,slug,article,description,color_name,material_type,primary_image_path,category_name,category_slug,availability_label,display_price_kopecks,display_price_suffix',
    )
    .not('primary_image_path', 'is', null)
    .order('sort_order')
    .limit(Math.max(1, Math.min(limit, 12)));
  return error ? [] : (data ?? []).map(toPublicMaterial).filter((item) => item !== null);
}

export async function listPortfolioItems(limit = 12): Promise<PortfolioItem[]> {
  const publicClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!publicClient) return [];
  const { data, error } = await publicClient
    .from('public_portfolio_items')
    .select('title,description,cover_image_path')
    .order('sort_order')
    .limit(Math.max(1, Math.min(limit, 24)));
  if (error) return [];
  return Promise.all(
    (data ?? []).map(async (item) => {
      if (!admin) return { ...item, imageUrl: null } as PortfolioItem;
      const { data: signed } = await admin.storage
        .from('portfolio')
        .createSignedUrl(item.cover_image_path, 3600);
      return { ...item, imageUrl: signed?.signedUrl ?? null } as PortfolioItem;
    }),
  );
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data } = await client
    .from('public_site_settings')
    .select(
      'site_name,logo_path,partner_badge_path,whatsapp_phone,phone,region,lead_time_text,warranty_text,free_measurement,free_delivery,free_installation,installment_text,social_links',
    )
    .maybeSingle();
  return data as SiteSettings | null;
}

export function publicImageUrl(
  bucket: 'branding' | 'catalog' | 'portfolio',
  path: string | null,
): string | null {
  const base = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  return base && path ? `${base}/storage/v1/object/public/${bucket}/${path}` : null;
}
