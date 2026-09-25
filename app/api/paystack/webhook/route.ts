'use server'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''
    const secret = (process.env.PAYSTACK_SECRET_KEY || '').replace(/[\'"\r\n\s]/g, '')

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
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    })

    const verifyData = await verifyRes.json().catch(() => ({}))

    const transaction = verifyData?.data
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })

    if (!verifyRes.ok || !transaction || !order) {
      return NextResponse.json({ error: 'Unable to match transaction to order' }, { status: 422 })
    }

    const orderId = transaction.metadata?.orderId
    const expectedAmount = Math.round(Number(order.totalAmount) * 100)
    const transactionEmail = String(transaction.customer?.email || transaction.email || '').trim().toLowerCase()

    if (order.id !== orderId) {
      return NextResponse.json({ error: 'Transaction metadata does not match order' }, { status: 422 })
    }

    if (transaction.status === 'success') {
      if (transaction.amount !== expectedAmount || transactionEmail !== order.customerEmail.trim().toLowerCase()) {
        return NextResponse.json({ error: 'Transaction details do not match order' }, { status: 422 })
      }

      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      })
      return NextResponse.json({ ok: true })
    }

    if (['failed', 'abandoned', 'reversed'].includes(transaction.status)) {
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

