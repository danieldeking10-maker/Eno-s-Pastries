import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${origin}/dashboard?payment=missing_reference`)
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!PAYSTACK_SECRET_KEY) {
    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
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

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' },
        })
      } else {
        await prisma.order.updateMany({
          where: { paystackReference: reference },
          data: { status: 'CONFIRMED' },
        })
      }

      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    } else {
      await prisma.order.updateMany({
        where: { paystackReference: reference },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.redirect(`${origin}/dashboard?payment=failed`)
    }
  } catch (error) {
    console.error('Paystack callback error:', error)
    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }
}
