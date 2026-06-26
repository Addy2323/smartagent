"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import type {
  Agent,
  CashDirection,
  CashEntry,
  CommissionTier,
  Debt,
  DebtKind,
  Expense,
  ExpenseCategory,
  FloatTopup,
  Network,
  Role,
  Transaction,
  TxType,
  Bank,
  BankCommissionTier,
  BankTransaction,
  BankFloatTopup,
  Transfer,
  BankTxType,
} from "./types"
import { commissionFor, bankCommissionFor } from "./seed"

const SEED_CASH_BALANCE = 0

interface NewTransactionInput {
  type: TxType
  networkId: string
  amount: number
  customer: string
  customerPhone: string
}

interface DataContextValue {
  // identity
  role: Role
  setRole: (r: Role) => void
  currentAgent: Agent | null
  setCurrentAgentId: (id: string) => void
  agents: Agent[]
  loading: boolean
  isOffline: boolean
  setOffline: (offline: boolean) => void
  // data
  networks: Network[]
  commissionTiers: CommissionTier[]
  transactions: Transaction[]
  floatTopups: FloatTopup[]
  cashEntries: CashEntry[]
  expenses: Expense[]
  expenseCategories: ExpenseCategory[]
  debts: Debt[]
  cashBalance: number
  banks: Bank[]
  bankCommissionTiers: BankCommissionTier[]
  bankTransactions: BankTransaction[]
  bankFloatTopups: BankFloatTopup[]
  transfers: Transfer[]
  // helpers
  networkById: (id: string) => Network | undefined
  agentById: (id: string) => Agent | undefined
  previewCommission: (type: TxType, networkId: string, amount: number) => number
  bankById: (id: string) => Bank | undefined
  previewBankCommission: (service: string, bankId: string, amount: number) => number
  // actions
  addTransaction: (input: NewTransactionInput) => Promise<void>
  addFloatTopup: (input: { networkId: string; amount: number; source: string; note: string; fromCash: boolean }) => Promise<void>
  addCashEntry: (input: { direction: CashDirection; amount: number; reason: string }) => Promise<void>
  addExpense: (input: { categoryId: string; amount: number; description: string; receipt?: string | null }) => Promise<void>
  addDebt: (input: { kind: DebtKind; party: string; partyPhone: string; principal: number; description: string; dueDate: string }) => Promise<void>
  addDebtPayment: (debtId: string, amount: number) => Promise<void>
  addBankTransaction: (input: {
    type: BankTxType
    bankId: string
    accountNumber?: string | null
    accountName?: string | null
    amount: number
    fee: number
    tellerNumber?: string | null
    customerName?: string | null
    customerPhone?: string | null
    referenceNumber?: string | null
    notes?: string | null
  }) => Promise<void>
  addBankFloatTopup: (input: { bankId: string; amount: number; source: string; note: string; fromCash: boolean }) => Promise<void>
  reconcileBankFloat: (bankId: string, portalBalance: number, notes: string) => Promise<any>
  addTransfer: (input: {
    sourceType: string
    sourceId?: string | null
    destType: string
    destId?: string | null
    amount: number
    charges: number
  }) => Promise<void>
  // settings
  addNetwork: (input: { name: string; code: string; floatBalance: number; threshold: number }) => Promise<void>
  addBank: (input: { name: string; id: string; floatBalance: number; threshold: number }) => Promise<void>
  updateNetworkThreshold: (id: string, threshold: number) => Promise<void>
  updateBankThreshold: (id: string, threshold: number) => Promise<void>
  addExpenseCategory: (name: string) => Promise<void>
  updateTier: (id: string, field: "deposit" | "withdrawal", value: number) => Promise<void>
  updateBankCommissionTier: (id: string, commission: number) => Promise<void>
  addAgent: (input: { name: string; email: string; phone?: string | null; role: Role; password?: string; pin?: string }) => Promise<void>
  toggleAgentActive: (id: string, active: boolean) => Promise<void>
  updateAgent: (id: string, data: { name?: string; email?: string; phone?: string | null; role?: Role; active?: boolean }) => Promise<void>
  seedDatabase: () => Promise<void>
  logout: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("super_admin")
  const [currentAgentId, setCurrentAgentIdState] = useState<string>("")
  const [agents, setAgents] = useState<Agent[]>([])
  const [networks, setNetworks] = useState<Network[]>([])
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [floatTopups, setFloatTopups] = useState<FloatTopup[]>([])
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCommissionTiers, setBankCommissionTiers] = useState<BankCommissionTier[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [bankFloatTopups, setBankFloatTopups] = useState<BankFloatTopup[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])

  // Load identity from localStorage on startup
  useEffect(() => {
    const savedRole = localStorage.getItem("sa_role") as Role
    const savedAgentId = localStorage.getItem("sa_agent_id")
    const savedOffline = localStorage.getItem("sa_offline") === "true"
    const savedQueue = localStorage.getItem("sa_queue")
    
    if (savedRole) setRoleState(savedRole)
    if (savedAgentId) setCurrentAgentIdState(savedAgentId)
    if (savedOffline) setIsOffline(savedOffline)
    if (savedQueue) setOfflineQueue(JSON.parse(savedQueue))
  }, [])

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    localStorage.setItem("sa_role", r)
    // Auto switch agent matching role if switching
    const matchingAgent = agents.find((a) => a.role === r)
    if (matchingAgent) {
      setCurrentAgentIdState(matchingAgent.id)
      localStorage.setItem("sa_agent_id", matchingAgent.id)
    }
  }, [agents])

  const setCurrentAgentId = useCallback((id: string) => {
    setCurrentAgentIdState(id)
    localStorage.setItem("sa_agent_id", id)
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      setRoleState(agent.role)
      localStorage.setItem("sa_role", agent.role)
    }
  }, [agents])

  const currentAgent = useMemo(() => {
    if (!currentAgentId) return null
    return agents.find((a) => a.id === currentAgentId) || null
  }, [agents, currentAgentId])

  // Custom fetch helper that adds headers
  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      headers.set("x-agent-id", currentAgentId)
      headers.set("x-agent-role", role)
      headers.set("Content-Type", "application/json")
      
      const res = await fetch(url, {
        ...init,
        headers,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      return res.json()
    },
    [currentAgentId, role]
  )

  const reloadData = useCallback(async () => {
    try {
      setLoading(true)

      if (!currentAgentId) {
        // If not logged in, only fetch public agents list
        const res = await fetch("/api/agents")
        if (!res.ok) throw new Error("Failed to load agent profiles")
        const agentsData = await res.json()
        setAgents(agentsData)
        
        // Reset secure data arrays
        setNetworks([])
        setCommissionTiers([])
        setTransactions([])
        setFloatTopups([])
        setCashEntries([])
        setExpenses([])
        setExpenseCategories([])
        setDebts([])
        setBanks([])
        setBankCommissionTiers([])
        setBankTransactions([])
        setBankFloatTopups([])
        setTransfers([])
        return
      }

      // Helper to fetch data and return default value on error
      const fetchSafe = async (url: string, defaultValue: any) => {
        try {
          return await apiFetch(url)
        } catch (e: any) {
          const isAuthError =
            e.message?.includes("Unauthorized") ||
            e.message?.includes("HTTP 401") ||
            e.message?.includes("Session cookie")
          if (isAuthError) {
            throw e
          }
          console.error(`Error loading data from ${url}:`, e.message || e)
          return defaultValue
        }
      }

      // If logged in, fetch all secure data using apiFetch
      const [
        agentsData,
        networksData,
        txsData,
        topupsData,
        cashData,
        expData,
        debtsData,
        banksData,
        bankTxsData,
        bankTopupsData,
        transfersData,
      ] = await Promise.all([
        fetchSafe("/api/agents", []),
        fetchSafe("/api/networks", []),
        fetchSafe("/api/transactions", []),
        fetchSafe("/api/float", []),
        fetchSafe("/api/cash", []),
        fetchSafe("/api/expenses", { expenses: [], categories: [] }),
        fetchSafe("/api/debts", []),
        fetchSafe("/api/agent-banking/banks", []),
        fetchSafe("/api/agent-banking/transactions", []),
        fetchSafe("/api/agent-banking/float", []),
        fetchSafe("/api/transfers", []),
      ])

      setAgents(agentsData)
      setNetworks(networksData)
      setCommissionTiers((networksData || []).flatMap((n: any) => n?.tiers || []))
      setTransactions(txsData)
      setFloatTopups(topupsData)
      setCashEntries(cashData)
      setExpenses(expData?.expenses || [])
      setExpenseCategories(expData?.categories || [])
      setDebts(debtsData)
      setBanks(banksData)
      setBankCommissionTiers((banksData || []).flatMap((b: any) => b?.tiers || []))
      setBankTransactions(bankTxsData)
      setBankFloatTopups(bankTopupsData)
      setTransfers(transfersData)
    } catch (err: any) {
      const isAuthError =
        err.message?.includes("Unauthorized") ||
        err.message?.includes("HTTP 401") ||
        err.message?.includes("Session cookie")

      if (!isAuthError) {
        console.error("Failed to reload data:", err)
      } else {
        console.warn("Session expired or missing: redirecting to login.")
      }

      if (isAuthError) {
        setCurrentAgentIdState("")
        localStorage.removeItem("sa_agent_id")
        localStorage.removeItem("sa_role")
      }
    } finally {
      setLoading(false)
    }
  }, [currentAgentId, role, apiFetch])

  // Reload data when active agent/role changes
  useEffect(() => {
    reloadData()
  }, [reloadData])

  // Offline toggling and syncing
  const setOffline = useCallback((offline: boolean) => {
    setIsOffline(offline)
    localStorage.setItem("sa_offline", offline ? "true" : "false")
    if (!offline) {
      // Trigger sync
      syncOfflineQueue()
    } else {
      toast.info("Switched to Offline Mode. Changes will be queued.")
    }
  }, [offlineQueue, currentAgentId, role])

  const syncOfflineQueue = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem("sa_queue") || "[]")
    if (queue.length === 0) return
    
    toast.loading(`Syncing ${queue.length} offline transactions...`, { id: "sync" })
    let successCount = 0
    
    for (const item of queue) {
      try {
        await apiFetch(item.url, {
          method: "POST",
          body: JSON.stringify(item.body),
        })
        successCount++
      } catch (err) {
        console.error("Failed to sync offline item:", err)
      }
    }
    
    localStorage.setItem("sa_queue", "[]")
    setOfflineQueue([])
    reloadData()
    
    if (successCount === queue.length) {
      toast.success(`Synchronized all ${successCount} transactions successfully!`, { id: "sync" })
    } else {
      toast.warning(`Synced ${successCount}/${queue.length} items. Some failed.`, { id: "sync" })
    }
  }, [apiFetch, reloadData])

  const queueOffline = useCallback((url: string, body: any) => {
    const item = { url, body, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() }
    const newQueue = [...offlineQueue, item]
    setOfflineQueue(newQueue)
    localStorage.setItem("sa_queue", JSON.stringify(newQueue))
    toast.warning("Running Offline: Transaction queued locally.")
  }, [offlineQueue])

  // Cash on hand calculator
  const cashBalance = useMemo(() => {
    let bal = SEED_CASH_BALANCE
    for (const ce of cashEntries) {
      bal += ce.direction === "in" ? ce.amount : -ce.amount
    }
    for (const tx of transactions) {
      bal += tx.type === "deposit" ? tx.amount : -tx.amount
    }
    for (const btx of bankTransactions) {
      if (btx.type === "deposit") {
        bal += btx.amount
      } else if (btx.type === "withdrawal" || btx.type === "cardless_withdrawal") {
        bal -= btx.amount
      }
    }
    return bal
  }, [cashEntries, transactions, bankTransactions])

  const networkById = useCallback((id: string) => networks.find((n) => n.id === id), [networks])
  const agentById = useCallback((id: string) => agents.find((a) => a.id === id), [agents])
  const bankById = useCallback((id: string) => banks.find((b) => b.id === id), [banks])

  const previewCommission = useCallback(
    (type: TxType, networkId: string, amount: number) =>
      commissionFor(commissionTiers, networkId, type, amount),
    [commissionTiers],
  )

  const previewBankCommission = useCallback(
    (service: string, bankId: string, amount: number) =>
      bankCommissionFor(bankCommissionTiers, bankId, service, amount),
    [bankCommissionTiers],
  )

  // Actions
  const addTransaction = useCallback(async (input: NewTransactionInput) => {
    if (isOffline) {
      // Mock local update for offline experience
      const commission = previewCommission(input.type, input.networkId, input.amount)
      const mockTx: Transaction = {
        id: `offline-${Date.now()}`,
        ref: `OFF-${Math.floor(100000 + Math.random() * 900000)}`,
        type: input.type,
        networkId: input.networkId,
        amount: input.amount,
        commission,
        customer: input.customer || "Walk-in Customer",
        customerPhone: input.customerPhone || "",
        agentId: currentAgentId,
        createdAt: new Date().toISOString(),
      }
      setTransactions((prev) => [mockTx, ...prev])
      
      // Update float locally
      setNetworks((prev) =>
        prev.map((n) =>
          n.id === input.networkId
            ? { ...n, floatBalance: n.floatBalance + (input.type === "deposit" ? -input.amount : input.amount) }
            : n,
        ),
      )
      
      queueOffline("/api/transactions", input)
      return
    }

    try {
      await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Transaction recorded successfully!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to record transaction")
      throw err;
    }
  }, [isOffline, apiFetch, reloadData, currentAgentId, previewCommission, queueOffline])

  const addFloatTopup = useCallback(async (input: { networkId: string; amount: number; source: string; note: string; fromCash: boolean }) => {
    try {
      await apiFetch("/api/float", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Float top-up recorded!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add float top-up")
    }
  }, [apiFetch, reloadData])

  const addCashEntry = useCallback(async (input: { direction: CashDirection; amount: number; reason: string }) => {
    try {
      await apiFetch("/api/cash", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Cash ledger entry recorded!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add cash entry")
    }
  }, [apiFetch, reloadData])

  const addBankTransaction = useCallback(async (input: any) => {
    if (isOffline) {
      const commission = previewBankCommission(input.type, input.bankId, input.amount)
      const mockTx: BankTransaction = {
        id: `offline-${Date.now()}`,
        ref: `BKN-${Math.floor(100000 + Math.random() * 900000)}`,
        type: input.type,
        bankId: input.bankId,
        accountNumber: input.accountNumber || null,
        accountName: input.accountName || null,
        amount: input.amount,
        fee: input.fee || 0,
        commission,
        tellerNumber: input.tellerNumber || "TL-OFF",
        customerName: input.customerName || "Walk-in",
        customerPhone: input.customerPhone || "",
        referenceNumber: input.referenceNumber || null,
        notes: input.notes || "Offline save",
        agentId: currentAgentId,
        createdAt: new Date().toISOString(),
      }
      setBankTransactions((prev) => [mockTx, ...prev])
      
      // Update bank float
      setBanks((prev) =>
        prev.map((b) =>
          b.id === input.bankId
            ? { ...b, floatBalance: b.floatBalance + (input.type === "deposit" ? -input.amount : input.amount) }
            : b,
        ),
      )
      
      queueOffline("/api/agent-banking/transactions", input)
      return
    }

    try {
      await apiFetch("/api/agent-banking/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Bank transaction recorded successfully!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to record transaction")
      throw err
    }
  }, [isOffline, apiFetch, reloadData, currentAgentId, previewBankCommission, queueOffline])

  const addBankFloatTopup = useCallback(async (input: { bankId: string; amount: number; source: string; note: string; fromCash: boolean }) => {
    try {
      await apiFetch("/api/agent-banking/float", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Bank float topup recorded!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add bank float topup")
    }
  }, [apiFetch, reloadData])

  const reconcileBankFloat = useCallback(async (bankId: string, portalBalance: number, notes: string) => {
    try {
      const res = await apiFetch("/api/agent-banking/float/reconciliation", {
        method: "POST",
        body: JSON.stringify({ bankId, portalBalance, notes }),
      })
      toast.success("Float reconciliation finished successfully!")
      reloadData()
      return res
    } catch (err: any) {
      toast.error(err.message || "Failed float reconciliation")
      throw err
    }
  }, [apiFetch, reloadData])

  const addTransfer = useCallback(async (input: any) => {
    try {
      await apiFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Transfer recorded successfully!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to record transfer")
      throw err
    }
  }, [apiFetch, reloadData])

  const addBank = useCallback(async (input: { name: string; id: string; floatBalance: number; threshold: number }) => {
    try {
      await apiFetch("/api/agent-banking/banks", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Bank partner registered successfully!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to register bank partner")
      throw err
    }
  }, [apiFetch, reloadData])

  const updateBankThreshold = useCallback(async (id: string, threshold: number) => {
    try {
      await apiFetch("/api/agent-banking/banks", {
        method: "PUT",
        body: JSON.stringify({ id, threshold }),
      })
      toast.success("Bank threshold updated!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update bank threshold")
    }
  }, [apiFetch, reloadData])


  const addExpense = useCallback(async (input: { categoryId: string; amount: number; description: string; receipt?: string | null }) => {
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Expense recorded and cash deducted!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense")
    }
  }, [apiFetch, reloadData])

  const addDebt = useCallback(async (input: { kind: DebtKind; party: string; partyPhone: string; principal: number; description: string; dueDate: string }) => {
    try {
      await apiFetch("/api/debts", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("Debt record created!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to record debt")
    }
  }, [apiFetch, reloadData])

  const addDebtPayment = useCallback(async (debtId: string, amount: number) => {
    try {
      await apiFetch("/api/debts", {
        method: "POST",
        body: JSON.stringify({ debtId, amount }),
      })
      toast.success("Repayment recorded!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add payment")
    }
  }, [apiFetch, reloadData])

  const addNetwork = useCallback(async (input: { name: string; code: string; floatBalance: number; threshold: number }) => {
    try {
      await apiFetch("/api/networks", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("New mobile network added!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add network")
    }
  }, [apiFetch, reloadData])

  const updateNetworkThreshold = useCallback(async (id: string, threshold: number) => {
    try {
      await apiFetch("/api/networks/threshold", {
        method: "PUT",
        body: JSON.stringify({ id, threshold }),
      })
      toast.success("Low-float threshold updated!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update threshold")
    }
  }, [apiFetch, reloadData])

  const addExpenseCategory = useCallback(async (name: string) => {
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      toast.success("Expense category added!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add expense category")
    }
  }, [apiFetch, reloadData])

  const updateTier = useCallback(async (id: string, field: "deposit" | "withdrawal", value: number) => {
    try {
      const tier = commissionTiers.find((t) => t.id === id)
      if (!tier) return
      
      const payload = {
        id,
        deposit: field === "deposit" ? value : tier.deposit,
        withdrawal: field === "withdrawal" ? value : tier.withdrawal,
      }
      
      await apiFetch("/api/networks/tiers", {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      toast.success("Commission rate updated!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update rate")
    }
  }, [apiFetch, reloadData, commissionTiers])

  const updateBankCommissionTier = useCallback(async (id: string, commission: number) => {
    try {
      await apiFetch("/api/agent-banking/commissions", {
        method: "PUT",
        body: JSON.stringify({ id, commission }),
      })
      toast.success("Bank commission rate updated!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update commission rate")
    }
  }, [apiFetch, reloadData])

  const addAgent = useCallback(async (input: { name: string; email: string; phone?: string | null; role: Role; password?: string; pin?: string }) => {
    try {
      await apiFetch("/api/agents", {
        method: "POST",
        body: JSON.stringify(input),
      })
      toast.success("User agent profile created!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent")
    }
  }, [apiFetch, reloadData])

  const toggleAgentActive = useCallback(async (id: string, active: boolean) => {
    try {
      await apiFetch("/api/agents", {
        method: "PATCH",
        body: JSON.stringify({ id, active }),
      })
      toast.success(`Agent ${active ? "activated" : "deactivated"}!`)
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent status")
    }
  }, [apiFetch, reloadData])

  const updateAgent = useCallback(async (id: string, data: { name?: string; email?: string; phone?: string | null; role?: Role; active?: boolean }) => {
    try {
      await apiFetch("/api/agents", {
        method: "PATCH",
        body: JSON.stringify({ id, ...data }),
      })
      toast.success("Operator profile updated successfully!")
      reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent details")
      throw err
    }
  }, [apiFetch, reloadData])

  const seedDatabase = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/seed", { method: "POST" })
      if (!res.ok) throw new Error("Seeding API failed")
      toast.success("Database seeded with sample data successfully!")
      await reloadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to seed database")
    } finally {
      setLoading(false)
    }
  }, [reloadData])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {}
    setCurrentAgentIdState("")
    localStorage.removeItem("sa_agent_id")
    localStorage.removeItem("sa_role")
    toast.success("Logged out successfully!")
  }, [])

  const value: DataContextValue = {
    role,
    setRole,
    currentAgent,
    setCurrentAgentId,
    agents,
    loading,
    isOffline,
    setOffline,
    networks,
    commissionTiers,
    transactions,
    floatTopups,
    cashEntries,
    expenses,
    expenseCategories,
    debts,
    cashBalance,
    networkById,
    agentById,
    previewCommission,
    banks,
    bankCommissionTiers,
    bankTransactions,
    bankFloatTopups,
    transfers,
    bankById,
    previewBankCommission,
    addTransaction,
    addFloatTopup,
    addCashEntry,
    addExpense,
    addDebt,
    addDebtPayment,
    addBankTransaction,
    addBankFloatTopup,
    reconcileBankFloat,
    addTransfer,
    addNetwork,
    addBank,
    updateNetworkThreshold,
    updateBankThreshold,
    addExpenseCategory,
    updateTier,
    updateBankCommissionTier,
    addAgent,
    toggleAgentActive,
    updateAgent,
    seedDatabase,
    logout,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}
