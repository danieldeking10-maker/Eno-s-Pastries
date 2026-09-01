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
    createdAt: p.createdAt || p.createdat || new Date().toISOString(),
    updatedAt: p.updatedAt || p.updatedat || new Date().toISOString(),
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
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('createdAt', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      const formatted = data.map(formatProduct)

      // Background cache/sync to Prisma for relational consistency
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
    console.warn('Supabase fetch failed, falling back to local DB:', err)
  }

  // Fallback to Prisma
  const prismaProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  })

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
      // Sync to Prisma in background
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
    console.warn('Supabase getProductById failed:', err)
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
    console.warn('Prisma getProductById failed:', err)
  }

  return null
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
    if (updates.imageUrl !== undefined) supaPayload.imageUrl = updates.imageUrl
    if (updates.category !== undefined) supaPayload.category = updates.category
    if (ingredientsArray !== undefined) supaPayload.ingredients = ingredientsArray
    if (updates.available !== undefined) supaPayload.available = updates.available
    supaPayload.updatedAt = new Date().toISOString()

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
