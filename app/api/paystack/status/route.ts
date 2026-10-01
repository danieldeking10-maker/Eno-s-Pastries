import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPaystackSecretKey, transactionMatchesOrder, verifyPaystackTransaction } from '@/lib/paystack-payment'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')?.trim()
  const secret = getPaystackSecretKey()

  if (!reference || !secret) {
    return NextResponse.json({ payment: 'error' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })
    if (!order) return NextResponse.json({ payment: 'error' }, { status: 404 })

    const transaction = await verifyPaystackTransaction(reference)

    if (!transaction) {
      return NextResponse.json({ payment: 'error' }, { status: 502 })
    }

    if (!transactionMatchesOrder(transaction, reference, order)) {
      return NextResponse.json({ payment: 'error' }, { status: 422 })
    }

    if (transaction.status === 'success' && order.status === 'CONFIRMED') {
      return NextResponse.json({ payment: 'success', orderId: order.id })
    }

    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed') {
      return NextResponse.json({ payment: 'failed', orderId: order.id })
    }

    return NextResponse.json({ payment: 'pending', orderId: order.id })
  } catch (error) {
    console.error('Paystack status error:', error)
    return NextResponse.json({ payment: 'error' }, { status: 500 })
  }
}