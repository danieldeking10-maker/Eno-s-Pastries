import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { saveOrderToSupabase } from '@/lib/supabase-service'

function ghp(amount: number) {
  // Paystack expects amount in minor units (kobo/pesewas)
  return Math.round(amount * 100)
}

export async function POST(request: Request) {
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
      totalAmount,
      items,
    } = reqBody

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Resolve product IDs to ensure foreign key integrity
    const itemsToCreate = []
    const allProducts = await prisma.product.findMany()

    for (const item of items) {
      let pid = item.productId || item.id
      let matched = allProducts.find(p => p.id === pid)
      if (!matched && item.name) {
        matched = allProducts.find(p => p.name.toLowerCase() === String(item.name).toLowerCase())
      }
      if (!matched && allProducts.length > 0) {
        matched = allProducts[0]
      }

      if (matched) {
        itemsToCreate.push({
          productId: matched.id,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || Number(matched.price) || 0,
        })
      }
    }

    if (itemsToCreate.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        totalAmount: Number(totalAmount) || 0,
        status: 'PENDING',
        orderType: orderType ?? 'RETAIL',
        deliveryType: deliveryType ?? 'PICKUP',
        deliveryAddress: deliveryAddress ?? null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        customerName: customerName || 'Valued Customer',
        customerEmail,
        customerPhone: customerPhone || '',
        customerNote: customerNote || null,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    })

    // Mirror to Supabase if table is ready
    try {
      await saveOrderToSupabase(order, itemsToCreate)
    } catch (e) {
      console.warn('Supabase sync skipped:', e)
    }

    const reference = `order_${order.id}_${crypto.randomBytes(4).toString('hex')}`

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paystackReference: reference,
      },
    })

    const rawKey = process.env.PAYSTACK_SECRET_KEY || ''
    const PAYSTACK_SECRET_KEY = rawKey.replace(/['"\r\n\s]/g, '').trim()
    const origin = new URL(request.url).origin

    // If key is missing, process order in demo mode
    if (!PAYSTACK_SECRET_KEY) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
      })
      return NextResponse.json({
        authorizationUrl: `${origin}/dashboard?payment=success&demo=true&ref=${reference}`,
        reference,
        orderId: order.id,
        isDemo: true,
      })
    }

    const amountKobo = ghp(Number(totalAmount))

    const body: Record<string, any> = {
      email: customerEmail,
      amount: amountKobo,
      reference,
      metadata: {
        orderId: order.id,
        customerName,
        customerPhone,
      },
      callback_url: `${origin}/api/paystack/callback`,
    }

    if (process.env.PAYSTACK_CURRENCY?.trim()) {
      body.currency = process.env.PAYSTACK_CURRENCY.trim()
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.status) {
      const paystackErrMsg = data?.message || 'Failed to initialize Paystack transaction'
      const isInvalidKey = paystackErrMsg.toLowerCase().includes('invalid key') || res.status === 401 || res.status === 403

      if (isInvalidKey) {
        // Automatically place order in demo mode if Paystack secret key is invalid or unauthorized
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        })

        return NextResponse.json({
          authorizationUrl: `${origin}/dashboard?payment=success&demo=true&ref=${reference}`,
          reference,
          orderId: order.id,
          isDemo: true,
        })
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })

      return NextResponse.json(
        { error: paystackErrMsg },
        { status: 400 }
      )
    }

    const authorizationUrl = data?.data?.authorization_url
    return NextResponse.json({
      authorizationUrl,
      reference,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('Paystack initialize error:', error)
    return NextResponse.json({ error: error?.message || 'Paystack initialize failed' }, { status: 500 })
  }
}
