import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { getProducts, saveOrderToSupabase } from '@/lib/supabase-service'
import { getPaystackCurrency, getPaystackSecretKey } from '@/lib/paystack-payment'

function ghp(amount: number) {
  return Math.round(amount * 100)
}

function normalizeLookupValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
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

    const itemsToCreate = []
    const localProducts = await prisma.product.findMany()
    const remoteProducts = await getProducts(true)

    for (const item of items) {
      const rawProductId = item?.productId ?? item?.id ?? item?.product?.id ?? null
      const rawName = typeof item?.name === 'string' && item.name.trim()
        ? item.name
        : typeof item?.product?.name === 'string' && item.product.name.trim()
          ? item.product.name
          : ''

      let matched = null
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

      const productId = matched.id
      const price = Number(matched.price) || 0

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
            available: !!matched.available,
          },
          create: {
            id: productId,
            name: matched.name,
            description: matched.description || '',
            price,
            imageUrl: matched.imageUrl || '',
            category: matched.category || 'Pastry',
            ingredients: JSON.stringify(matched.ingredients || []),
            available: !!matched.available,
          },
        })
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

    const order = await prisma.order.create({
      data: {
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
        paystackReference: `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    })

    const reference = `order_${order.id}_${crypto.randomBytes(4).toString('hex')}`
    const orderWithReference = await prisma.order.update({
      where: { id: order.id },
      data: { paystackReference: reference },
      include: { items: true },
    })

    try {
      await saveOrderToSupabase(orderWithReference, itemsToCreate)
    } catch (e) {
      console.warn('Supabase sync skipped:', e)
    }

    const PAYSTACK_SECRET_KEY = getPaystackSecretKey()
    const origin = new URL(request.url).origin

    if (!PAYSTACK_SECRET_KEY) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.json(
        { error: 'Payments are temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    const amountPesewas = ghp(calculatedTotal)

    const body: Record<string, any> = {
      email: customerEmail,
      amount: amountPesewas,
      reference,
      metadata: {
        orderId: order.id,
        customerName,
        customerPhone,
      },
      callback_url: `${origin}/api/paystack/callback`,
    }

    body.currency = getPaystackCurrency()

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.status !== true || data?.data?.reference !== reference) {
      const paystackErrMsg = data?.message || 'Failed to initialize Paystack transaction'
      const isInvalidKey = paystackErrMsg.toLowerCase().includes('invalid key') || res.status === 401 || res.status === 403

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })

      return NextResponse.json(
        { error: isInvalidKey ? 'Payment configuration is invalid. Please contact support.' : paystackErrMsg },
        { status: isInvalidKey ? 502 : 400 }
      )
    }

    const authorizationUrl = data?.data?.authorization_url
    if (typeof authorizationUrl !== 'string' || !authorizationUrl) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.json(
        { error: 'Paystack did not return a payment link. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      authorizationUrl,
      reference,
      orderId: order.id,
    })
  } catch (error) {
    console.error('Paystack initialize failed:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}
    }

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
