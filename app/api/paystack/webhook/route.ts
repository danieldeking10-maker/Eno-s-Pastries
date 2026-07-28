'use server'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing PAYSTACK_SECRET_KEY' }, { status: 500 })
    }

    // Paystack sends: { event, data: { reference, status, amount, ... } }
    const reference: string | undefined = payload?.data?.reference
    const paymentStatus: string | undefined = payload?.data?.status

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    // Optional but safer: verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const verifyData = await verifyRes.json().catch(() => ({}))

    const isSuccessful = verifyRes.ok && verifyData?.data?.status === 'success'

    if (!isSuccessful) {
      // Mark cancelled if payment failed; keep idempotent by not erroring
      await prisma.order.updateMany({
        where: { paystackReference: reference },
        data: { status: 'CANCELLED' },
      })

      return NextResponse.json({ ok: true })
    }

    await prisma.order.updateMany({
      where: { paystackReference: reference },
      data: { status: 'CONFIRMED' },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

