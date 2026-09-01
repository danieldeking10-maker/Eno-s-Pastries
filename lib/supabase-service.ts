import { supabase } from './supabase'
import prisma from './prisma'

export interface ProductRecord {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  category: string
  ingredients: string[]
  available: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
}

export const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: '462cd743-4881-4285-a334-cc615c57cae3',
    name: 'Meat Pie (Corned Beef Filling)',
    description: 'Delicious meat pie with corned beef filling',
    price: 5.00,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20corned%20beef%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    category: 'Pastry',
    ingredients: ['Flour', 'Corned Beef', 'Onions', 'Spices'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae4',
    name: 'Meat Pie (Egg Filling)',
    description: 'Savory meat pie with egg filling',
    price: 4.50,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=savory%20egg%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    category: 'Pastry',
    ingredients: ['Flour', 'Eggs', 'Onions', 'Spices'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae5',
    name: 'Meat Pie (Vegetable Filling)',
    description: 'Healthy vegetable-filled meat pie',
    price: 4.00,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=healthy%20vegetable%20meat%20pie%20on%20a%20white%20plate&image_size=square_hd',
    category: 'Pastry',
    ingredients: ['Flour', 'Carrots', 'Peas', 'Onions', 'Spices'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae6',
    name: 'Meat Pie (Corned Beef & Sausage Filling)',
    description: 'Hearty meat pie with corned beef and sausage',
    price: 5.50,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=hearty%20corned%20beef%20and%20sausage%20meat%20pie&image_size=square_hd',
    category: 'Pastry',
    ingredients: ['Flour', 'Corned Beef', 'Sausage', 'Onions', 'Spices'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae7',
    name: 'Rock Buns',
    description: 'Crunchy and delicious rock buns',
    price: 3.00,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=crunchy%20rock%20buns%20on%20a%20white%20plate&image_size=square_hd',
    category: 'Pastry',
    ingredients: ['Flour', 'Sugar', 'Butter', 'Milk'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae8',
    name: 'Cocoa Drink',
    description: 'Rich and creamy cocoa drink',
    price: 2.50,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=rich%20creamy%20cocoa%20drink%20in%20a%20glass&image_size=square_hd',
    category: 'Drink',
    ingredients: ['Cocoa Powder', 'Milk', 'Sugar'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57cae9',
    name: 'Vanilla Yoghurt',
    description: 'Smooth vanilla yoghurt',
    price: 3.00,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=smooth%20vanilla%20yoghurt%20in%20a%20bowl&image_size=square_hd',
    category: 'Drink',
    ingredients: ['Yoghurt', 'Vanilla Extract', 'Sugar'],
    available: true,
  },
  {
    id: '462cd743-4881-4285-a334-cc615c57caea',
    name: 'Strawberry Yoghurt',
    description: 'Delicious strawberry yoghurt',
    price: 3.00,
    imageUrl: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=delicious%20strawberry%20yoghurt%20in%20a%20bowl&image_size=square_hd',
    category: 'Drink',
    ingredients: ['Yoghurt', 'Strawberries', 'Sugar'],
    available: true,
  },
]

function parseIngredients(rawIng: any): string[] {
  if (Array.isArray(rawIng)) return rawIng.map(String)
  if (typeof rawIng === 'string') {
    try {
      const parsed = JSON.parse(rawIng)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return rawIng.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function formatProduct(p: any): ProductRecord {
  const img = p.imageUrl || p.imageurl || null
  const cat = p.category || 'Pastry'
  const ingredients = parseIngredients(p.ingredients)

  return {
    id: String(p.id),
    name: String(p.name || ''),
    description: p.description ? String(p.description) : '',
    price: Number(p.price) || 0,
    imageUrl: img,
    category: cat,
    ingredients,
    available: p.available !== false,
    createdAt: p.createdAt || p.createdat || p.created_at || new Date().toISOString(),
    updatedAt: p.updatedAt || p.updatedat || p.updated_at || new Date().toISOString(),
  }
}

/**
 * Checks Supabase connection and whether tables exist.
 */
export async function checkSupabaseStatus() {
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1)
    if (error) {
      return { connected: true, tablesReady: false, message: error.message }
    }
    return { connected: true, tablesReady: true, message: 'Supabase connected and tables active' }
  } catch (err: any) {
    return { connected: false, tablesReady: false, message: err?.message || 'Connection error' }
  }
}

/**
 * Fetch all products: queries Supabase, synchronizes to local Prisma cache, and falls back if needed.
 */
export async function getProducts(): Promise<ProductRecord[]> {
  // 1. Try Supabase first
  try {
    const { data, error } = await supabase.from('products').select('*')

    if (!error && Array.isArray(data) && data.length > 0) {
      const formatted = data.map(formatProduct)
      formatted.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tA - tB
      })

      // Sync to Prisma in background
      Promise.allSettled(
        formatted.map((p) =>
          prisma.product.upsert({
            where: { id: p.id },
            update: {
              name: p.name,
              description: p.description || '',
              price: p.price,
              imageUrl: p.imageUrl || '',
              category: p.category,
              ingredients: JSON.stringify(p.ingredients),
              available: p.available,
            },
            create: {
              id: p.id,
              name: p.name,
              description: p.description || '',
              price: p.price,
              imageUrl: p.imageUrl || '',
              category: p.category,
              ingredients: JSON.stringify(p.ingredients),
              available: p.available,
            },
          })
        )
      ).catch(() => {})

      return formatted
    }
  } catch (err) {
    console.warn('Supabase products fetch failed:', err)
  }

  // 2. Try Prisma
  try {
    const prismaProducts = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (prismaProducts.length > 0) {
      return prismaProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        imageUrl: p.imageUrl,
        category: p.category,
        ingredients: parseIngredients(p.ingredients),
        available: p.available,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    }
  } catch (err) {
    console.warn('Prisma products query failed:', err)
  }

  // 3. Fallback to default catalog and seed Prisma
  try {
    for (const item of DEFAULT_PRODUCTS) {
      await prisma.product.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          description: item.description || '',
          price: item.price,
          imageUrl: item.imageUrl || '',
          category: item.category,
          ingredients: JSON.stringify(item.ingredients),
          available: item.available,
        },
        create: {
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          imageUrl: item.imageUrl || '',
          category: item.category,
          ingredients: JSON.stringify(item.ingredients),
          available: item.available,
        },
      })
    }
  } catch (e) {
    console.warn('Auto-seed error:', e)
  }

  return DEFAULT_PRODUCTS
}

