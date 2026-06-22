import type {
  Agent,
  CashEntry,
  CommissionTier,
  Debt,
  Expense,
  ExpenseCategory,
  FloatTopup,
  Network,
  Transaction,
} from "./types"

/** Tiny deterministic PRNG so seed data is identical on server and client (no hydration mismatch). */
function makeRng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** ISO timestamp for `daysAgo` days back at a given hour/minute. */
function ts(daysAgo: number, hour: number, minute: number) {
  const d = startOfToday()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const agents: Agent[] = [
  { id: "agent-0", name: "Amina Hassan", email: "amina@smartagent.co.tz", role: "super_admin", active: true },
  { id: "agent-1", name: "Juma Mushi", email: "juma@smartagent.co.tz", role: "agent", active: true },
  { id: "agent-2", name: "Neema Kileo", email: "neema@smartagent.co.tz", role: "agent", active: true },
]

export const networks: Network[] = [
  { id: "mp", name: "M-Pesa", code: "MP", floatBalance: 4_250_000, threshold: 1_000_000, active: true },
  { id: "am", name: "Airtel Money", code: "AM", floatBalance: 820_000, threshold: 1_000_000, active: true },
  { id: "mx", name: "Mixx by Yas", code: "MX", floatBalance: 2_100_000, threshold: 800_000, active: true },
  { id: "hp", name: "HaloPesa", code: "HP", floatBalance: 540_000, threshold: 600_000, active: true },
  { id: "bk", name: "Bank Float", code: "BK", floatBalance: 6_900_000, threshold: 2_000_000, active: true },
]

export const expenseCategories: ExpenseCategory[] = [
  { id: "rent", name: "Shop Rent" },
  { id: "salary", name: "Staff Salary" },
  { id: "airtime", name: "Airtime & Data" },
  { id: "electricity", name: "Electricity" },
  { id: "transport", name: "Transport" },
  { id: "supplies", name: "Office Supplies" },
  { id: "security", name: "Security" },
  { id: "misc", name: "Miscellaneous" },
]

function buildTiers(networkId: string, scale: number): CommissionTier[] {
  const bands: Array<[number, number, number, number]> = [
    [1_000, 4_999, 110, 130],
    [5_000, 9_999, 220, 250],
    [10_000, 19_999, 330, 400],
    [20_000, 49_999, 520, 600],
    [50_000, 99_999, 780, 900],
    [100_000, 499_999, 1_300, 1_600],
    [500_000, 3_000_000, 2_400, 3_000],
  ]
  return bands.map(([min, max, dep, wd], i) => ({
    id: `${networkId}-t${i}`,
    networkId,
    min,
    max,
    deposit: Math.round(dep * scale),
    withdrawal: Math.round(wd * scale),
  }))
}

export const commissionTiers: CommissionTier[] = [
  ...buildTiers("mp", 1),
  ...buildTiers("am", 1.05),
  ...buildTiers("mx", 0.95),
  ...buildTiers("hp", 1.1),
  ...buildTiers("bk", 0.6),
]

export function commissionFor(
  tiers: CommissionTier[],
  networkId: string,
  type: "deposit" | "withdrawal",
  amount: number,
): number {
  const tier = tiers.find((t) => t.networkId === networkId && amount >= t.min && amount <= t.max)
  if (!tier) return 0
  return type === "deposit" ? tier.deposit : tier.withdrawal
}

const customers = [
  ["Fatuma Said", "0712 884 220"],
  ["Baraka John", "0764 552 109"],
  ["Zainabu Omar", "0688 730 441"],
  ["Emmanuel Mlay", "0755 219 003"],
  ["Halima Yusuf", "0719 664 872"],
  ["Daudi Massawe", "0782 410 556"],
  ["Rehema Kimaro", "0699 308 117"],
  ["Salim Abdallah", "0744 901 263"],
  ["Grace Mwakyusa", "0768 145 990"],
  ["Ibrahim Nassoro", "0717 552 884"],
]

function buildTransactions(): Transaction[] {
  const rng = makeRng(42)
  const list: Transaction[] = []
  const netIds = networks.map((n) => n.id)
  const amounts = [2_000, 5_000, 8_000, 12_000, 25_000, 35_000, 60_000, 90_000, 150_000, 300_000]
  let counter = 1000
  for (let day = 13; day >= 0; day--) {
    const count = 6 + Math.floor(rng() * 8)
    for (let i = 0; i < count; i++) {
      const type = rng() > 0.45 ? "deposit" : "withdrawal"
      const networkId = netIds[Math.floor(rng() * (netIds.length - 1))] // exclude bank from customer tx
      const amount = amounts[Math.floor(rng() * amounts.length)]
      const [customer, phone] = customers[Math.floor(rng() * customers.length)]
      const hour = 8 + Math.floor(rng() * 11)
      const minute = Math.floor(rng() * 60)
      list.push({
        id: `tx-${counter}`,
        ref: `TXN${counter}`,
        type,
        networkId,
        amount,
        commission: commissionFor(commissionTiers, networkId, type, amount),
        customer,
        customerPhone: phone,
        agentId: rng() > 0.5 ? "agent-1" : "agent-2",
        createdAt: ts(day, hour, minute),
      })
      counter++
    }
  }
  return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export const transactions: Transaction[] = buildTransactions()

export const floatTopups: FloatTopup[] = [
  { id: "ft-1", networkId: "mp", amount: 2_000_000, source: "Bank Transfer", note: "Weekly top-up", agentId: "agent-0", createdAt: ts(6, 9, 15) },
  { id: "ft-2", networkId: "mx", amount: 1_500_000, source: "Bank Transfer", note: "Restock", agentId: "agent-0", createdAt: ts(4, 10, 0) },
  { id: "ft-3", networkId: "am", amount: 800_000, source: "Cash Deposit", note: "Low balance refill", agentId: "agent-1", createdAt: ts(2, 14, 30) },
  { id: "ft-4", networkId: "hp", amount: 500_000, source: "Bank Transfer", note: "Refill", agentId: "agent-0", createdAt: ts(1, 11, 45) },
]

export const cashEntries: CashEntry[] = [
  { id: "ce-1", direction: "in", amount: 3_000_000, reason: "Opening cash float", agentId: "agent-0", createdAt: ts(13, 8, 0) },
  { id: "ce-2", direction: "out", amount: 1_800_000, reason: "Bank deposit (excess cash)", agentId: "agent-0", createdAt: ts(5, 16, 0) },
  { id: "ce-3", direction: "out", amount: 1_200_000, reason: "Bank deposit (excess cash)", agentId: "agent-1", createdAt: ts(2, 17, 10) },
]

export const expenses: Expense[] = [
  { id: "ex-1", categoryId: "rent", amount: 350_000, description: "Monthly shop rent", agentId: "agent-0", createdAt: ts(12, 9, 0), receipt: "receipt.png" },
  { id: "ex-2", categoryId: "salary", amount: 400_000, description: "Assistant salary", agentId: "agent-0", createdAt: ts(11, 10, 0), receipt: "receipt.png" },
  { id: "ex-3", categoryId: "electricity", amount: 65_000, description: "LUKU tokens", agentId: "agent-1", createdAt: ts(8, 12, 30), receipt: "receipt.png" },
  { id: "ex-4", categoryId: "airtime", amount: 30_000, description: "Office airtime", agentId: "agent-2", createdAt: ts(6, 15, 0), receipt: "receipt.png" },
  { id: "ex-5", categoryId: "transport", amount: 18_000, description: "Bank trip bodaboda", agentId: "agent-1", createdAt: ts(5, 16, 20), receipt: "receipt.png" },
  { id: "ex-6", categoryId: "supplies", amount: 22_000, description: "Receipt books & pens", agentId: "agent-2", createdAt: ts(3, 11, 0), receipt: "receipt.png" },
  { id: "ex-7", categoryId: "security", amount: 80_000, description: "Night guard", agentId: "agent-0", createdAt: ts(2, 9, 0), receipt: "receipt.png" },
  { id: "ex-8", categoryId: "electricity", amount: 40_000, description: "LUKU tokens", agentId: "agent-1", createdAt: ts(0, 10, 15), receipt: "receipt.png" },
]

export const debts: Debt[] = [
  {
    id: "debt-1",
    kind: "receivable",
    party: "Baraka John",
    partyPhone: "0764 552 109",
    principal: 150_000,
    description: "Withdrawal advanced before transfer cleared",
    payments: [{ id: "dp-1", amount: 50_000, createdAt: ts(3, 12, 0) }],
    agentId: "agent-1",
    createdAt: ts(7, 13, 0),
    dueDate: ts(-3, 0, 0),
  },
  {
    id: "debt-2",
    kind: "receivable",
    party: "Grace Mwakyusa",
    partyPhone: "0768 145 990",
    principal: 80_000,
    description: "Short float covered for regular customer",
    payments: [],
    agentId: "agent-2",
    createdAt: ts(4, 10, 30),
    dueDate: ts(-2, 0, 0),
  },
  {
    id: "debt-3",
    kind: "payable",
    party: "QuickFloat Supplier",
    partyPhone: "0755 000 111",
    principal: 500_000,
    description: "Float supplied on credit",
    payments: [{ id: "dp-2", amount: 200_000, createdAt: ts(2, 9, 0) }],
    agentId: "agent-0",
    createdAt: ts(9, 9, 0),
    dueDate: ts(-5, 0, 0),
  },
]
