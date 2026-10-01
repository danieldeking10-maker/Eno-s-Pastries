import prisma from '@/lib/prisma'
import { syncOrderPaymentToSupabase } from '@/lib/supabase-service'

export type PaystackTransaction = {
  id?: string | number
  reference?: string
  status?: string
  amount?: number
  currency?: string
  channel?: string
  paid_at?: string | null
  email?: string
  customer?: { email?: string }
  metadata?: { orderId?: string }
}

export function getPaystackSecretKey() {
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').replace(/[\s'"\r\n]/g, '')
  return /^sk_(live|test)_[A-Za-z0-9]+$/.test(secret) ? secret : ''
}

export function getPaystackCurrency() {
  return (process.env.PAYSTACK_CURRENCY || 'GHS').trim().toUpperCase()
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  const secret = getPaystackSecretKey()
  if (!secret) return null

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.status !== true || !result?.data) return null
  return result.data as PaystackTransaction
}

export function transactionMatchesOrder(transaction: PaystackTransaction, reference: string, order: {
  id: string
  totalAmount: unknown
  customerEmail: string
}) {
  const expectedAmount = Math.round(Number(order.totalAmount) * 100)
  const transactionEmail = String(transaction.customer?.email || transaction.email || '').trim().toLowerCase()

  return transaction.reference === reference &&
    transaction.metadata?.orderId === order.id &&
    Number(transaction.amount) === expectedAmount &&
    String(transaction.currency || '').toUpperCase() === getPaystackCurrency() &&
    transactionEmail === order.customerEmail.trim().toLowerCase()
}

export async function recordVerifiedPayment(reference: string, orderId: string, transaction: PaystackTransaction) {
  if (transaction.status !== 'success' || transaction.id == null) return false

  const parsedPaidAt = transaction.paid_at ? new Date(transaction.paid_at) : new Date()
  const paidAt = Number.isNaN(parsedPaidAt.getTime()) ? new Date() : parsedPaidAt
  const paymentDetails = {
    paystackTransactionId: String(transaction.id),
    paymentChannel: transaction.channel || null,
    paymentCurrency: String(transaction.currency || '').toUpperCase(),
    paidAt,
  }

  const updated = await prisma.order.updateMany({
    where: { id: orderId, paystackReference: reference, status: { in: ['PENDING', 'CONFIRMED'] } },
    data: { status: 'CONFIRMED', ...paymentDetails },
  })
  if (!updated.count) return false

  try {
    await syncOrderPaymentToSupabase(orderId, paymentDetails)
  } catch (error) {
    console.warn('Supabase payment sync skipped:', error)
  }
  return true
}