import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_URL_LENGTH = 2_000_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProductPayload(body: unknown) {
  if (!isObject(body)) {
    return 'A product payload is required';
  }

  if (body.imageUrl !== undefined && String(body.imageUrl).length > MAX_IMAGE_URL_LENGTH) {
    return 'Product image is too large. Please use a smaller image.';
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return 'Price must be a valid non-negative number';
    }
  }

  return null;
}

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const validationError = validateProductPayload(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const product = body as Record<string, unknown>;
    
    if (typeof product.name !== 'string' || !product.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const created = await createProduct({
      name: product.name.trim(),
      description: product.description ? String(product.description) : '',
      price: Number(product.price) || 0,
      imageUrl: product.imageUrl ? String(product.imageUrl) : '',
      category: product.category ? String(product.category) : 'Pastry',
      ingredients: product.ingredients as string[] | string | undefined,
      available: product.available !== false,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product' }, { status: 500 });
  }
}

