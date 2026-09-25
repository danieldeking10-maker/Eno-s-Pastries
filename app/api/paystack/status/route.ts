import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function cleanSecret(value: string | undefined) {
  return (value || '').replace(/[\'"\r\n\s]/g, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')?.trim()
  const secret = cleanSecret(process.env.PAYSTACK_SECRET_KEY)

  if (!reference || !secret) {
    return NextResponse.json({ payment: 'error' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })
    if (!order) return NextResponse.json({ payment: 'error' }, { status: 404 })

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    const verifyData = await verifyRes.json().catch(() => ({}))
    const transaction = verifyData?.data

    if (!verifyRes.ok || !transaction) {
      return NextResponse.json({ payment: 'error' }, { status: 502 })
    }

    const expectedAmount = Math.round(Number(order.totalAmount) * 100)
    const transactionEmail = String(transaction.customer?.email || transaction.email || '').trim().toLowerCase()
    const matchesOrder =
      transaction.metadata?.orderId === order.id &&
      transaction.amount === expectedAmount &&
      transactionEmail === order.customerEmail.trim().toLowerCase()

    if (!matchesOrder) {
      return NextResponse.json({ payment: 'error' }, { status: 422 })
    }

    if (transaction.status === 'success' && order.status !== 'CANCELLED') {
      return NextResponse.json({ payment: 'success', orderId: order.id })
    }

    if (['failed', 'abandoned', 'reversed'].includes(transaction.status)) {
      return NextResponse.json({ payment: 'failed', orderId: order.id })
    }

    return NextResponse.json({ payment: 'pending', orderId: order.id })
  } catch (error) {
    console.error('Paystack status error:', error)
    return NextResponse.json({ payment: 'error' }, { status: 500 })
  }
}