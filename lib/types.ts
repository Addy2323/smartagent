export type Role = "super_admin" | "agent"

export interface Agent {
  id: string
  name: string
  email: string
  phone?: string | null
  role: Role
  active: boolean
}

export interface Network {
  id: string
  name: string
  /** Short code used in tables / badges, e.g. MP, AM */
  code: string
  /** Current e-float balance held with this provider (TZS) */
  floatBalance: number
  /** Low-balance alert threshold (TZS) */
  threshold: number
  active: boolean
}

/** Banded commission table. Commission is a flat TZS amount per band. */
export interface CommissionTier {
  id: string
  networkId: string
  min: number
  max: number
  /** Commission earned by the agent on a cash-in (deposit) in this band */
  deposit: number
  /** Commission earned by the agent on a cash-out (withdrawal) in this band */
  withdrawal: number
}

export type TxType = "deposit" | "withdrawal"

export interface Transaction {
  id: string
  ref: string
  type: TxType
  networkId: string
  amount: number
  commission: number
  customer: string
  customerPhone: string
  agentId: string
  createdAt: string // ISO
}

export interface FloatTopup {
  id: string
  networkId: string
  amount: number
  source: string // bank, cash, HQ
  note: string
  agentId: string
  createdAt: string
}

export type CashDirection = "in" | "out"

export interface CashEntry {
  id: string
  direction: CashDirection
  amount: number
  reason: string
  agentId: string
  createdAt: string
}

export interface ExpenseCategory {
  id: string
  name: string
}

export interface Expense {
  id: string
  categoryId: string
  amount: number
  description: string
  receipt?: string | null
  agentId: string
  createdAt: string
}

export type DebtKind = "receivable" | "payable"
export type DebtStatus = "open" | "partial" | "settled"

export interface DebtPayment {
  id: string
  amount: number
  createdAt: string
}

export interface Debt {
  id: string
  kind: DebtKind
  party: string
  partyPhone: string
  principal: number
  description: string
  payments: DebtPayment[]
  agentId: string
  createdAt: string
  dueDate: string
}

export type BankTxType =
  | "deposit"
  | "withdrawal"
  | "balance_inquiry"
  | "mini_statement"
  | "cardless_withdrawal"
  | "account_opening"

export interface Bank {
  id: string
  name: string
  floatBalance: number
  threshold: number
  active: boolean
}

export interface BankCommissionTier {
  id: string
  bankId: string
  service: string
  min: number
  max: number
  commission: number
}

export interface BankTransaction {
  id: string
  ref: string
  type: BankTxType
  bankId: string
  accountNumber?: string | null
  accountName?: string | null
  amount: number
  fee: number
  commission: number
  tellerNumber?: string | null
  customerName?: string | null
  customerPhone?: string | null
  referenceNumber?: string | null
  notes?: string | null
  agentId: string
  createdAt: string
}

export interface BankFloatTopup {
  id: string
  bankId: string
  amount: number
  source: string
  note: string
  agentId: string
  createdAt: string
}

export interface Transfer {
  id: string
  sourceType: string
  sourceId?: string | null
  destType: string
  destId?: string | null
  amount: number
  charges: number
  agentId: string
  createdAt: string
}

