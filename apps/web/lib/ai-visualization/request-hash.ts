import 'server-only';

import { createHash } from 'node:crypto';

import type { BlindFamily } from './types';

export type CombinedRequestHashInput = {
  inputSha256: string;
  materialId: string;
  materialImageSha256: string;
  productFamily: BlindFamily;
  productMetadata: { widthMm?: number; heightMm?: number };
  promptVersion: string;
  modelName: string;
  outputSize: '1K';
};

export function combinedRequestHash(input: CombinedRequestHashInput): string {
  const canonical = JSON.stringify({
    inputSha256: input.inputSha256,
    materialId: input.materialId,
    materialImageSha256: input.materialImageSha256,
    modelName: input.modelName,
    outputSize: input.outputSize,
    productFamily: input.productFamily,
    productMetadata: {
      heightMm: input.productMetadata.heightMm ?? null,
      widthMm: input.productMetadata.widthMm ?? null,
    },
    promptVersion: input.promptVersion,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

