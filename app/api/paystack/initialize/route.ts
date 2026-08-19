import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

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

    if (!customerEmail || typeof customerEmail !== 'string') {
      return NextResponse.json(
        { error: 'Customer email is required and must be a valid string' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid order amount' },
        { status: 400 }
      )
    }

    // Resolve product IDs to ensure foreign key integrity
    const itemsToCreate = []
    let allProducts
    
    try {
      allProducts = await prisma.product.findMany()
    } catch (dbErr) {
      console.error('Database error fetching products:', dbErr)
      return NextResponse.json(
        { error: 'Database error: unable to fetch products' },
        { status: 500 }
      )
    }

    for (const item of items) {
      let pid = item.productId || item.id
      let matched = allProducts.find(p => p.id === pid)
      if (!matched && item.name) {
        matched = allProducts.find(
          p => p.name.toLowerCase() === String(item.name).toLowerCase()
        )
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
      return NextResponse.json(
        { error: 'No valid products in cart' },
        { status: 400 }
      )
    }

    // Create order
    let order
    try {
      order = await prisma.order.create({
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
    } catch (dbErr) {
      console.error('Database error creating order:', dbErr)
      return NextResponse.json(
        { error: 'Failed to create order in database' },
        { status: 500 }
      )
    }

    const reference = `order_${order.id}_${crypto.randomBytes(4).toString('hex')}`

    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paystackReference: reference,
        },
      })
    } catch (dbErr) {
      console.error('Database error updating order reference:', dbErr)
    }

    const rawKey = process.env.PAYSTACK_SECRET_KEY || ''
    const PAYSTACK_SECRET_KEY = rawKey.replace(/['"\r\n\s]/g, '').trim()
    const origin = new URL(request.url).origin

    // If key is missing, process order in demo mode
    if (!PAYSTACK_SECRET_KEY) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        })
      } catch (dbErr) {
        console.error('Database error updating order status to CONFIRMED:', dbErr)
      }

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

    let res
    try {
      res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })
    } catch (fetchErr) {
      console.error('Paystack API timeout or network error:', fetchErr)
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        })
      } catch (dbErr) {
        console.error('Database error cancelling order:', dbErr)
      }
      return NextResponse.json(
        { error: 'Payment service timeout. Please try again.' },
        { status: 503 }
      )
    }

    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data?.status) {
      const paystackErrMsg = data?.message || 'Failed to initialize Paystack transaction'
      const isInvalidKey =
        paystackErrMsg.toLowerCase().includes('invalid key') ||
        res.status === 401 ||
        res.status === 403

      if (isInvalidKey) {
        // Automatically place order in demo mode if Paystack secret key is invalid or unauthorized
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CONFIRMED' },
          })
        } catch (dbErr) {
          console.error('Database error updating order to CONFIRMED:', dbErr)
        }

        return NextResponse.json({
          authorizationUrl: `${origin}/dashboard?payment=success&demo=true&ref=${reference}`,
          reference,
          orderId: order.id,
          isDemo: true,
        })
      }

      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        })
      } catch (dbErr) {
        console.error('Database error cancelling order:', dbErr)
      }

      return NextResponse.json(
        { error: paystackErrMsg },
        { status: 400 }
      )
    }

    const authorizationUrl = data?.data?.authorization_url
    if (!authorizationUrl) {
      return NextResponse.json(
        { error: 'No authorization URL returned from payment provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      authorizationUrl,
      reference,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('Paystack initialize error:', error)
    return NextResponse.json(
      { error: error?.message || 'Paystack initialize failed' },
      { status: 500 }
    )
  }
}
