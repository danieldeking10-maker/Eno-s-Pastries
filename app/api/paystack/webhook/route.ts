import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPaystackSignature } from '@/lib/paystack'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text().catch(() => '')
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY?.trim()
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing PAYSTACK_SECRET_KEY' }, { status: 500 })
    }

    const signature = request.headers.get('x-paystack-signature')
    const isSignatureValid = signature
      ? verifyPaystackSignature(rawBody, signature, PAYSTACK_SECRET_KEY)
      : false

    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Paystack sends: { event, data: { reference, status, id, ... } }
    const event = payload?.event
    const reference: string | undefined = payload?.data?.reference
    const dataStatus: string | undefined = payload?.data?.status

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    let isSuccessful = false

    if (isSignatureValid && (event === 'charge.success' || dataStatus === 'success')) {
      isSuccessful = true
    } else {
      // Re-verify directly with Paystack API if signature was not provided or for extra security
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
        const verifyData = await verifyRes.json().catch(() => ({}))
        isSuccessful = verifyRes.ok && verifyData?.data?.status === 'success'
      } catch (err) {
        console.warn('Direct Paystack verification failed during webhook:', err)
      }
    }

    if (isSuccessful) {
      await prisma.order.updateMany({
        where: { paystackReference: reference },
        data: { status: 'CONFIRMED' },
      })
      return NextResponse.json({ ok: true, status: 'CONFIRMED' })
    }

    // If charge explicitly failed, only cancel orders that are still PENDING
    if (event === 'charge.failed' || dataStatus === 'failed') {
      await prisma.order.updateMany({
        where: { paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
    }

    return NextResponse.json({ ok: true, handled: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

