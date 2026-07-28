import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany();
    const formatted = products.map((p) => {
      let ingredients: string[] = []
      try {
        ingredients = typeof p.ingredients === 'string' ? JSON.parse(p.ingredients) : []
      } catch {
        ingredients = p.ingredients ? String(p.ingredients).split(',').map((s) => s.trim()) : []
      }
      return {
        ...p,
        price: Number(p.price),
        ingredients,
      }
    })
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawIng = body.ingredients
    const ingredientsStr = Array.isArray(rawIng)
      ? JSON.stringify(rawIng)
      : typeof rawIng === 'string'
      ? JSON.stringify(rawIng.split(',').map((i: string) => i.trim()).filter(Boolean))
      : '[]'

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        imageUrl: body.imageUrl,
        category: body.category,
        ingredients: ingredientsStr,
        available: body.available ?? true,
      },
    });

    let ingredients: string[] = []
    try {
      ingredients = JSON.parse(product.ingredients)
    } catch {
      ingredients = []
    }

    return NextResponse.json({ ...product, price: Number(product.price), ingredients }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
