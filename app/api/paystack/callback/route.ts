import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { recordVerifiedPayment, transactionMatchesOrder, verifyPaystackTransaction, getPaystackSecretKey } from '@/lib/paystack-payment'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${origin}/dashboard?payment=missing_reference`)
  }

  try {
    let order: any = null
    try {
      order = await prisma.order.findUnique({ where: { paystackReference: reference } })
    } catch {}
    if (!order) {
      const { getOrderByReferenceFromSupabase } = await import('@/lib/supabase-service')
      order = await getOrderByReferenceFromSupabase(reference)
    }

    if (order?.status === 'CONFIRMED') {
      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    }

    const PAYSTACK_SECRET_KEY = getPaystackSecretKey()
    if (!PAYSTACK_SECRET_KEY) {
      if (order?.status === 'CONFIRMED') {
        return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
      }
      return NextResponse.redirect(`${origin}/dashboard?payment=error`)
    }

    const transaction = await verifyPaystackTransaction(reference)

    if (!transaction || !order || !transactionMatchesOrder(transaction, reference, order)) {
      return NextResponse.redirect(`${origin}/dashboard?payment=error`)
    }

    if (transaction.status === 'success') {
      await recordVerifiedPayment(reference, order.id, transaction)
      return NextResponse.redirect(`${origin}/dashboard?payment=success&ref=${reference}`)
    }

    if (transaction.status === 'failed' || transaction.status === 'abandoned' || transaction.status === 'reversed') {
      await prisma.order.updateMany({
        where: { id: order.id, paystackReference: reference, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      }).catch(() => {})
      return NextResponse.redirect(`${origin}/dashboard?payment=failed`)
    }

    return NextResponse.redirect(`${origin}/dashboard?payment=pending&ref=${reference}`)
  } catch (error) {
    console.error('Paystack callback error:', error)
    return NextResponse.redirect(`${origin}/dashboard?payment=error`)
  }
}
