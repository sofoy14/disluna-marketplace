export function formatAmountFromCents(cents: number): number {
  return cents / 100
}

export function formatCurrency(cents: number): string {
  const amount = formatAmountFromCents(cents)
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

