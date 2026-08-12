import 'server-only';

import { createSupabaseServerClient } from './supabase';
import type { Category, PublicMaterial, SiteSettings } from './types';

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
    const batch = (data ?? []) as PublicMaterial[];
    result.push(...batch);
    if (batch.length < batchSize) break;
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
  return data as PublicMaterial | null;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data } = await client
    .from('public_site_settings')
    .select(
      'site_name,logo_path,whatsapp_phone,phone,region,lead_time_text,warranty_text,free_measurement,free_delivery,free_installation,installment_text',
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
