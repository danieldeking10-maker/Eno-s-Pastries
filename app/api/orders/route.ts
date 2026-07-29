import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim()
    const phone = searchParams.get('phone')?.trim()
    const query = searchParams.get('query')?.trim() || searchParams.get('search')?.trim()

    let where: any = undefined

    if (email && phone) {
      where = {
        OR: [
          { customerEmail: { contains: email } },
          { customerPhone: { contains: phone } },
        ],
      }
    } else if (email) {
      where = {
        customerEmail: { contains: email },
      }
    } else if (phone) {
      where = {
        customerPhone: { contains: phone },
      }
    } else if (query) {
      where = {
        OR: [
          { customerEmail: { contains: query } },
          { customerPhone: { contains: query } },
          { customerName: { contains: query } },
          { id: { contains: query } },
        ],
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'Order must include at least one item' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        totalAmount: Number(body.totalAmount) || 0,
        status: body.status ?? 'PENDING',
        orderType: body.orderType ?? 'RETAIL',
        deliveryType: body.deliveryType ?? 'PICKUP',
        deliveryAddress: body.deliveryAddress,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        customerNote: body.customerNote || null,
        items: {
          create: rawItems.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