/**
 * Fetch a single product by ID from Supabase or Prisma
 */
export async function getProductById(id: string): Promise<ProductRecord | null> {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!error && data) {
      const formatted = formatProduct(data)
      prisma.product.upsert({
        where: { id: formatted.id },
        update: {
          name: formatted.name,
          description: formatted.description || '',
          price: formatted.price,
          imageUrl: formatted.imageUrl || '',
          category: formatted.category,
          ingredients: JSON.stringify(formatted.ingredients),
          available: formatted.available,
        },
        create: {
          id: formatted.id,
          name: formatted.name,
          description: formatted.description || '',
          price: formatted.price,
          imageUrl: formatted.imageUrl || '',
          category: formatted.category,
          ingredients: JSON.stringify(formatted.ingredients),
          available: formatted.available,
        },
      }).catch(() => {})
      return formatted
    }
  } catch (err) {
    console.warn('Supabase getProductById error:', err)
  }

  // Fallback to Prisma
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    })
    if (product) {
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        category: product.category,
        ingredients: parseIngredients(product.ingredients),
        available: product.available,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }
    }
  } catch (err) {
    console.warn('Prisma getProductById error:', err)
  }

  // Fallback check in defaults
  const def = DEFAULT_PRODUCTS.find((p) => p.id === id)
  return def || null
}

/**
 * Create a new product in Supabase and Prisma safely
 */
export async function createProduct(data: {
  name: string
  description?: string
  price: number
  imageUrl?: string
  category?: string
  ingredients?: string[] | string
  available?: boolean
}): Promise<ProductRecord> {
  const generatedId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const numPrice = Number(data.price) || 0
  const ingredientsArray = parseIngredients(data.ingredients || [])
  const ingredientsStr = JSON.stringify(ingredientsArray)
  const category = data.category?.trim() || 'Pastry'
  const description = data.description?.trim() || ''
  const imageUrl = data.imageUrl?.trim() || ''
  const available = data.available !== false
  const now = new Date()

  let createdRecord: ProductRecord = {
    id: generatedId,
    name: data.name.trim(),
    description,
    price: numPrice,
    imageUrl,
    category,
    ingredients: ingredientsArray,
    available,
    createdAt: now,
    updatedAt: now,
  }

  // 1. Try Supabase first
  try {
    const { data: supaData, error: supaErr } = await supabase
      .from('products')
      .insert({
        id: generatedId,
        name: createdRecord.name,
        description,
        price: numPrice,
        imageurl: imageUrl,
        imageUrl: imageUrl,
        category,
        ingredients: ingredientsArray,
        available,
        createdat: now.toISOString(),
        updatedat: now.toISOString(),
      })
      .select()
      .maybeSingle()

    if (!supaErr && supaData) {
      createdRecord = formatProduct(supaData)
    }
  } catch (err) {
    console.warn('Supabase product create error (fallback to memory/Prisma):', err)
  }

  // 2. Try Prisma (safely catch if filesystem is readonly e.g. Vercel SQLite)
  try {
    const prismaProduct = await prisma.product.create({
      data: {
        id: createdRecord.id,
        name: createdRecord.name,
        description,
        price: numPrice,
        imageUrl,
        category,
        ingredients: ingredientsStr,
        available,
      },
    })
    if (prismaProduct) {
      createdRecord = {
        id: prismaProduct.id,
        name: prismaProduct.name,
        description: prismaProduct.description,
        price: Number(prismaProduct.price),
        imageUrl: prismaProduct.imageUrl,
        category: prismaProduct.category,
        ingredients: parseIngredients(prismaProduct.ingredients),
        available: prismaProduct.available,
        createdAt: prismaProduct.createdAt,
        updatedAt: prismaProduct.updatedAt,
      }
    }
  } catch (prismaErr) {
    console.warn('Prisma product create skipped/readonly:', prismaErr)
  }

  return createdRecord
}

