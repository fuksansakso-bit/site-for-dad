import 'server-only';

import { AI_VISUALIZATION_PROMPT_VERSION } from './config';
import type { BlindFamily } from './types';

const FAMILY_NAMES: Record<BlindFamily, string> = {
  HORIZONTAL: 'horizontal blinds',
  ROLLER: 'roller blinds',
  VERTICAL: 'vertical blinds',
  ZEBRA: 'Zebra / Day-Night roller blinds',
};

const FAMILY_INSTRUCTIONS: Record<BlindFamily, readonly string[]> = {
  ROLLER: [
    'Keep the fabric panel flat and even.',
    'Make the bottom rail physically plausible.',
    'Keep the mechanism discreet and realistically sized.',
  ],
  ZEBRA: [
    'Use alternating transparent and opaque horizontal bands.',
    'Keep all bands parallel and preserve the selected material color and pattern.',
    'Do not turn Zebra / Day-Night blinds into a plain single-layer fabric.',
  ],
  HORIZONTAL: [
    'Use horizontal slats and preserve their perspective.',
    'Do not turn horizontal blinds into roller fabric.',
    'Match the selected material color.',
  ],
  VERTICAL: [
    'Use vertical slats with an even, perspective-correct spacing.',
    'Do not turn vertical blinds into curtains or roller fabric.',
    'Match the selected material color and visual character.',
  ],
};

function safePromptValue(value: string | null, fallback: string): string {
  const withoutControls = [...(value ?? '')]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('');
  const normalized = withoutControls.replace(/\s+/gu, ' ').trim();
  return (normalized || fallback).slice(0, 180);
}

export type PromptInput = {
  article: string;
  color: string | null;
  family: BlindFamily;
  materialName: string;
  productMetadata: { widthMm?: number; heightMm?: number };
};

export function buildVisualizationPrompt(input: PromptInput): {
  prompt: string;
  promptVersion: typeof AI_VISUALIZATION_PROMPT_VERSION;
} {
  const productFamily = FAMILY_NAMES[input.family];
  const materialName = safePromptValue(input.materialName, 'selected material');
  const article = safePromptValue(input.article, 'not provided');
  const color = safePromptValue(input.color, 'as shown in IMAGE 2');
  const dimensions =
    input.productMetadata.widthMm && input.productMetadata.heightMm
      ? `\nValidated requested product dimensions: ${input.productMetadata.widthMm} mm wide by ${input.productMetadata.heightMm} mm high. Use them only as scale context; do not alter the window geometry.`
      : '';
  const familyInstructions = FAMILY_INSTRUCTIONS[input.family]
    .map((instruction) => `- ${instruction}`)
    .join('\n');
  const prompt = `You are a professional architectural image editing engine.

IMAGE 1 is the original photograph of the client's room and window.
IMAGE 2 is the exact reference image of the selected blind material.

Edit IMAGE 1 only.

Install realistic ${productFamily} made from the exact material shown in IMAGE 2 onto the visible window in IMAGE 1.

The selected material is:
- name: ${materialName}
- article: ${article}
- color: ${color}
- product type: ${productFamily}${dimensions}

Preserve the original photograph as strictly as possible.

Do not change:
- camera angle;
- perspective;
- window size;
- window shape;
- number of windows;
- number of visible panes;
- window frames;
- handles;
- window sill;
- walls;
- ceiling;
- floor;
- furniture;
- doors;
- room layout;
- decorative objects;
- lighting direction;
- people, if present;
- image orientation.

Do not regenerate the room.

Do not add:
- new windows;
- new furniture;
- curtains that were not requested;
- text;
- logos;
- watermarks;
- decorative objects.

Use the exact color, texture, pattern and visual character of the material in IMAGE 2.

The blinds must:
- fit the visible window naturally;
- follow the perspective of the original photograph;
- have believable mounting;
- have realistic scale;
- have subtle contact shadows;
- react naturally to the room lighting;
- look physically installed;
- not cover walls outside the window area.

Product-family requirements:
${familyInstructions}

The final output must look like the original client photograph professionally edited to add the selected blinds, not like a newly generated room.

Return one photorealistic edited image only.`;
  if (prompt.length > 5_000) throw new Error('AI_PROMPT_TOO_LONG');
  return { prompt, promptVersion: AI_VISUALIZATION_PROMPT_VERSION };
}
