import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAppOrigin } from '@/lib/paystack'

export async function GET(request: Request) {
  const origin = getAppOrigin(request)
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${origin}/dashboard?payment=missing_reference`)
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!PAYSTACK_SECRET_KEY) {
    // Check if it was placed as a confirmed demo order
    const existingOrder = await prisma.order.findFirst({
      where: { paystackReference: reference },
    })

    if (existingOrder?.status === 'CONFIRMED') {
      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    }

    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }

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

    if (verifyRes.ok && verifyData?.data?.status === 'success') {
      const orderId = verifyData?.data?.metadata?.orderId

      let updated = false
      if (orderId) {
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED' },
          })
          updated = true
        } catch (updateErr) {
          console.warn('Failed to update order by ID, falling back to reference:', updateErr)
        }
      }

      if (!updated) {
        await prisma.order.updateMany({
          where: { paystackReference: reference },
          data: { status: 'CONFIRMED' },
        })
      }

      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${encodeURIComponent(reference)}`)
    } else {
      // Only cancel orders that are still PENDING
      await prisma.order.updateMany({
        where: { paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.redirect(`${origin}/dashboard?payment=failed`)
    }
  } catch (error) {
    console.error('Paystack callback error:', error)
    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }
}
