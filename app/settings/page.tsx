"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Bell, Database, KeyRound, Layers, Plus, ShieldCheck, UserRound, Users, Pencil, Eye, EyeOff } from "lucide-react"
import { useData } from "@/lib/store"
import { formatTZS } from "@/lib/format"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const {
    role,
    agents,
    networks,
    expenseCategories,
    addAgent,
    toggleAgentActive,
    updateAgent,
    addNetwork,
    updateNetworkThreshold,
    addExpenseCategory,
    seedDatabase,
    loading,
  } = useData()

  // Tab active state
  const [activeTab, setActiveTab] = useState("profile")

  // New Agent Form states
  const [agentName, setAgentName] = useState("")
  const [agentEmail, setAgentEmail] = useState("")
  const [agentPhone, setAgentPhone] = useState("")
  const [agentRole, setAgentRole] = useState<"super_admin" | "agent">("agent")
  const [isAgentSubmitting, setIsAgentSubmitting] = useState(false)
  const [agentPassword, setAgentPassword] = useState("")
  const [agentPin, setAgentPin] = useState("")
  const [showAgentPassword, setShowAgentPassword] = useState(false)
  const [showAgentPin, setShowAgentPin] = useState(false)

  // Edit Agent modal states
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editRole, setEditRole] = useState<"super_admin" | "agent">("agent")
  const [editActive, setEditActive] = useState(true)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // New Network Form states
  const [netName, setNetName] = useState("")
  const [netCode, setNetCode] = useState("")
  const [netFloat, setNetFloat] = useState("")
  const [netThreshold, setNetThreshold] = useState("")
  const [isNetSubmitting, setIsNetSubmitting] = useState(false)

  // New Category Form states
  const [catName, setCatName] = useState("")
  const [isCatSubmitting, setIsCatSubmitting] = useState(false)

  // Security Form mock states
  const [pinLogin, setPinLogin] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)

  // Security Credentials form states
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isSecuritySubmitting, setIsSecuritySubmitting] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPin, setShowNewPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  // Notification settings mock states
  const [smsAlerts, setSmsAlerts] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [inAppAlerts, setInAppAlerts] = useState(true)

  useEffect(() => {
    if (!loading && role !== "super_admin") {
      router.push("/unauthorized")
    }
  }, [role, loading, router])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (role !== "super_admin") {
    return null
  }

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentName || !agentEmail || !agentPassword || !agentPin) {
      toast.error("Please fill out all required fields")
      return
    }

    if (agentPin.length !== 4 || !/^\d+$/.test(agentPin)) {
      toast.error("PIN must be exactly 4 digits")
      return
    }

    try {
      setIsAgentSubmitting(true)
      await addAgent({
        name: agentName,
        email: agentEmail,
        phone: agentPhone ? agentPhone.trim() : null,
        role: agentRole,
        password: agentPassword,
        pin: agentPin,
      })
      setAgentName("")
      setAgentEmail("")
      setAgentPhone("")
      setAgentRole("agent")
      setAgentPassword("")
      setAgentPin("")
      setShowAgentPassword(false)
      setShowAgentPin(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAgentSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent) return

    setIsEditSubmitting(true)
    try {
      await updateAgent(editingAgent.id, {
        name: editName,
        email: editEmail,
        phone: editPhone ? editPhone.trim() : null,
        role: editRole,
        active: editActive,
      })
      setIsEditOpen(false)
      setEditingAgent(null)
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const startEditAgent = (ag: any) => {
    setEditingAgent(ag)
    setEditName(ag.name)
    setEditEmail(ag.email)
    setEditPhone(ag.phone || "")
    setEditRole(ag.role)
    setEditActive(ag.active)
    setIsEditOpen(true)
  }

  const handleNetworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!netName || !netCode || !netFloat || !netThreshold) return

    try {
      setIsNetSubmitting(true)
      await addNetwork({
        name: netName,
        code: netCode,
        floatBalance: Number(netFloat),
        threshold: Number(netThreshold),
      })
      setNetName("")
      setNetCode("")
      setNetFloat("")
      setNetThreshold("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsNetSubmitting(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName) return

    try {
      setIsCatSubmitting(true)
      await addExpenseCategory(catName)
      setCatName("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsCatSubmitting(false)
    }
  }

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) {
      toast.error("Current password is required")
      return
    }

    if (!newPassword && !newPin) {
      toast.error("Please provide a new password or PIN to update")
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPin) {
      if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        toast.error("PIN must be exactly 4 digits")
        return
      }
      if (newPin !== confirmPin) {
        toast.error("New PINs do not match")
        return
      }
    }

    try {
      setIsSecuritySubmitting(true)
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword: newPassword || undefined,
          newPin: newPin || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update credentials")
      }

      toast.success(data.message || "Credentials updated successfully")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setNewPin("")
      setConfirmPin("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSecuritySubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage system configurations, mobile providers, user agents, security, and databases.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Navigation Sidebar */}
        <Card className="md:w-[240px] shrink-0 h-fit">
          <CardContent className="p-2 flex flex-col gap-1">
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => setActiveTab("profile")}
            >
              <UserRound className="size-4" />
              <span>General Preferences</span>
            </Button>
            
            {role === "super_admin" && (
              <Button
                variant={activeTab === "users" ? "secondary" : "ghost"}
                className="justify-start gap-2 h-9 text-xs"
                onClick={() => setActiveTab("users")}
              >
                <Users className="size-4" />
                <span>User Accounts</span>
              </Button>
            )}

            <Button
              variant={activeTab === "networks" ? "secondary" : "ghost"}
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => setActiveTab("networks")}
            >
              <Layers className="size-4" />
              <span>Mobile Networks</span>
            </Button>

            <Button
              variant={activeTab === "expenses" ? "secondary" : "ghost"}
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => setActiveTab("expenses")}
            >
              <Database className="size-4" />
              <span>Expense Categories</span>
            </Button>

            <Button
              variant={activeTab === "security" ? "secondary" : "ghost"}
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => setActiveTab("security")}
            >
              <KeyRound className="size-4" />
              <span>Security Controls</span>
            </Button>

            <Button
              variant={activeTab === "notifications" ? "secondary" : "ghost"}
              className="justify-start gap-2 h-9 text-xs"
              onClick={() => setActiveTab("notifications")}
            >
              <Bell className="size-4" />
              <span>Alert Settings</span>
            </Button>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <div className="flex-1 min-w-0">
          {/* General Tab */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>General Preferences</CardTitle>
                <CardDescription>Configure localization and backend initialization tasks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-1">
                  <Label>Base Currency Format</Label>
                  <Input value="Tanzanian Shilling (TZS)" disabled className="max-w-[300px]" />
                </div>

                <div className="flex flex-col gap-1.5 border-t pt-6">
                  <Label className="text-sm font-semibold">PostgreSQL Data Synchronization</Label>
                  <p className="text-xs text-muted-foreground max-w-[500px]">
                    If your local PostgreSQL database is empty or requires schema reload, seed it with the default transactions, agents, expenses, and debts setup.
                  </p>
                  <Button
                    variant="outline"
                    className="w-fit gap-1.5 mt-2 text-xs border-success/30 text-success hover:bg-success/5"
                    onClick={seedDatabase}
                    disabled={loading}
                  >
                    <Database className="size-4" />
                    <span>{loading ? "Rebuilding DB..." : "Seed PostgreSQL Database"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Accounts Tab */}
          {activeTab === "users" && role === "super_admin" && (
            <div className="flex flex-col gap-6">
              {/* Agent creation form */}
              <Card>
                <CardHeader>
                  <CardTitle>Create User Profile</CardTitle>
                  <CardDescription>Register a new operator or manager agent to the database.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAgentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-name">Full Name</Label>
                        <Input
                          id="usr-name"
                          placeholder="Juma Mushi"
                          required
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-email">Email Address</Label>
                        <Input
                          id="usr-email"
                          type="email"
                          placeholder="juma@smartagent.co.tz"
                          required
                          value={agentEmail}
                          onChange={(e) => setAgentEmail(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-phone">Phone Number</Label>
                        <Input
                          id="usr-phone"
                          type="tel"
                          placeholder="e.g. 255712345678"
                          value={agentPhone}
                          onChange={(e) => setAgentPhone(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-role">System Role</Label>
                        <Select
                          value={agentRole}
                          onValueChange={(val: "super_admin" | "agent") => setAgentRole(val)}
                        >
                          <SelectTrigger id="usr-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent / Op</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-pass">Password</Label>
                        <div className="relative">
                          <Input
                            id="usr-pass"
                            type={showAgentPassword ? "text" : "password"}
                            placeholder="Enter password"
                            required
                            value={agentPassword}
                            onChange={(e) => setAgentPassword(e.target.value)}
                            className="pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAgentPassword(!showAgentPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            {showAgentPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="usr-pin">4-Digit PIN</Label>
                        <div className="relative">
                          <Input
                            id="usr-pin"
                            type={showAgentPin ? "text" : "password"}
                            placeholder="4 digits"
                            maxLength={4}
                            required
                            value={agentPin}
                            onChange={(e) => setAgentPin(e.target.value)}
                            className="pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAgentPin(!showAgentPin)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          >
                            {showAgentPin ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isAgentSubmitting} className="h-9 px-6">
                        {isAgentSubmitting ? "Creating..." : "Add Agent"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Agents list */}
              <Card>
                <CardHeader>
                  <CardTitle>Registered Operator Agents</CardTitle>
                  <CardDescription>Manage status permissions and accounts settings.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Email Profile</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead>Active Status</TableHead>
                        <TableHead className="w-[180px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((ag) => (
                        <TableRow key={ag.id}>
                          <TableCell className="font-semibold text-xs">{ag.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ag.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{ag.phone || "Not Registered"}</TableCell>
                          <TableCell className="text-xs">
                            {ag.role === "super_admin" ? (
                              <Badge className="bg-primary text-primary-foreground font-normal">Super Admin</Badge>
                            ) : (
                              <Badge variant="secondary" className="font-normal">Agent</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={ag.active ? "text-success border-success/30" : "text-muted-foreground"}
                            >
                              {ag.active ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => startEditAgent(ag)}
                                className="h-6 px-2 text-[10px] gap-1"
                              >
                                <Pencil className="size-3" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                size="xs"
                                variant={ag.active ? "destructive" : "outline"}
                                onClick={() => toggleAgentActive(ag.id, !ag.active)}
                                className="h-6 px-2 text-[10px]"
                              >
                                {ag.active ? "Disable" : "Enable"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Edit Agent Dialog */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Edit Operator Profile</DialogTitle>
                    <DialogDescription>Modify operator account settings and security parameters.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-email">Email Address</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-phone">Phone Number</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        placeholder="e.g. 255712345678"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Required for verification OTP when resetting password/PIN.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="edit-role">System Role</Label>
                      <Select
                        value={editRole}
                        onValueChange={(val: "super_admin" | "agent") => setEditRole(val)}
                      >
                        <SelectTrigger id="edit-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent / Op</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <Label htmlFor="edit-active">Profile Active State</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="edit-active"
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">
                          {editActive ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    <DialogFooter className="pt-2 border-t flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditOpen(false)}
                        className="h-9 px-4"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isEditSubmitting} className="h-9 px-4">
                        {isEditSubmitting ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Networks configuration tab */}
          {activeTab === "networks" && (
            <div className="flex flex-col gap-6">
              {role === "super_admin" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Mobile Provider</CardTitle>
                    <CardDescription>Register a new financial service provider to the ledger.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleNetworkSubmit} className="flex flex-wrap items-end gap-4">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                        <Label htmlFor="net-name">Provider Name</Label>
                        <Input
                          id="net-name"
                          placeholder="HaloPesa"
                          required
                          value={netName}
                          onChange={(e) => setNetName(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 w-[100px]">
                        <Label htmlFor="net-code">Code</Label>
                        <Input
                          id="net-code"
                          placeholder="HP"
                          required
                          value={netCode}
                          onChange={(e) => setNetCode(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                        <Label htmlFor="net-float">Opening Float (TZS)</Label>
                        <Input
                          id="net-float"
                          type="number"
                          placeholder="500,000"
                          required
                          value={netFloat}
                          onChange={(e) => setNetFloat(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                        <Label htmlFor="net-threshold">Low Alert Limit (TZS)</Label>
                        <Input
                          id="net-threshold"
                          type="number"
                          placeholder="200,000"
                          required
                          value={netThreshold}
                          onChange={(e) => setNetThreshold(e.target.value)}
                        />
                      </div>

                      <Button type="submit" disabled={isNetSubmitting} className="h-8">
                        {isNetSubmitting ? "Adding..." : "Add Provider"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Registered Networks & Thresholds</CardTitle>
                  <CardDescription>Configure low-float thresholds and monitor accounts health.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Float Balance</TableHead>
                        <TableHead className="w-[180px] text-right pr-6">Low Alert limit (TZS)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {networks.map((net) => (
                        <TableRow key={net.id}>
                          <TableCell className="font-semibold text-xs">{net.name}</TableCell>
                          <TableCell className="text-xs font-mono">{net.code}</TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            {formatTZS(net.floatBalance)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {role === "super_admin" ? (
                              <Input
                                type="number"
                                className="h-7 w-32 ml-auto text-right font-mono text-xs"
                                value={net.threshold}
                                onChange={(e) =>
                                  updateNetworkThreshold(net.id, Number(e.target.value))
                                }
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums pr-2">
                                {formatTZS(net.threshold)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expense categories tab */}
          {activeTab === "expenses" && (
            <div className="flex flex-col gap-6">
              {role === "super_admin" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Create Expense Category</CardTitle>
                    <CardDescription>Create a new tracking code category tag for shop expenses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCategorySubmit} className="flex items-end gap-4 max-w-[450px]">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input
                          id="cat-name"
                          placeholder="Electricity (LUKU)"
                          required
                          value={catName}
                          onChange={(e) => setCatName(e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={isCatSubmitting} className="h-8">
                        {isCatSubmitting ? "Saving..." : "Add Category"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories Logs</CardTitle>
                  <CardDescription>Registered category classifications used in ledger tracking.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Code ID</TableHead>
                        <TableHead>Category Display Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs font-semibold">{c.id}</TableCell>
                          <TableCell className="text-xs font-medium">{c.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security tab */}
          {activeTab === "security" && (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Controls</CardTitle>
                  <CardDescription>Configure authentication preferences for operators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-semibold">Enable PIN Authentication Login</Label>
                      <p className="text-[10px] text-muted-foreground">Requires 4-digit PIN verification to switch accounts.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={pinLogin}
                      onChange={(e) => setPinLogin(e.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-semibold">Two-Factor Authentication (2FA)</Label>
                      <p className="text-[10px] text-muted-foreground">Receive validation OTP during new logins.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Security Credentials</CardTitle>
                  <CardDescription>Change your login password and 4-digit system PIN.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSecuritySubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="old-password">Current Password</Label>
                      <div className="relative max-w-[400px]">
                        <Input
                          id="old-password"
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Enter your current password"
                          required
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                        >
                          {showOldPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] border-t pt-4">
                      {/* Password Change Section */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-primary">Change Password</h4>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password (optional)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showNewPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* PIN Change Section */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-primary">Change 4-Digit PIN</h4>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="new-pin">New PIN</Label>
                          <div className="relative">
                            <Input
                              id="new-pin"
                              type={showNewPin ? "text" : "password"}
                              maxLength={4}
                              placeholder="Enter 4-digit PIN (optional)"
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value)}
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPin(!showNewPin)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showNewPin ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                          <div className="relative">
                            <Input
                              id="confirm-pin"
                              type={showConfirmPin ? "text" : "password"}
                              maxLength={4}
                              placeholder="Confirm new PIN"
                              value={confirmPin}
                              onChange={(e) => setConfirmPin(e.target.value)}
                              className="pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPin(!showConfirmPin)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                              {showConfirmPin ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSecuritySubmitting} className="mt-4">
                      {isSecuritySubmitting ? "Updating..." : "Update Credentials"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications alerts tab */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>System Notifications Settings</CardTitle>
                <CardDescription>Select low-balance thresholds alert channels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-semibold">In-App Alert Banners</Label>
                    <p className="text-[10px] text-muted-foreground">Show low float alert warnings directly on the dashboard.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={inAppAlerts}
                    onChange={(e) => setInAppAlerts(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-semibold">SMS Alert Notifications</Label>
                    <p className="text-[10px] text-muted-foreground">Send SMS warnings to the owner's phone when float is critical.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={smsAlerts}
                    onChange={(e) => setSmsAlerts(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-semibold">Email Digest Audits</Label>
                    <p className="text-[10px] text-muted-foreground">Receive daily closing cash reports via email summaries.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
