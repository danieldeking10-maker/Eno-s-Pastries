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
    const paymentStatus: string | undefined = payload?.data?.status

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

    const isSuccessful = verifyRes.ok && verifyData?.data?.status === 'success'

    if (!isSuccessful) {
      if (!verifyRes.ok || !verifyData?.data?.status) {
        return NextResponse.json({ error: 'Unable to verify transaction' }, { status: 502 })
      }

      // A verified non-success status is safe to mark as cancelled.
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

