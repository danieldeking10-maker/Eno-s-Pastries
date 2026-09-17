import { NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct } from '@/lib/supabase-service';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

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
    
    return NextResponse.json(product, {
      headers: NO_CACHE_HEADERS,
    });
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
    const body = await request.json().catch(() => ({}));

    // Verify product existence first
    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await updateProduct(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    try {
      revalidatePath('/products');
      revalidatePath(`/products/${id}`);
      revalidatePath('/');
      revalidatePath('/admin/products');
    } catch {}

    return NextResponse.json(updated, {
      headers: NO_CACHE_HEADERS,
    });
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

    try {
      revalidatePath('/products');
      revalidatePath(`/products/${id}`);
      revalidatePath('/');
      revalidatePath('/admin/products');
    } catch {}

    return NextResponse.json({ message: 'Product deleted permanently' }, {
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete product',
    }, { status: 500 });
  }
}
