import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${origin}/dashboard?payment=missing_reference`)
  }

  const PAYSTACK_SECRET_KEY = (process.env.PAYSTACK_SECRET_KEY || '').replace(/['"\r\n\s]/g, '')
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

    const transaction = verifyData?.data
    const orderId = transaction?.metadata?.orderId
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })

    if (!verifyRes.ok || !transaction || !order || order.id !== orderId) {
      return NextResponse.redirect(`${origin}/dashboard?payment=error`)
    }

    const expectedAmount = Math.round(Number(order.totalAmount) * 100)
    const transactionEmail = String(transaction.customer?.email || transaction.email || '').trim().toLowerCase()

    if (transaction.status === 'success') {
      if (transaction.amount !== expectedAmount || transactionEmail !== order.customerEmail.trim().toLowerCase()) {
        console.error('Paystack callback mismatch for order:', order.id)
        return NextResponse.redirect(`${origin}/dashboard?payment=error`)
      }

      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      })
      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    }

    if (['failed', 'abandoned', 'reversed'].includes(transaction.status)) {
      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.redirect(`${origin}/dashboard?payment=failed`)
    }

    return NextResponse.redirect(`${origin}/dashboard?payment=pending&ref=${reference}`)
  } catch (error) {
    console.error('Paystack callback error:', error)
    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }
}
