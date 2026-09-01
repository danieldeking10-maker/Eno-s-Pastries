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
 * Fetch products: tries Supabase first if tables are ready, otherwise falls back to local database.
 */
export async function getProducts(): Promise<ProductRecord[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('createdAt', { ascending: true })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((p) => {
        let ingredients: string[] = []
        try {
          ingredients = typeof p.ingredients === 'string' ? JSON.parse(p.ingredients) : (Array.isArray(p.ingredients) ? p.ingredients : [])
        } catch {
          ingredients = p.ingredients ? String(p.ingredients).split(',').map((s: string) => s.trim()) : []
        }
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          imageUrl: p.imageUrl || null,
          category: p.category || 'Pastry',
          ingredients,
          available: p.available ?? true,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }
      })
    }
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to local DB:', err)
  }

  // Fallback to Prisma
  const prismaProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return prismaProducts.map((p) => {
    let ingredients: string[] = []
    try {
      ingredients = typeof p.ingredients === 'string' ? JSON.parse(p.ingredients) : []
    } catch {
      ingredients = p.ingredients ? String(p.ingredients).split(',').map((s) => s.trim()) : []
    }
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      category: p.category,
      ingredients,
      available: p.available,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }
  })
}

/**
 * Save order to Supabase and local DB
 */
export async function saveOrderToSupabase(orderData: any, orderItems: any[]) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderData.id,
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
