import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { recordVerifiedPayment, transactionMatchesOrder, verifyPaystackTransaction } from '@/lib/paystack-payment'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order by ID:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const status = body?.status
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }

    // Prisma enum values are: PENDING, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] as const
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let paymentVerified = Boolean(order.paystackTransactionId && order.paidAt)
    if (status === 'CONFIRMED' && !paymentVerified) {
      if (!order.paystackReference) {
        return NextResponse.json({ error: 'A successful Paystack payment is required before confirmation' }, { status: 409 })
      }

      const transaction = await verifyPaystackTransaction(order.paystackReference)
      if (!transaction || transaction.status !== 'success' || !transactionMatchesOrder(transaction, order.paystackReference, order)) {
        return NextResponse.json({ error: 'A successful Paystack payment is required before confirmation' }, { status: 409 })
      }

      paymentVerified = await recordVerifiedPayment(order.paystackReference, order.id, transaction)
      if (!paymentVerified) {
        return NextResponse.json({ error: 'Payment could not be recorded; order remains unconfirmed' }, { status: 409 })
      }
    }

    if (['PREPARING', 'READY', 'DELIVERED'].includes(status) && !paymentVerified) {
      return NextResponse.json({ error: 'A successful Paystack payment is required before fulfillment' }, { status: 409 })
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}


