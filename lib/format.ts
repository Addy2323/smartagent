export function formatTZS(amount: number, opts?: { compact?: boolean }) {
  if (opts?.compact && Math.abs(amount) >= 1_000_000) {
    return `TZS ${(amount / 1_000_000).toFixed(2)}M`
  }
  if (opts?.compact && Math.abs(amount) >= 1_000) {
    return `TZS ${(amount / 1_000).toFixed(1)}K`
  }
  const sign = amount < 0 ? "-" : ""
  return `${sign}TZS ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))}`
}

export function formatNumber(amount: number) {
  return new Intl.NumberFormat("en-US").format(amount)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}
