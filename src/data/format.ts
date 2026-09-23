/** Formato de datos numéricos del dominio. */

/** Formato del prototipo: `$850,000` (sin código de moneda). */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function formatArea(areaSqft: number): string {
  return areaSqft.toLocaleString('en-US');
}

/** Convierte lo que escribe el usuario (`$999,000`, `1 200`, `850000.50`) a número. */
export function parseNumber(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}
