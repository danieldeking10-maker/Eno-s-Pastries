import prisma from '@/lib/prisma'
import { syncOrderPaymentToSupabase } from '@/lib/supabase-service'
import fs from 'fs'
import path from 'path'

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

const DEFAULT_PAYSTACK_SECRET = 'sk_live_24e715011deb0c6722f566feacabf6ad7099aadb'

function readEnvKey(key: string): string {
  if (typeof window !== 'undefined') return ''
  try {
    for (const filename of ['.env', '.env.local', '.env.example']) {
      const envPath = path.resolve(process.cwd(), filename)
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith(key + '=')) {
            const val = trimmed.substring(key.length + 1).replace(/['"\r]/g, '').trim()
            if (val) return val
          }
        }
      }
    }
  } catch {}
  return ''
}

export function getPaystackSecretKey(): string {
  let secret = (process.env.PAYSTACK_SECRET_KEY || '').replace(/[\s'"\r\n]/g, '')
  if (!secret || !/^sk_(live|test)_[A-Za-z0-9]+$/.test(secret)) {
    secret = readEnvKey('PAYSTACK_SECRET_KEY').replace(/[\s'"\r\n]/g, '')
  }
  if (!secret || !/^sk_(live|test)_[A-Za-z0-9]+$/.test(secret)) {
    secret = DEFAULT_PAYSTACK_SECRET
  }
  return /^sk_(live|test)_[A-Za-z0-9]+$/.test(secret) ? secret : ''
}

export function getPaystackCurrency(): string {
  const envCurr = (process.env.PAYSTACK_CURRENCY || readEnvKey('PAYSTACK_CURRENCY') || 'GHS').trim().toUpperCase()
  return envCurr || 'GHS'
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  const secret = getPaystackSecretKey()
  if (!secret) return null

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.status !== true || !result?.data) return null
    return result.data as PaystackTransaction
  } catch (err) {
    console.warn('[Paystack Verify Notice]:', err)
    return null
  }
}

export function transactionMatchesOrder(transaction: PaystackTransaction, reference: string, order: {
  id: string
  totalAmount: unknown
  customerEmail: string
}) {
  if (!transaction || !order || transaction.reference !== reference) return false
  const expectedAmount = Math.round(Number(order.totalAmount) * 100)
  const transactionAmount = Number(transaction.amount)
  const amountMatches = !Number.isNaN(transactionAmount) && Math.abs(transactionAmount - expectedAmount) <= 1

  const transactionEmail = String(transaction.customer?.email || transaction.email || '').trim().toLowerCase()
  const orderEmail = String(order.customerEmail || '').trim().toLowerCase()
  const emailMatches = !transactionEmail || !orderEmail || transactionEmail === orderEmail

  const orderIdInMeta = transaction.metadata?.orderId
  const orderIdMatches = !orderIdInMeta || String(orderIdInMeta) === String(order.id)

  return amountMatches && emailMatches && orderIdMatches
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

  let prismaUpdated = false
  try {
    const updated = await prisma.order.updateMany({
      where: { id: orderId, paystackReference: reference, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CONFIRMED', ...paymentDetails },
    })
    prismaUpdated = updated.count > 0
  } catch (dbErr) {
    console.warn('[Paystack Payment] Prisma update note:', dbErr)
  }

  try {
    await syncOrderPaymentToSupabase(orderId, paymentDetails)
  } catch (error) {
    console.warn('Supabase payment sync skipped:', error)
  }

  // Trigger customer payment receipt & admin notification via Resend
  try {
    const { sendPaymentReceiptEmail, sendAdminOrderNotification } = await import('@/lib/email')
    let fullOrder: any = null
    try {
      fullOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      })
    } catch {}

    if (!fullOrder) {
      const { getOrderByIdFromSupabase } = await import('@/lib/supabase-service')
      fullOrder = await getOrderByIdFromSupabase(orderId)
    }

    if (fullOrder) {
      fullOrder.paidAt = paidAt
      sendPaymentReceiptEmail(fullOrder, transaction).catch((err) =>
        console.warn('[Resend] Payment receipt email failed:', err)
      )
      sendAdminOrderNotification(fullOrder).catch((err) =>
        console.warn('[Resend] Admin payment alert failed:', err)
      )
    }
  } catch (emailErr) {
    console.warn('[Resend] Payment notification dispatch error:', emailErr)
  }

  return prismaUpdated
}