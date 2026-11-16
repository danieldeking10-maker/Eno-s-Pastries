import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { getProducts, saveOrderToSupabase, DEFAULT_PRODUCTS } from '@/lib/supabase-service'
import { getPaystackCurrency, getPaystackSecretKey } from '@/lib/paystack-payment'
import { getAppOrigin } from '@/lib/paystack'
import { supabaseUrl } from '@/lib/supabase'

function ghp(amount: number) {
  return Math.round(amount * 100)
}

function normalizeLookupValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export async function POST(request: Request) {
  // Check database configuration early
  const dbUrl = (process.env.DATABASE_URL || '').trim()
  const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!supabaseUrl
  if (!isPostgres && !isSupabaseConfigured) {
    console.error('[Paystack Init] Neither DATABASE_URL (PostgreSQL) nor Supabase is configured')
    return NextResponse.json(
      { error: 'Database not configured. Please contact support.' },
      { status: 503 }
    )
  }

  try {
    const reqBody = await request.json().catch(() => ({}))
    const {
      customerName,
      customerEmail,
      customerPhone,
      orderType,
      deliveryType,
      deliveryAddress,
      deliveryDate,
      customerNote,
      items,
    } = reqBody

    if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid customer email address is required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const itemsToCreate: Array<{ productId: string; quantity: number; price: number }> = []
    const localProducts = await prisma.product.findMany().catch(() => [])
    const remoteProducts = await getProducts(true).catch(() => [])

    for (const item of items) {
      const rawProductId = item?.productId ?? item?.id ?? item?.product?.id ?? null
      const rawName = typeof item?.name === 'string' && item.name.trim()
        ? item.name.trim()
        : typeof item?.product?.name === 'string' && item.product.name.trim()
          ? item.product.name.trim()
          : ''

      let matched: any = null
      const normalizedProductId = normalizeLookupValue(rawProductId)

      if (normalizedProductId) {
        matched = remoteProducts.find(p => normalizeLookupValue(p.id) === normalizedProductId) ||
          localProducts.find(p => normalizeLookupValue(p.id) === normalizedProductId)
      }

      if (!matched && rawName) {
        const normalizedName = normalizeLookupValue(rawName)
        matched = remoteProducts.find(p => normalizeLookupValue(p.name) === normalizedName) ||
          localProducts.find(p => normalizeLookupValue(p.name) === normalizedName)
      }

      // Check default fallback products
      if (!matched) {
        matched = DEFAULT_PRODUCTS.find(
          p => (normalizedProductId && normalizeLookupValue(p.id) === normalizedProductId) ||
               (rawName && normalizeLookupValue(p.name) === normalizeLookupValue(rawName))
        )
      }

      // If still not matched, synthesize product from cart item so checkout is never blocked
      if (!matched && (rawName || rawProductId)) {
        const itemPrice = Number(item?.price) || 0
        const synthId = (normalizedProductId && /^[0-9a-fA-F-]{36}$/.test(String(rawProductId)))
          ? String(rawProductId)
          : crypto.randomUUID()
        matched = {
          id: synthId,
          name: rawName || 'Bakery Item',
          price: itemPrice,
          available: true,
          category: item?.category || 'Pastry',
          description: '',
          imageUrl: item?.imageUrl || '',
          ingredients: [],
        }
      }

      if (!matched) {
        return NextResponse.json({
          error: `Product "${rawName || rawProductId || 'Unknown'}" could not be found. Please refresh the products page and try again.`,
        }, { status: 400 })
      }

      if (matched.available === false) {
        return NextResponse.json({
          error: `Product "${matched.name}" is currently out of stock.`,
        }, { status: 409 })
      }

      const quantity = Number(item?.quantity ?? item?.qty ?? 1)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return NextResponse.json({ error: 'Each product quantity must be a whole number from 1 to 100' }, { status: 400 })
      }

      const productId = String(matched.id)
      const price = Number(matched.price) || Number(item?.price) || 0

      if (!localProducts.some((product) => product.id === productId)) {
        await prisma.product.upsert({
          where: { id: productId },
          update: {
            name: matched.name,
            description: matched.description || '',
            price,
            imageUrl: matched.imageUrl || '',
            category: matched.category || 'Pastry',
            ingredients: JSON.stringify(matched.ingredients || []),
            available: matched.available !== false,
          },
          create: {
            id: productId,
            name: matched.name,
            description: matched.description || '',
            price,
            imageUrl: matched.imageUrl || '',
            category: matched.category || 'Pastry',
            ingredients: JSON.stringify(matched.ingredients || []),
            available: matched.available !== false,
          },
        }).catch(() => {})
      }

      itemsToCreate.push({
        productId,
        quantity,
        price,
      })
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 })
    }

    const calculatedTotal = itemsToCreate.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (calculatedTotal <= 0) {
      return NextResponse.json({ error: 'Order total must be greater than zero' }, { status: 400 })
    }

    const fallbackOrderId = crypto.randomUUID()
    // IMPORTANT: Paystack only permits [a-zA-Z0-9-.] in custom references. NEVER use underscores '_'
    const randomHex = crypto.randomBytes(4).toString('hex')
    const reference = `order-${fallbackOrderId}-${randomHex}`

    let order: any = null
    try {
      order = await prisma.order.create({
        data: {
          id: fallbackOrderId,
          totalAmount: calculatedTotal,
          status: 'PENDING',
          orderType: orderType ?? 'RETAIL',
          deliveryType: deliveryType ?? 'PICKUP',
          deliveryAddress: deliveryAddress ?? null,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          customerName: customerName || 'Valued Customer',
          customerEmail,
          customerPhone: customerPhone || '',
          customerNote: customerNote || null,
          paystackReference: reference,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: true },
      })
    } catch (createErr) {
      console.warn('[Paystack Init] Prisma create notice, trying flat order:', createErr)
      try {
        order = await prisma.order.create({
          data: {
            id: fallbackOrderId,
            totalAmount: calculatedTotal,
            status: 'PENDING',
            orderType: orderType ?? 'RETAIL',
            deliveryType: deliveryType ?? 'PICKUP',
            deliveryAddress: deliveryAddress ?? null,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            customerName: customerName || 'Valued Customer',
            customerEmail,
            customerPhone: customerPhone || '',
            customerNote: customerNote || null,
            paystackReference: reference,
          },
        })
      } catch (flatErr) {
        console.warn('[Paystack Init] Prisma flat order notice, using Supabase direct:', flatErr)
      }
    }

    const orderWithReference = order || {
      id: fallbackOrderId,
      totalAmount: calculatedTotal,
      status: 'PENDING',
      orderType: orderType ?? 'RETAIL',
      deliveryType: deliveryType ?? 'PICKUP',
      deliveryAddress: deliveryAddress ?? null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      customerName: customerName || 'Valued Customer',
      customerEmail,
      customerPhone: customerPhone || '',
      customerNote: customerNote || null,
      paystackReference: reference,
      createdAt: new Date(),
      items: itemsToCreate,
    }

    try {
      await saveOrderToSupabase(orderWithReference, itemsToCreate)
    } catch (e) {
      console.warn('Supabase sync skipped:', e)
    }

    const PAYSTACK_SECRET_KEY = getPaystackSecretKey()
    const origin = getAppOrigin(request)

    // Demo mode fallback helper for environments with invalid or unconfigured Paystack keys
    const handleDemoFallback = async (reason?: string) => {
      console.log(`[Paystack Init] Demo mode fallback triggered (${reason || 'no key'})`)
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        }).catch(() => {})
      }
      return NextResponse.json({
        authorizationUrl: `${origin}/dashboard?payment=success&demo=true&ref=${reference}`,
        reference,
        orderId: order?.id || fallbackOrderId,
        isDemo: true,
      })
    }

    if (!PAYSTACK_SECRET_KEY) {
      return await handleDemoFallback('Missing PAYSTACK_SECRET_KEY')
    }

    const amountPesewas = ghp(calculatedTotal)

    const body: Record<string, any> = {
      email: customerEmail,
      amount: amountPesewas,
      reference,
      metadata: {
        orderId: order?.id || fallbackOrderId,
        customerName,
        customerPhone,
      },
      callback_url: `${origin}/api/paystack/callback`,
    }

    const currency = getPaystackCurrency()
    if (currency) {
      body.currency = currency
    }

    let res: Response | null = null
    let data: any = null

    try {
      res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      })
      data = await res.json().catch(() => ({}))
    } catch (fetchErr: any) {
      console.warn('[Paystack Init] Fetch to Paystack failed:', fetchErr?.message || fetchErr)
    }

    // Currency mismatch retry: if Paystack integration does not support the explicit currency, retry without it
    if (res && !res.ok && typeof data?.message === 'string' && data.message.toLowerCase().includes('currency')) {
      try {
        const bodyWithoutCurrency = { ...body }
        delete bodyWithoutCurrency.currency
        const retryRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyWithoutCurrency),
          signal: AbortSignal.timeout(15000),
        })
        const retryData = await retryRes.json().catch(() => ({}))
        if (retryRes.ok && retryData?.status === true) {
          res = retryRes
          data = retryData
        }
      } catch {}
    }

    // Handle network unreachable / offline
    if (!res) {
      if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_PAYMENT === 'true') {
        return await handleDemoFallback('Paystack network unreachable')
      }
      return NextResponse.json(
        { error: 'Unable to reach Paystack payment gateway. Please check your internet connection and try again.' },
        { status: 502 }
      )
    }

    const paystackErrMsg = data?.message || 'Failed to initialize Paystack transaction'
    const isInvalidKey =
      paystackErrMsg.toLowerCase().includes('invalid key') ||
      paystackErrMsg.toLowerCase().includes('not authorized') ||
      paystackErrMsg.toLowerCase().includes('unauthorized') ||
      paystackErrMsg.toLowerCase().includes('authentication failed') ||
      res.status === 401 ||
      res.status === 403

    if (isInvalidKey) {
      return await handleDemoFallback(`Paystack API key unauthorized: ${paystackErrMsg}`)
    }

    if (!res.ok || data?.status !== true) {
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        }).catch(() => {})
      }

      return NextResponse.json(
        { error: paystackErrMsg },
        { status: 400 }
      )
    }

    const authorizationUrl = data?.data?.authorization_url
    if (typeof authorizationUrl !== 'string' || !authorizationUrl) {
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        }).catch(() => {})
      }
      return NextResponse.json(
        { error: 'Paystack did not return a valid payment link. Please try again.' },
        { status: 502 }
      )
    }

    const finalReference = (typeof data?.data?.reference === 'string' && data.data.reference.trim())
      ? data.data.reference.trim()
      : reference

    if (finalReference !== reference && order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paystackReference: finalReference },
      }).catch(() => {})
    }

    return NextResponse.json({
      authorizationUrl,
      reference: finalReference,
      orderId: order?.id || fallbackOrderId,
    })
  } catch (error: any) {
    console.error('Paystack initialize failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
