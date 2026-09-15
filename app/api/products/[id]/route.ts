import { NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_URL_LENGTH = 2_000_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json(product);
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
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A product update payload is required' }, { status: 400 });
    }

    const updates = body as Record<string, unknown>;
    if (updates.imageUrl !== undefined && String(updates.imageUrl).length > MAX_IMAGE_URL_LENGTH) {
      return NextResponse.json({ error: 'Product image is too large. Please use a smaller image.' }, { status: 413 });
    }
    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
      }
    }

    // Verify product existence first
    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await updateProduct(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update product',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if product exists in either database
    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const success = await deleteProduct(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted permanently' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete product',
    }, { status: 500 });
  }
}
