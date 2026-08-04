import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_PRODUCTS = [
  {
    name: "Meat Pie (Corned Beef Filling)",
    description: "Delicious meat pie with corned beef filling",
    price: 5.00,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20corned%20beef%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
    category: "Pastry",
    ingredients: JSON.stringify(["Flour", "Corned Beef", "Onions", "Spices"]),
    available: true
  },
  {
    name: "Meat Pie (Egg Filling)",
    description: "Savory meat pie with egg filling",
    price: 4.50,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=savory%20egg%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
    category: "Pastry",
    ingredients: JSON.stringify(["Flour", "Eggs", "Onions", "Spices"]),
    available: true
  },
  {
    name: "Meat Pie (Vegetable Filling)",
    description: "Healthy vegetable-filled meat pie",
    price: 4.00,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=healthy%20vegetable%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd",
    category: "Pastry",
    ingredients: JSON.stringify(["Flour", "Carrots", "Peas", "Onions", "Spices"]),
    available: true
  },
  {
    name: "Meat Pie (Corned Beef & Sausage Filling)",
    description: "Hearty meat pie with corned beef and sausage",
    price: 5.50,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=hearty%20corned%20beef%20and%20sausage%20meat%20pie&image_size=square_hd",
    category: "Pastry",
    ingredients: JSON.stringify(["Flour", "Corned Beef", "Sausage", "Onions", "Spices"]),
    available: true
  },
  {
    name: "Rock Buns",
    description: "Crunchy and delicious rock buns",
    price: 3.00,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crunchy%20rock%20buns%20on%20a%20white%20plate&image_size=square_hd",
    category: "Pastry",
    ingredients: JSON.stringify(["Flour", "Sugar", "Butter", "Milk"]),
    available: true
  },
  {
    name: "Cocoa Drink",
    description: "Rich and creamy cocoa drink",
    price: 2.50,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=rich%20creamy%20cocoa%20drink%20in%20a%20glass&image_size=square_hd",
    category: "Drink",
    ingredients: JSON.stringify(["Cocoa Powder", "Milk", "Sugar"]),
    available: true
  },
  {
    name: "Vanilla Yoghurt",
    description: "Smooth vanilla yoghurt",
    price: 3.00,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=smooth%20vanilla%20yoghurt%20in%20a%20bowl&image_size=square_hd",
    category: "Drink",
    ingredients: JSON.stringify(["Yoghurt", "Vanilla Extract", "Sugar"]),
    available: true
  },
  {
    name: "Strawberry Yoghurt",
    description: "Delicious strawberry yoghurt",
    price: 3.00,
    imageUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20strawberry%20yoghurt%20in%20a%20bowl&image_size=square_hd",
    category: "Drink",
    ingredients: JSON.stringify(["Yoghurt", "Strawberries", "Sugar"]),
    available: true
  }
];

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
    
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const rawIng = body.ingredients;
    const ingredientsStr = Array.isArray(rawIng)
      ? JSON.stringify(rawIng)
      : typeof rawIng === 'string'
      ? JSON.stringify(rawIng.split(',').map((i: string) => i.trim()).filter(Boolean))
      : '[]';

    const numPrice = Number(body.price);
    const finalPrice = isNaN(numPrice) ? 0 : numPrice;

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

    let ingredients: string[] = [];
    try {
      ingredients = JSON.parse(product.ingredients);
    } catch {
      ingredients = [];
    }

    return NextResponse.json({ ...product, price: Number(product.price), ingredients }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create product' }, { status: 500 });
  }
}