/**
 * Update a product across Supabase and Prisma
 */
export async function updateProduct(id: string, updates: Partial<ProductRecord>) {
  const price = updates.price !== undefined ? Number(updates.price) : undefined
  const ingredientsArray = updates.ingredients ? parseIngredients(updates.ingredients) : undefined
  const ingredientsStr = ingredientsArray ? JSON.stringify(ingredientsArray) : undefined

  let updatedRecord: ProductRecord | null = null

  // 1. Update in Supabase
  try {
    const supaPayload: any = {}
    if (updates.name !== undefined) supaPayload.name = updates.name.trim()
    if (updates.description !== undefined) supaPayload.description = updates.description
    if (price !== undefined) supaPayload.price = price
    if (updates.imageUrl !== undefined) {
      supaPayload.imageUrl = updates.imageUrl
      supaPayload.imageurl = updates.imageUrl
    }
    if (updates.category !== undefined) supaPayload.category = updates.category
    if (ingredientsArray !== undefined) supaPayload.ingredients = ingredientsArray
    if (updates.available !== undefined) supaPayload.available = updates.available
    supaPayload.updatedat = new Date().toISOString()

    const { data, error } = await supabase
      .from('products')
      .update(supaPayload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (!error && data) {
      updatedRecord = formatProduct(data)
    }
  } catch (e) {
    console.warn('Supabase update error:', e)
  }

  // 2. Upsert/update in Prisma
  try {
    const prismaPayload: any = {}
    if (updates.name !== undefined) prismaPayload.name = updates.name.trim()
    if (updates.description !== undefined) prismaPayload.description = updates.description || ''
    if (price !== undefined) prismaPayload.price = price
    if (updates.imageUrl !== undefined) prismaPayload.imageUrl = updates.imageUrl || ''
    if (updates.category !== undefined) prismaPayload.category = updates.category
    if (ingredientsStr !== undefined) prismaPayload.ingredients = ingredientsStr
    if (updates.available !== undefined) prismaPayload.available = updates.available

    const prismaProduct = await prisma.product.upsert({
      where: { id },
      update: prismaPayload,
      create: {
        id,
        name: updates.name?.trim() || 'Bakery Item',
        description: updates.description || '',
        price: price || 0,
        imageUrl: updates.imageUrl || '',
        category: updates.category || 'Pastry',
        ingredients: ingredientsStr || '[]',
        available: updates.available !== false,
      },
    })

    if (!updatedRecord) {
      updatedRecord = {
        id: prismaProduct.id,
        name: prismaProduct.name,
        description: prismaProduct.description,
        price: Number(prismaProduct.price),
        imageUrl: prismaProduct.imageUrl,
        category: prismaProduct.category,
        ingredients: parseIngredients(prismaProduct.ingredients),
        available: prismaProduct.available,
        createdAt: prismaProduct.createdAt,
        updatedAt: prismaProduct.updatedAt,
      }
    }
  } catch (e) {
    console.warn('Prisma upsert error:', e)
  }

  return updatedRecord
}

/**
 * Delete a product from Supabase and Prisma
 */
export async function deleteProduct(id: string) {
  let deletedFromSupabase = false
  let deletedFromPrisma = false

  // 1. Delete from Supabase
  try {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) deletedFromSupabase = true
  } catch (e) {
    console.warn('Supabase delete error:', e)
  }

  // 2. Delete from Prisma
  try {
    await prisma.orderItem.deleteMany({ where: { productId: id } })
    const res = await prisma.product.deleteMany({ where: { id } })
    if (res.count > 0) deletedFromPrisma = true
  } catch (e) {
    console.warn('Prisma delete error:', e)
  }

  return deletedFromSupabase || deletedFromPrisma
}

/**
 * Save order to Supabase
 */
export async function saveOrderToSupabase(orderData: any, orderItems: any[]) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderData.id,
        userId: orderData.userId || null,
        totalAmount: orderData.totalAmount,
        status: orderData.status || 'PENDING',
        orderType: orderData.orderType || 'RETAIL',
        deliveryType: orderData.deliveryType || 'PICKUP',
        deliveryAddress: orderData.deliveryAddress || null,
        deliveryDate: orderData.deliveryDate || null,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerNote: orderData.customerNote || null,
        paystackReference: orderData.paystackReference || null,
      })
      .select()
      .single()

    if (!error && order) {
      if (orderItems.length > 0) {
        const itemsToInsert = orderItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))
        await supabase.from('order_items').insert(itemsToInsert)
      }
      return { success: true, order }
    }
  } catch (err) {
    console.warn('Could not sync order to Supabase:', err)
  }
  return { success: false }
}
