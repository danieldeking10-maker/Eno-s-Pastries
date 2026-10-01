import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { recordVerifiedPayment, transactionMatchesOrder, verifyPaystackTransaction } from '@/lib/paystack-payment'

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
    const order = await prisma.order.findUnique({ where: { paystackReference: reference } })
    const transaction = await verifyPaystackTransaction(reference)

    if (!transaction || !order || !transactionMatchesOrder(transaction, reference, order)) {
      return NextResponse.redirect(`${origin}/dashboard?payment=error`)
    }

    if (transaction.status === 'success') {
      const recorded = await recordVerifiedPayment(reference, order.id, transaction)
      if (!recorded) {
        return NextResponse.redirect(`${origin}/dashboard?payment=error`)
      }
      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    }

    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed') {
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
