import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/lib/supabase-service';

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

    const rawIng = body.ingredients;
    const ingredientsArray: string[] = Array.isArray(rawIng)
      ? rawIng
      : typeof rawIng === 'string'
      ? rawIng.split(',').map((i: string) => i.trim()).filter(Boolean)
      : [];
    const ingredientsStr = JSON.stringify(ingredientsArray);

    const numPrice = Number(body.price);
    const finalPrice = isNaN(numPrice) ? 0 : numPrice;

    // Create in Prisma
    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        description: body.description ? String(body.description) : '',
        price: finalPrice,
        imageUrl: body.imageUrl ? String(body.imageUrl) : '',
        category: body.category ? String(body.category) : 'Pastry',
        ingredients: ingredientsStr,
        available: body.available ?? true,
      },
    });

    // Mirror to Supabase if table exists
    try {
      await supabase.from('products').insert({
        id: product.id,
        name: product.name,
        description: product.description,
        price: finalPrice,
        imageUrl: product.imageUrl,
        category: product.category,
        ingredients: ingredientsArray,
        available: product.available,
      });
    } catch (e) {
      console.warn('Supabase product sync skipped/failed:', e);
    }

    return NextResponse.json({
      ...product,
      price: Number(product.price),
      ingredients: ingredientsArray,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product' }, { status: 500 });
  }
}

