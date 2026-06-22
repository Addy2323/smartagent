"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Database, KeyRound, Loader2, Lock, ShieldCheck, UserCheck, Users, Eye, EyeOff } from "lucide-react"
import { useData } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function LoginPage() {
  const { agents, currentAgent, setCurrentAgentId, loading, seedDatabase } = useData()
  const router = useRouter()

  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [pin, setPin] = useState("")
  const [password, setPassword] = useState("")
  const [loginMode, setLoginMode] = useState<"pin" | "password">("pin")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Forgot Password flow states
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState(1)
  const [forgotPhone, setForgotPhone] = useState("")
  const [forgotOtp, setForgotOtp] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPass, setShowForgotPass] = useState(false)
  const [showForgotPassConfirm, setShowForgotPassConfirm] = useState(false)
  const [showForgotPin, setShowForgotPin] = useState(false)
  const [showForgotPinConfirm, setShowForgotPinConfirm] = useState(false)


  // Redirect if already logged in
  useEffect(() => {
    if (!loading && currentAgent) {
      router.push("/")
    }
  }, [currentAgent, loading, router])

  // Select first agent by default once loaded
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id)
    }
  }, [agents, selectedAgentId])

  const activeAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedAgentId) || null
  }, [agents, selectedAgentId])

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num)
    }
  }

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin("")
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedAgentId) return

    setIsLoggingIn(true)
    try {
      const body: any = { agentId: selectedAgentId }
      if (loginMode === "pin") {
        body.pin = pin
      } else {
        body.password = password
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCurrentAgentId(selectedAgentId)
        toast.success(`Access granted! Welcome, ${data.agent.name}.`)
        router.push("/")
      } else {
        toast.error(data.error || "Invalid credentials. Please try again.")
        setPin("")
        setPassword("")
      }
    } catch (err: any) {
      toast.error("Authentication failed. Check connection.")
      setPin("")
      setPassword("")
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Trigger login automatically once 4 digits are typed in PIN mode
  useEffect(() => {
    if (loginMode === "pin" && pin.length === 4) {
      handleLogin()
    }
  }, [pin, loginMode])

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">Initializing secure gateway...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-radial from-slate-900 via-background to-background p-4 md:p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,oklch(0.9_0.01_170/5%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.9_0.01_170/5%)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <Card className="w-full max-w-[420px] shadow-2xl border-border bg-card/80 backdrop-blur z-10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-success to-primary" />
        
        <CardHeader className="text-center pb-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-2">
            <Lock className="size-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">SmartAgent Gateway</CardTitle>
          <CardDescription className="text-xs">
            Authenticate to manage transaction float and cash ledger.
          </CardDescription>
        </CardHeader>

        {agents.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-6 gap-3 text-center">
            <AlertCircle className="size-10 text-warning" />
            <p className="text-xs text-muted-foreground max-w-[300px]">
              No agent accounts detected in the local database. Please click the button below to initialize PostgreSQL seed records.
            </p>
            <Button size="sm" onClick={seedDatabase} className="gap-1.5 text-xs">
              <Database className="size-3.5" />
              <span>Initialize Database Seed</span>
            </Button>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-4">
            {/* Operator Selection */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-agent">Select Operator Profile</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger id="login-agent" className="h-9">
                  <SelectValue placeholder="Select active agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        {a.role === "super_admin" ? (
                          <ShieldCheck className="size-3.5 text-primary shrink-0" />
                        ) : (
                          <UserCheck className="size-3.5 text-success shrink-0" />
                        )}
                        <span className="font-medium text-xs">{a.name} ({a.role === "super_admin" ? "Admin" : "Agent"})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Login Mode Toggle */}
            <div className="flex rounded-lg border bg-muted p-0.5 mt-1 text-xs">
              <button
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  loginMode === "pin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setLoginMode("pin")
                  handleClear()
                }}
              >
                PIN Passcode
              </button>
              <button
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  loginMode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setLoginMode("password")
                  handleClear()
                }}
              >
                Password Access
              </button>
            </div>

            {/* Login forms */}
            {loginMode === "password" ? (
              <>
              <form
                onSubmit={handleLogin}
                className="flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-pass">Password</Label>
                <div className="relative">
                  <Input
                    id="login-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
                <Button type="submit" className="w-full h-9 gap-1.5 mt-1" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      <span>Authenticate</span>
                    </>
                  )}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setIsForgotOpen(true)
                  setForgotStep(1)
                  setForgotPhone("")
                  setForgotOtp("")
                  setNewPass("")
                  setConfirmPass("")
                  setNewPin("")
                  setConfirmPin("")
                  setShowForgotPass(false)
                  setShowForgotPassConfirm(false)
                  setShowForgotPin(false)
                  setShowForgotPinConfirm(false)
                }}
                className="text-xs text-primary hover:underline font-medium mx-auto mt-2 block"
              >
                Forgot Password?
              </button>
              </>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Visual PIN indicators */}
                <div className="flex justify-center items-center gap-4 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`size-3 rounded-full border-2 transition-all duration-150 ${
                        idx < pin.length
                          ? "bg-primary border-primary scale-110"
                          : "border-muted-foreground/30 bg-transparent"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground text-center -mt-1 font-medium">
                  Enter 4-digit authorization PIN
                </p>

                {/* Tactile Keypad */}
                <div className="grid grid-cols-3 gap-2 px-6">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeyPress(num)}
                      className="h-10 rounded-lg border bg-card hover:bg-muted text-sm font-semibold active:scale-95 transition-all outline-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-10 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition-all outline-none"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyPress("0")}
                    className="h-10 rounded-lg border bg-card hover:bg-muted text-sm font-semibold active:scale-95 transition-all outline-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-10 rounded-lg text-xs font-semibold hover:bg-muted active:scale-95 transition-all outline-none"
                  >
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true)
                    setForgotStep(1)
                    setForgotPhone("")
                    setForgotOtp("")
                    setNewPass("")
                    setConfirmPass("")
                    setNewPin("")
                    setConfirmPin("")
                    setShowForgotPass(false)
                    setShowForgotPassConfirm(false)
                    setShowForgotPin(false)
                    setShowForgotPinConfirm(false)
                  }}
                  className="text-xs text-primary hover:underline font-medium mx-auto mt-2 block"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </CardContent>
        )}

        <CardFooter className="text-center justify-center border-t py-3 bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            SmartAgent Manager v1.0 · Protected by local hardware enclave.
          </p>
        </CardFooter>
      </Card>

      {/* Forgot Password Modal Overlay */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] bg-card rounded-xl border border-border p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsForgotOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
            >
              ✕
            </button>

            <div className="text-center pb-2">
              <h3 className="text-lg font-bold tracking-tight">Reset Operator Credentials</h3>
              <p className="text-xs text-muted-foreground">
                Recover your access pin and password via SMS verification.
              </p>
            </div>

            {/* Steps Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full flex-1 max-w-[60px] transition-colors duration-250 ${
                    step <= forgotStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Input Registered Phone Number */}
            {forgotStep === 1 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!forgotPhone) return
                  setIsForgotSubmitting(true)
                  try {
                    const res = await fetch("/api/auth/forgot-password/send-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ phone: forgotPhone }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || "Failed to send verification code")
                    toast.success(data.message || "OTP code sent successfully")
                    setForgotStep(2)
                  } catch (err: any) {
                    toast.error(err.message)
                  } finally {
                    setIsForgotSubmitting(false)
                  }
                }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="forgot-phone">Registered Phone Number</Label>
                  <Input
                    id="forgot-phone"
                    placeholder="e.g. 255744963858"
                    required
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Enter the phone number registered for your account.
                  </p>
                </div>
                <Button type="submit" disabled={isForgotSubmitting} className="w-full h-9">
                  {isForgotSubmitting ? "Sending..." : "Request Verification Code"}
                </Button>
              </form>
            )}

            {/* Step 2: Verify OTP Code */}
            {forgotStep === 2 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!forgotOtp) return
                  setIsForgotSubmitting(true)
                  try {
                    const res = await fetch("/api/auth/forgot-password/verify-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ phone: forgotPhone, otp: forgotOtp }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || "Code verification failed")
                    toast.success("Verification successful! Update your credentials.")
                    setForgotStep(3)
                  } catch (err: any) {
                    toast.error(err.message)
                  } finally {
                    setIsForgotSubmitting(false)
                  }
                }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="forgot-otp">Verification OTP Code</Label>
                  <Input
                    id="forgot-otp"
                    placeholder="Enter 6-digit OTP code"
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="h-9 text-center font-mono tracking-widest text-sm"
                    maxLength={6}
                  />

                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 h-9"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isForgotSubmitting} className="flex-1 h-9">
                    {isForgotSubmitting ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Enter New Credentials */}
            {forgotStep === 3 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!newPass || !newPin) {
                    toast.error("Please fill in both new password and PIN")
                    return
                  }
                  if (newPass !== confirmPass) {
                    toast.error("Passwords do not match")
                    return
                  }
                  if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
                    toast.error("PIN must be exactly 4 digits")
                    return
                  }
                  if (newPin !== confirmPin) {
                    toast.error("PINs do not match")
                    return
                  }
                  setIsForgotSubmitting(true)
                  try {
                    const res = await fetch("/api/auth/forgot-password/verify-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        phone: forgotPhone,
                        otp: forgotOtp,
                        newPassword: newPass,
                        newPin,
                      }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || "Failed to reset credentials")
                    toast.success("Credentials updated successfully!")
                    setCurrentAgentId(data.agent.id)
                    setIsForgotOpen(false)
                    router.push("/")
                  } catch (err: any) {
                    toast.error(err.message)
                  } finally {
                    setIsForgotSubmitting(false)
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="forgot-pass">New Password</Label>
                    <div className="relative">
                      <Input
                        id="forgot-pass"
                        type={showForgotPass ? "text" : "password"}
                        placeholder="Enter new password"
                        required
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="h-9 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showForgotPass ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="forgot-pass-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="forgot-pass-confirm"
                        type={showForgotPassConfirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        required
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className="h-9 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassConfirm(!showForgotPassConfirm)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showForgotPassConfirm ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="forgot-pin">New PIN</Label>
                      <div className="relative">
                        <Input
                          id="forgot-pin"
                          type={showForgotPin ? "text" : "password"}
                          placeholder="4 digits"
                          maxLength={4}
                          required
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="h-9 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPin(!showForgotPin)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                        >
                          {showForgotPin ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="forgot-pin-confirm">Confirm PIN</Label>
                      <div className="relative">
                        <Input
                          id="forgot-pin-confirm"
                          type={showForgotPinConfirm ? "text" : "password"}
                          placeholder="Confirm PIN"
                          maxLength={4}
                          required
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          className="h-9 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPinConfirm(!showForgotPinConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                        >
                          {showForgotPinConfirm ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={isForgotSubmitting} className="w-full h-9">
                  {isForgotSubmitting ? "Resetting..." : "Reset Credentials & Login"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
