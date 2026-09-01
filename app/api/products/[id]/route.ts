import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    let ingredients: string[] = []
    try {
      ingredients = typeof product.ingredients === 'string' ? JSON.parse(product.ingredients) : []
    } catch {
      ingredients = []
    }
    return NextResponse.json({ ...product, price: Number(product.price), ingredients });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const dataToUpdate: any = { ...body };

    // Remove non-updatable fields that cause Prisma update errors
    delete dataToUpdate.id;
    delete dataToUpdate.createdAt;
    delete dataToUpdate.updatedAt;
    delete dataToUpdate.orderItems;

    if (dataToUpdate.price !== undefined) {
      const numPrice = Number(dataToUpdate.price);
      dataToUpdate.price = isNaN(numPrice) ? 0 : numPrice;
    }

    if (dataToUpdate.ingredients !== undefined) {
      const rawIng = dataToUpdate.ingredients;
      dataToUpdate.ingredients = Array.isArray(rawIng)
        ? JSON.stringify(rawIng)
        : typeof rawIng === 'string'
        ? JSON.stringify(rawIng.split(',').map((i: string) => i.trim()).filter(Boolean))
        : '[]';
    }

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });
    let ingredients: string[] = []
    try {
      ingredients = JSON.parse(product.ingredients)
    } catch {
      ingredients = []
    }

    // Mirror update to Supabase
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('products').update({
        name: product.name,
        description: product.description,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        category: product.category,
        ingredients,
        available: product.available,
      }).eq('id', id);
    } catch (e) {
      console.warn('Supabase product update error:', e);
    }

    return NextResponse.json({ ...product, price: Number(product.price), ingredients });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete associated order items first to maintain DB integrity upon product removal
    await prisma.orderItem.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    // Mirror delete to Supabase
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('products').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase product delete error:', e);
    }

    return NextResponse.json({ message: 'Product deleted permanently' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete product',
    }, { status: 500 });
  }
}
