import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    let order
    try {
      order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      })
    } catch (dbErr) {
      console.error('Database error fetching order:', dbErr)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order by ID:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const status = body?.status
    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid status' },
        { status: 400 }
      )
    }

    // Prisma enum values are: PENDING, CONFIRMED, PREPARING, READY, DELIVERED, CANCELLED
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    let updated
    try {
      updated = await prisma.order.update({
        where: { id },
        data: { status },
        include: { items: { include: { product: true } } },
      })
    } catch (dbErr: any) {
      console.error('Database error updating order status:', dbErr)
      if (dbErr.code === 'P2025') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
