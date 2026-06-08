import Decimal from 'decimal.js'

const PLATFORM_COMMISSION_RATE = new Decimal(0.05)

export function calculateCommission(subtotal: Decimal): Decimal {
  return subtotal.mul(PLATFORM_COMMISSION_RATE)
}

export function calculatePayout(subtotal: Decimal): Decimal {
  const commission = calculateCommission(subtotal)
  return subtotal.minus(commission)
}

export function formatCurrency(amount: Decimal | number | string | null | undefined): string {
  const d = amount === null || amount === undefined
    ? new Decimal(0)
    : amount instanceof Decimal
      ? amount
      : new Decimal(amount)
  return d.toFixed(2)
}
