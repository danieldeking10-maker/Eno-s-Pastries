import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPaystackSecretKey, recordVerifiedPayment, transactionMatchesOrder, verifyPaystackTransaction } from '@/lib/paystack-payment'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')?.trim()

  if (!reference) {
    return NextResponse.json({ payment: 'error' }, { status: 400 })
  }

  try {
    let order: any = null
    try {
      order = await prisma.order.findUnique({ where: { paystackReference: reference } })
    } catch {}
    if (!order) {
      const { getOrderByReferenceFromSupabase } = await import('@/lib/supabase-service')
      order = await getOrderByReferenceFromSupabase(reference)
    }
    if (!order) return NextResponse.json({ payment: 'error' }, { status: 404 })

    // If order is already confirmed (e.g. via webhook, callback, or demo mode), return success immediately
    if (order.status === 'CONFIRMED') {
      return NextResponse.json({ payment: 'success', orderId: order.id })
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ payment: 'failed', orderId: order.id })
    }

    const secret = getPaystackSecretKey()
    if (!secret) {
      return NextResponse.json({ payment: 'pending', orderId: order.id })
    }

    const transaction = await verifyPaystackTransaction(reference)

    if (!transaction) {
      return NextResponse.json({ payment: 'pending', orderId: order.id })
    }

    if (!transactionMatchesOrder(transaction, reference, order)) {
      return NextResponse.json({ payment: 'error' }, { status: 422 })
    }

    if (transaction.status === 'success') {
      await recordVerifiedPayment(reference, order.id, transaction)
      return NextResponse.json({ payment: 'success', orderId: order.id })
    }

    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed') {
      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      }).catch(() => {})
      return NextResponse.json({ payment: 'failed', orderId: order.id })
    }

    return NextResponse.json({ payment: 'pending', orderId: order.id })
  } catch (error) {
    console.error('Paystack status error:', error)
    return NextResponse.json({ payment: 'error' }, { status: 500 })
  }
}
