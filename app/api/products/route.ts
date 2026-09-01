import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

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
    const body = await request.json().catch(() => ({}));
    
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const created = await createProduct({
      name: body.name.trim(),
      description: body.description ? String(body.description) : '',
      price: Number(body.price) || 0,
      imageUrl: body.imageUrl ? String(body.imageUrl) : '',
      category: body.category ? String(body.category) : 'Pastry',
      ingredients: body.ingredients,
      available: body.available ?? true,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product' }, { status: 500 });
  }
}

