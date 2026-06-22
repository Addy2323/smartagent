import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth-api"

export async function GET() {
  try {
    await getAuthSession()

    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
    })
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ expenses, categories })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession()
    const body = await req.json()

    // Case 1: Add new category
    if (body.name && !body.categoryId) {
      if (typeof body.name !== "string" || body.name.trim().length < 1) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 })
      }

      const id = body.name.toLowerCase().trim().replace(/\s+/g, "-")

      // Check for duplicate
      const existing = await prisma.expenseCategory.findUnique({ where: { id } })
      if (existing) {
        return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 })
      }

      const cat = await prisma.expenseCategory.create({
        data: { id, name: body.name.trim() },
      })
      return NextResponse.json(cat)
    }

    // Case 2: Record new expense
    const { categoryId, amount, description, receipt } = body

    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json({ error: "Expense category is required" }, { status: 400 })
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.expenseCategory.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        throw new Error("Expense category not found")
      }

      const expense = await tx.expense.create({
        data: {
          categoryId,
          amount: Number(amount),
          description: description || "",
          receipt: receipt || null,
          agentId: session.agentId,
        },
      })

      // Automatically deduct from cash on hand (outflow entry)
      await tx.cashEntry.create({
        data: {
          direction: "out",
          amount: Number(amount),
          reason: `Expense: ${category.name} (${description || "No description"})`,
          agentId: session.agentId,
        },
      })

      return expense
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
