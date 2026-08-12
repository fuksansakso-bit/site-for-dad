import type { SupportedAspectRatio } from './types';

const SUPPORTED: ReadonlyArray<{ label: SupportedAspectRatio; ratio: number }> = [
  { label: '1:1', ratio: 1 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '16:9', ratio: 16 / 9 },
];

export function nearestSupportedAspectRatio(width: number, height: number): SupportedAspectRatio {
  const ratio = width / height;
  return SUPPORTED.reduce((nearest, candidate) =>
    Math.abs(Math.log(ratio / candidate.ratio)) <
    Math.abs(Math.log(ratio / nearest.ratio))
      ? candidate
      : nearest,
  ).label;
}

export function numericAspectRatio(value: SupportedAspectRatio): number {
  return value === '1:1' ? 1 : value === '9:16' ? 9 / 16 : 16 / 9;
}

