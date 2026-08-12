import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { publicImageUrl } from '../phase2a/data';
import { AiVisualizationError } from './errors';
import type { BlindFamily, SafeMaterialReference } from './types';

type MaterialRecord = {
  id: string;
  name: string;
  slug: string;
  article: string;
  color_name: string | null;
  material_type: string | null;
  availability: 'AVAILABLE' | 'OUT_OF_STOCK' | 'INQUIRY_ONLY';
  primary_image_path: string | null;
  categories: { name: string; slug: string; is_published: boolean } | null;
};

export type ResolvedAiMaterial = SafeMaterialReference & { storagePath: string };

export function resolveBlindFamily(input: {
  categoryName: string;
  categorySlug: string;
  materialName: string;
  materialType: string | null;
}): BlindFamily | null {
  const haystack = [
    input.categoryName,
    input.categorySlug,
    input.materialName,
    input.materialType ?? '',
  ]
    .join(' ')
    .toLocaleLowerCase('ru-RU');
  if (/зебр|день[\s–—_-]*ноч|den[\s_-]*noch|zebra/u.test(haystack)) return 'ZEBRA';
  if (/горизонт|horizontal/u.test(haystack)) return 'HORIZONTAL';
  if (/вертикал|vertical/u.test(haystack)) return 'VERTICAL';
  if (/рулон|ролл|roller|roll|blackout|кассет|mini|uni/u.test(haystack)) return 'ROLLER';
  return null;
}

function safeStoragePath(value: string | null): value is string {
  return Boolean(
    value &&
      value.length <= 512 &&
      !value.startsWith('/') &&
      !value.includes('..') &&
      /^[\p{L}\p{N}._/-]+$/u.test(value),
  );
}

async function materialObjectExists(client: SupabaseClient, path: string): Promise<boolean> {
  const segments = path.split('/');
  const filename = segments.pop();
  if (!filename) return false;
  const directory = segments.join('/');
  const { data, error } = await client.storage.from('catalog').list(directory, {
    limit: 10,
    search: filename,
  });
  return !error && Boolean(data?.some((entry) => entry.name === filename));
}

export async function resolveAiMaterial(
  client: SupabaseClient,
  selector: { materialId?: string; materialSlug?: string },
): Promise<ResolvedAiMaterial> {
  let query = client
    .from('materials')
    .select(
      'id,name,slug,article,color_name,material_type,availability,primary_image_path,categories!inner(name,slug,is_published)',
    )
    .eq('is_published', true)
    .eq('categories.is_published', true);
  query = selector.materialId
    ? query.eq('id', selector.materialId)
    : query.eq('slug', selector.materialSlug!);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new AiVisualizationError('MATERIAL_NOT_FOUND');
  const material = data as unknown as MaterialRecord;
  if (!safeStoragePath(material.primary_image_path)) {
    throw new AiVisualizationError('MATERIAL_IMAGE_UNAVAILABLE');
  }
  const imageUrl = publicImageUrl('catalog', material.primary_image_path);
  const family = resolveBlindFamily({
    categoryName: material.categories?.name ?? '',
    categorySlug: material.categories?.slug ?? '',
    materialName: material.name,
    materialType: material.material_type,
  });
  if (!imageUrl || !family || !(await materialObjectExists(client, material.primary_image_path))) {
    throw new AiVisualizationError('MATERIAL_IMAGE_UNAVAILABLE');
  }
  return {
    article: material.article,
    availability: material.availability,
    categoryName: material.categories!.name,
    color: material.color_name,
    family,
    id: material.id,
    imageUrl,
    name: material.name,
    slug: material.slug,
    storagePath: material.primary_image_path,
  };
}

