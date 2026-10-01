'use server'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { getPaystackSecretKey, recordVerifiedPayment, transactionMatchesOrder, verifyPaystackTransaction } from '@/lib/paystack-payment'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''
    const secret = getPaystackSecretKey()

    if (!secret) {
      return NextResponse.json({ error: 'Missing PAYSTACK_SECRET_KEY' }, { status: 500 })
    }

    const expectedSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')
    if (!signature || signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Paystack sends: { event, data: { reference, status, amount, ... } }
    const reference: string | undefined = payload?.data?.reference
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    // Optional but safer: verify with Paystack
    const transaction = await verifyPaystackTransaction(reference)
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })

    if (!transaction || !order) {
      return NextResponse.json({ error: 'Unable to match transaction to order' }, { status: 422 })
    }

    if (!transactionMatchesOrder(transaction, reference, order)) {
      return NextResponse.json({ error: 'Transaction details do not match order' }, { status: 422 })
    }
    if (transaction.status === 'success') {
      const recorded = await recordVerifiedPayment(reference, order.id, transaction)
      if (!recorded) {
        return NextResponse.json({ error: 'Order is not eligible for payment confirmation' }, { status: 409 })
      }
      return NextResponse.json({ ok: true })
    }

    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed') {
      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

