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
    const order = await prisma.order.create({
      data: {
        totalAmount: body.totalAmount,
        status: body.status ?? 'PENDING',
        orderType: body.orderType ?? 'RETAIL',
        deliveryType: body.deliveryType ?? 'PICKUP',
        deliveryAddress: body.deliveryAddress,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
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
