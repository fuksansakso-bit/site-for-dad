import { describe, expect, it } from 'vitest';

import { nearestSupportedAspectRatio } from '../lib/ai-visualization/aspect-ratio';
import { detectImageMime } from '../lib/ai-visualization/image-validation';
import { resolveBlindFamily } from '../lib/ai-visualization/material';
import { buildVisualizationPrompt } from '../lib/ai-visualization/prompt';
import { combinedRequestHash } from '../lib/ai-visualization/request-hash';
import { canTransitionAiVisualization } from '../lib/ai-visualization/state-machine';

const basePrompt = {
  article: 'A-42',
  color: 'Песочный',
  materialName: 'Лён',
  productMetadata: { heightMm: 1600, widthMm: 1200 },
};

describe('Phase 2B prompt and domain', () => {
  it.each([
    ['ROLLER', 'Keep the fabric panel flat'],
    ['ZEBRA', 'alternating transparent and opaque'],
    ['HORIZONTAL', 'Use horizontal slats'],
    ['VERTICAL', 'Use vertical slats'],
  ] as const)('builds closed family prompt for %s', (family, familyInstruction) => {
    const result = buildVisualizationPrompt({ ...basePrompt, family });
    expect(result.promptVersion).toBe('window-blinds-polza-v1');
    expect(result.prompt).toContain('IMAGE 1 is the original photograph');
    expect(result.prompt).toContain('IMAGE 2 is the exact reference image');
    expect(result.prompt).toContain(familyInstruction);
    expect(result.prompt).toContain('Do not regenerate the room');
    expect(result.prompt).toContain('1200 mm wide by 1600 mm high');
    expect(result.prompt).not.toContain('API key');
    expect(result.prompt.length).toBeLessThanOrEqual(5_000);
  });

  it('sanitizes control characters without inventing technical properties', () => {
    const { prompt } = buildVisualizationPrompt({
      ...basePrompt,
      article: 'A\u0000-42',
      family: 'ROLLER',
      materialName: 'Лён\nпесочный',
    });
    expect(prompt).toContain('A -42');
    expect(prompt).not.toMatch(/fireproof|waterproof|guaranteed/iu);
  });

  it.each([
    [1000, 1000, '1:1'],
    [1000, 1800, '9:16'],
    [1800, 1000, '16:9'],
  ] as const)('maps %sx%s to %s', (width, height, expected) => {
    expect(nearestSupportedAspectRatio(width, height)).toBe(expected);
  });

  it('creates deterministic request hashes and changes on paid inputs', () => {
    const input = {
      inputSha256: 'a'.repeat(64),
      materialId: '00000000-0000-4000-8000-000000000001',
      materialImageSha256: 'b'.repeat(64),
      modelName: 'google/gemini-3.1-flash-image',
      outputSize: '1K' as const,
      productFamily: 'ROLLER' as const,
      productMetadata: { widthMm: 1200, heightMm: 1600 },
      promptVersion: 'window-blinds-polza-v1',
    };
    expect(combinedRequestHash(input)).toBe(combinedRequestHash({ ...input }));
    expect(combinedRequestHash(input)).not.toBe(
      combinedRequestHash({ ...input, materialId: '00000000-0000-4000-8000-000000000002' }),
    );
    expect(combinedRequestHash(input)).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('allows only the intended lifecycle transitions', () => {
    expect(canTransitionAiVisualization('CREATED', 'UPLOAD_PENDING')).toBe(true);
    expect(canTransitionAiVisualization('READY', 'PROCESSING')).toBe(true);
    expect(canTransitionAiVisualization('PROCESSING', 'SUCCEEDED')).toBe(true);
    expect(canTransitionAiVisualization('SUCCEEDED', 'PROCESSING')).toBe(false);
    expect(canTransitionAiVisualization('DELETED', 'READY')).toBe(false);
  });

  it('maps catalog families without trusting a client family value', () => {
    expect(
      resolveBlindFamily({
        categoryName: 'День–Ночь',
        categorySlug: 'den-noch',
        materialName: 'Ткань',
        materialType: null,
      }),
    ).toBe('ZEBRA');
    expect(
      resolveBlindFamily({
        categoryName: 'Горизонтальные жалюзи',
        categorySlug: 'horizontal',
        materialName: 'Алюминий',
        materialType: null,
      }),
    ).toBe('HORIZONTAL');
    expect(
      resolveBlindFamily({
        categoryName: 'Неизвестно',
        categorySlug: 'unknown',
        materialName: 'Материал',
        materialType: null,
      }),
    ).toBeNull();
  });

  it('detects magic bytes and rejects SVG/HTML masquerading as an image', () => {
    expect(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('image/jpeg');
    expect(
      detectImageMime(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe('image/png');
    expect(detectImageMime(new TextEncoder().encode('<svg><script/></svg>'))).toBeNull();
    expect(detectImageMime(new TextEncoder().encode('<html>image/jpeg</html>'))).toBeNull();
  });
});

