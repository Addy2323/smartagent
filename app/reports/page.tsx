"use client"

import { useMemo, useState } from "react"
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2, RefreshCw } from "lucide-react"
import { useData } from "@/lib/store"
import { formatDateTime, formatDate, formatTZS } from "@/lib/format"
import { isToday, withinDays } from "@/lib/calc"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ReportsPage() {
  const {
    transactions,
    expenses,
    networks,
    cashBalance,
    debts,
  } = useData()

  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // Filter data based on report type
  const data = useMemo(() => {
    const limitDays = reportType === "daily" ? 1 : reportType === "weekly" ? 7 : 30
    
    const txs = transactions.filter((t) => {
      if (reportType === "daily") return isToday(t.createdAt)
      return withinDays(t.createdAt, limitDays)
    })

    const exps = expenses.filter((e) => {
      if (reportType === "daily") return isToday(e.createdAt)
      return withinDays(e.createdAt, limitDays)
    })

    return { txs, exps, days: limitDays }
  }, [transactions, expenses, reportType])

  // Summaries
  const summaries = useMemo(() => {
    const txCount = data.txs.length
    const volume = data.txs.reduce((s, t) => s + t.amount, 0)
    const deposits = data.txs.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0)
    const withdrawals = data.txs.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0)
    const commission = data.txs.reduce((s, t) => s + t.commission, 0)
    const expTotal = data.exps.reduce((s, e) => s + e.amount, 0)
    const netProfit = commission - expTotal

    return {
      txCount,
      volume,
      deposits,
      withdrawals,
      commission,
      expTotal,
      netProfit,
    }
  }, [data])

  // CSV Generator
  const handleExportCSV = () => {
    setIsExporting("csv")
    setTimeout(() => {
      try {
        // Construct CSV string for transactions
        let csvContent = "data:text/csv;charset=utf-8,"
        csvContent += "Reference,Date,Network,Type,Amount (TZS),Commission (TZS),Customer,Phone\n"

        for (const tx of data.txs) {
          const netName = networks.find((n) => n.id === tx.networkId)?.name || tx.networkId
          const row = [
            tx.ref,
            tx.createdAt,
            `"${netName}"`,
            tx.type,
            tx.amount,
            tx.commission,
            `"${tx.customer}"`,
            `"${tx.customerPhone}"`,
          ].join(",")
          csvContent += row + "\n"
        }

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `smartagent_${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success("CSV file generated and downloaded!")
      } catch (err) {
        toast.error("Failed to generate CSV")
      } finally {
        setIsExporting(null)
      }
    }, 1200)
  }

  // Excel export
  const handleExportExcel = () => {
    setIsExporting("excel")
    setTimeout(() => {
      try {
        let htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>SmartAgent Report</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              th { background-color: #cbd5e1; font-weight: bold; }
              td, th { border: 0.5pt solid #94a3b8; }
            </style>
          </head>
          <body>
            <h2>SmartAgent Audit Report (${reportType})</h2>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <br/>
            <h3>Operational Summary</h3>
            <table border="1">
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Total Transactions</td><td>${summaries.txCount}</td></tr>
              <tr><td>Total Transaction Volume</td><td>${summaries.volume}</td></tr>
              <tr><td>Deposits (Inflows)</td><td>${summaries.deposits}</td></tr>
              <tr><td>Withdrawals (Outflows)</td><td>${summaries.withdrawals}</td></tr>
              <tr><td>Float Commission Earned</td><td>${summaries.commission}</td></tr>
              <tr><td>Operational Expenses</td><td>${summaries.expTotal}</td></tr>
              <tr><td>Net Profit</td><td>${summaries.netProfit}</td></tr>
              <tr><td>Cash Balance Drawer</td><td>${cashBalance}</td></tr>
            </table>
            <br/>
            <h3>Transactions Ledger</h3>
            <table border="1">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date & Time</th>
                  <th>Network</th>
                  <th>Type</th>
                  <th>Customer Name</th>
                  <th>Customer Phone</th>
                  <th>Amount (TZS)</th>
                  <th>Commission (TZS)</th>
                </tr>
              </thead>
              <tbody>
        `

        for (const tx of data.txs) {
          const netName = networks.find((n) => n.id === tx.networkId)?.name || tx.networkId
          htmlContent += `
            <tr>
              <td>${tx.ref}</td>
              <td>${tx.createdAt}</td>
              <td>${netName}</td>
              <td>${tx.type}</td>
              <td>${tx.customer}</td>
              <td>${tx.customerPhone}</td>
              <td>${tx.amount}</td>
              <td>${tx.commission}</td>
            </tr>
          `
        }

        htmlContent += `
              </tbody>
            </table>
            <br/>
            <h3>Expenses Ledger</h3>
            <table border="1">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Category ID</th>
                  <th>Description</th>
                  <th>Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
        `

        for (const e of data.exps) {
          htmlContent += `
            <tr>
              <td>${e.createdAt}</td>
              <td>${e.categoryId}</td>
              <td>${e.description}</td>
              <td>-${e.amount}</td>
            </tr>
          `
        }

        htmlContent += `
              </tbody>
            </table>
          </body>
          </html>
        `

        const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `smartagent_${reportType}_report_${new Date().toISOString().slice(0, 10)}.xls`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success("Excel spreadsheet (XLSX) compiled and downloaded!")
      } catch (err) {
        toast.error("Failed to generate Excel report")
      } finally {
        setIsExporting(null)
      }
    }, 1200)
  }

  // PDF export
  const handleExportPDF = () => {
    setIsExporting("pdf")
    setTimeout(() => {
      const runExport = () => {
        const originalConsoleWarn = console.warn
        const originalConsoleError = console.error
        const originalOnError = window.onerror

        const handleWindowError = (event: any) => {
          const msg = event.message || event.error?.message || ''
          if (msg.toLowerCase().includes('unsupported color function')) {
            event.preventDefault()
            event.stopPropagation()
          }
        }

        const handleUnhandledRejection = (event: any) => {
          const reason = event.reason
          const msg = reason?.message || String(reason)
          if (msg.toLowerCase().includes('unsupported color function')) {
            event.preventDefault()
            event.stopPropagation()
          }
        }

        // Find style and link tags to temporarily modify/disable them
        const styleTags = Array.from(document.querySelectorAll('style'))
        const originalStyleTexts = styleTags.map(tag => ({
          tag,
          text: tag.textContent || ''
        }))
        const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[]

        const restoreGlobals = () => {
          console.warn = originalConsoleWarn
          console.error = originalConsoleError
          window.onerror = originalOnError
          window.removeEventListener('error', handleWindowError, true)
          window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
          
          // Restore link tags
          linkTags.forEach(link => {
            try {
              link.disabled = false
            } catch (e) {}
          })

          // Restore style tags
          originalStyleTexts.forEach(({ tag, text }) => {
            try {
              tag.textContent = text
            } catch (e) {}
          })

          try {
            // @ts-ignore
            delete document.styleSheets
          } catch (e) {}
        }

        try {
          // Temporarily disable link stylesheets
          linkTags.forEach(link => {
            try {
              link.disabled = true
            } catch (e) {}
          })

          // Strip unsupported color functions from style tags
          styleTags.forEach(tag => {
            try {
              if (tag.textContent) {
                let text = tag.textContent
                text = text.replace(/lab\([^)]+\)/g, 'rgb(0,0,0)')
                text = text.replace(/oklch\([^)]+\)/g, 'rgb(0,0,0)')
                tag.textContent = text
              }
            } catch (e) {}
          })

          // Shadow document.styleSheets to bypass html2canvas parsing of Tailwind styles
          try {
            Object.defineProperty(document, 'styleSheets', {
              value: [],
              configurable: true
            })
          } catch (e) {}

          console.warn = (...args) => {
            const msg = args.map(a => String(a?.message || a)).join(' ')
            if (msg.toLowerCase().includes('unsupported color function')) return
            originalConsoleWarn.apply(console, args)
          }
          console.error = (...args) => {
            const msg = args.map(a => String(a?.message || a)).join(' ')
            if (msg.toLowerCase().includes('unsupported color function')) return
            originalConsoleError.apply(console, args)
          }

          window.onerror = function (message, source, lineno, colno, error) {
            const msg = String(message || error?.message || '')
            if (msg.toLowerCase().includes('unsupported color function')) {
              return true // Swallow error
            }
            if (originalOnError) {
              return originalOnError.apply(this, arguments)
            }
            return false
          }

          window.addEventListener('error', handleWindowError, true)
          window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

          const element = document.createElement("div")
          const netProfit = summaries.netProfit
          const isNetProfitPositive = netProfit >= 0

          // HTML table rows for transactions
          const txRows = data.txs.length === 0
            ? '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 8px;">No transactions logged in this period.</td></tr>'
            : data.txs.map((tx) => {
                const netName = networks.find((n) => n.id === tx.networkId)?.name || tx.networkId
                return `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${tx.ref}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${netName}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${tx.type.toUpperCase()}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right;">${formatTZS(tx.amount)}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right;">${formatTZS(tx.commission)}</td>
                  </tr>
                `
              }).join("")

          // HTML table rows for expenses
          const expRows = data.exps.length === 0
            ? '<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 8px;">No expenses recorded in this period.</td></tr>'
            : data.exps.map((e) => {
                return `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${new Date(e.createdAt).toLocaleDateString()}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1;">${e.description}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; color: #dc2626;">-${formatTZS(e.amount)}</td>
                  </tr>
                `
              }).join("")

          element.innerHTML = `
            <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 30px; background: white; width: 750px; box-sizing: border-box;">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #0d9488;">SmartAgent Manager</h1>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Financial Operations Audit System</p>
                </div>
                <div style="text-align: right; font-size: 11px; color: #475569;">
                  <p style="margin: 2px 0;"><strong>Report:</strong> ${reportType.toUpperCase()} AUDIT</p>
                  <p style="margin: 2px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                  <p style="margin: 2px 0;"><strong>Status:</strong> AUDITED &amp; CLOSED</p>
                </div>
              </div>

              <h2 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Operational Summary</h2>
              
              <!-- Summary Cards Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc;">
                  <h3 style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Transactions</h3>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Total Count:</span><span style="font-weight: bold;">${summaries.txCount}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Volume:</span><span style="font-weight: bold;">${formatTZS(summaries.volume)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Deposits:</span><span style="font-weight: bold; color: #16a34a;">+${formatTZS(summaries.deposits)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Withdrawals:</span><span style="font-weight: bold; color: #dc2626;">-${formatTZS(summaries.withdrawals)}</span>
                  </div>
                </div>

                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc;">
                  <h3 style="margin: 0 0 8px 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Finance</h3>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Float Commission:</span><span style="font-weight: bold; color: #16a34a;">+${formatTZS(summaries.commission)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Expenses Deducted:</span><span style="font-weight: bold; color: #dc2626;">-${formatTZS(summaries.expTotal)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0;">
                    <span>Cash on Hand:</span><span style="font-weight: bold;">${formatTZS(cashBalance)}</span>
                  </div>
                </div>
              </div>

              <!-- Net Profit Banner -->
              <div style="border: 1px solid ${isNetProfitPositive ? '#bbf7d0' : '#fecaca'}; background: ${isNetProfitPositive ? '#f0fdf4' : '#fdf2f2'}; border-radius: 6px; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <span style="font-weight: bold; font-size: 12px; color: #475569;">Net Profit (Commission - Expenses)</span>
                <span style="font-size: 18px; font-weight: 800; color: ${isNetProfitPositive ? '#16a34a' : '#dc2626'};">${isNetProfitPositive ? "+" : ""}${formatTZS(netProfit)}</span>
              </div>

              <h2 style="font-size: 13px; text-transform: uppercase; margin-bottom: 10px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Transactions Ledger</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 25px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left; font-weight: bold;">
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Ref</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Date</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Network</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Type</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right;">Amount (TZS)</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right;">Comm. (TZS)</th>
                  </tr>
                </thead>
                <tbody>
                  ${txRows}
                </tbody>
              </table>

              <h2 style="font-size: 13px; text-transform: uppercase; margin-bottom: 10px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Expenses Ledger</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left; font-weight: bold;">
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; width: 120px;">Date</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Description</th>
                    <th style="padding: 6px; border-bottom: 1px solid #cbd5e1; text-align: right; width: 120px;">Amount (TZS)</th>
                  </tr>
                </thead>
                <tbody>
                  ${expRows}
                </tbody>
              </table>
              
              <div style="margin-top: 30px; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                SmartAgent Manager v1.0 · Digital Verification Seal: SEC-AUD-0099
              </div>
            </div>
          `

          const opt = {
            margin:       0.3,
            filename:     `smartagent_${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
          }

          // @ts-ignore
          window.html2pdf().from(element).set(opt).save().then(() => {
            restoreGlobals()
            toast.success("PDF report downloaded to device successfully!")
            setIsExporting(null)
          }).catch((err: any) => {
            restoreGlobals()
            console.error(err)
            toast.error("Failed to compile PDF file")
            setIsExporting(null)
          })
        } catch (err) {
          restoreGlobals()
          console.error(err)
          toast.error("Failed to generate PDF content")
          setIsExporting(null)
        }
      }

      // @ts-ignore
      if (window.html2pdf) {
        runExport()
      } else {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        script.onload = () => {
          runExport()
        }
        script.onerror = () => {
          toast.error("Failed to load PDF engine. Check connection.")
          setIsExporting(null)
        }
        document.body.appendChild(script)
      }
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Business Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate and export daily, weekly, or monthly financial operational audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <CalendarIcon className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Audit</SelectItem>
              <SelectItem value="weekly">Weekly Audit (7d)</SelectItem>
              <SelectItem value="monthly">Monthly Audit (30d)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Export Options Card */}
      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-sm font-semibold">Export & Download Options</CardTitle>
          <CardDescription>Export transactions and cash metrics for offline storage.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 p-4">
          <Button
            variant="outline"
            className="gap-1.5 h-8 flex-1 sm:flex-initial text-xs"
            onClick={handleExportCSV}
            disabled={isExporting !== null}
          >
            {isExporting === "csv" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            className="gap-1.5 h-8 flex-1 sm:flex-initial text-xs"
            onClick={handleExportExcel}
            disabled={isExporting !== null}
          >
            {isExporting === "excel" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5" />
            )}
            <span>Export Excel (XLSX)</span>
          </Button>

          <Button
            variant="outline"
            className="gap-1.5 h-8 flex-1 sm:flex-initial text-xs"
            onClick={handleExportPDF}
            disabled={isExporting !== null}
          >
            {isExporting === "pdf" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            <span>Export PDF</span>
          </Button>
        </CardContent>
      </Card>

      {/* Summaries Panel */}
      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-sm font-semibold">Report Audit Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-xs">Total Count of Transactions</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums pr-6">
                  {summaries.txCount} transactions
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-xs">Total Transaction Volume</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums pr-6">
                  {formatTZS(summaries.volume)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-xs pl-6 text-muted-foreground">Total Cash Deposits (Inflows)</TableCell>
                <TableCell className="text-right font-mono text-xs text-success tabular-nums pr-6">
                  +{formatTZS(summaries.deposits)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-xs pl-6 text-muted-foreground">Total Cash Withdrawals (Outflows)</TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive tabular-nums pr-6">
                  -{formatTZS(summaries.withdrawals)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-xs">Total Commission Commissions</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-success tabular-nums pr-6">
                  +{formatTZS(summaries.commission)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-xs">Total Operational Expenses</TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive tabular-nums pr-6">
                  -{formatTZS(summaries.expTotal)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/40 font-bold">
                <TableCell className="text-xs font-bold">Net P&L Profit margin</TableCell>
                <TableCell className={`text-right font-mono text-xs font-bold pr-6 ${summaries.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {summaries.netProfit >= 0 ? "+" : ""}{formatTZS(summaries.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
