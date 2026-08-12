export function normalizeRussianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const normalized =
    digits.length === 11 && (digits[0] === '8' || digits[0] === '7')
      ? `7${digits.slice(1)}`
      : digits.length === 10
        ? `7${digits}`
        : '';
  if (!/^7\d{10}$/.test(normalized)) throw new Error('INVALID_PHONE');
  return `+${normalized}`;
}
