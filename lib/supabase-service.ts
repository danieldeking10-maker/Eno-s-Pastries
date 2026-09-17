import { getSupabaseClient, hasServiceRole } from './supabase'
import prisma from './prisma'
import crypto from 'crypto'

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
  _supabaseSynced?: boolean
  _supabaseWarning?: string
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

// In-memory caching for ultra-fast response times and resilience
let memoryProductCache: ProductRecord[] | null = null
let lastCacheTimestamp = 0
const CACHE_TTL_MS = 15000 // 15 seconds
const deletedProductIds = new Set<string>()

export function invalidateProductCache() {
  memoryProductCache = null
  lastCacheTimestamp = 0
}

export function updateMemoryCacheWithProduct(product: ProductRecord) {
  if (!memoryProductCache) {
    memoryProductCache = [product]
  } else {
    const idx = memoryProductCache.findIndex((p) => p.id === product.id)
    if (idx >= 0) {
      memoryProductCache[idx] = product
    } else {
      memoryProductCache.push(product)
    }
  }
  deletedProductIds.delete(product.id)
  lastCacheTimestamp = Date.now()
}

export function removeProductFromMemoryCache(id: string) {
  deletedProductIds.add(id)
  if (memoryProductCache) {
    memoryProductCache = memoryProductCache.filter((p) => p.id !== id)
  }
  lastCacheTimestamp = Date.now()
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
  const img = p.imageurl || p.imageUrl || null
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
    createdAt: p.createdat || p.createdAt || p.created_at || new Date().toISOString(),
    updatedAt: p.updatedat || p.updatedAt || p.updated_at || new Date().toISOString(),
  }
}

function formatPrismaProduct(p: any): ProductRecord {
  return {
    id: String(p.id),
    name: String(p.name || ''),
    description: p.description ? String(p.description) : '',
    price: Number(p.price) || 0,
    imageUrl: p.imageUrl || null,
    category: p.category || 'Pastry',
    ingredients: parseIngredients(p.ingredients),
    available: p.available !== false,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  }
}

/**
 * Execute a promise with a safety timeout to prevent hanging the server on slow external networks.
 */
async function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 3500): Promise<T> {
  const promise = Promise.resolve(promiseLike)
  let timer: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timer!)
  }
}

/**
 * Checks Supabase connection, schema readiness, and RLS/write permissions.
 */
export async function checkSupabaseStatus() {
  const client = getSupabaseClient()
  const isServiceRole = hasServiceRole()

  let productsReady = false
  let ordersReady = false
  let orderItemsReady = false
  let canWriteProducts = isServiceRole
  let productsError: string | null = null
  let ordersError: string | null = null
  let orderItemsError: string | null = null

  try {
    // 1. Check products table
    const prodRes = await withTimeout(client.from('products').select('id').limit(1), 3000)
    if (!prodRes.error) {
      productsReady = true
    } else {
      productsError = prodRes.error.message
    }

    // 2. Check orders table
    const ordRes = await withTimeout(client.from('orders').select('id').limit(1), 3000)
    if (!ordRes.error) {
      ordersReady = true
    } else {
      ordersError = ordRes.error.message
    }

    // 3. Check order_items table
    const itemsRes = await withTimeout(client.from('order_items').select('id').limit(1), 3000)
    if (!itemsRes.error) {
      orderItemsReady = true
    } else {
      orderItemsError = itemsRes.error.message
    }

    // 4. Test write permissions on products (detect RLS policy restrictions)
    if (isServiceRole) {
      canWriteProducts = true
    } else if (productsReady) {
      try {
        const probeId = '__rls_probe_check__'
        const insertProbe = await withTimeout(
          client.from('products').insert({ id: probeId, name: '__probe__', price: 0 }).select(),
          2500
        ).catch(() => null)
        if (insertProbe?.error) {
          canWriteProducts = false
        } else if (insertProbe?.data && insertProbe.data.length > 0) {
          canWriteProducts = true
          // Cleanup probe row
          try {
            await client.from('products').delete().eq('id', probeId)
          } catch {}
        } else {
          canWriteProducts = false
        }
      } catch {
        canWriteProducts = false
      }
    }

    const tablesReady = productsReady && ordersReady && orderItemsReady

    const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim()
    const isKeyMalformed = !!rawServiceKey && !isServiceRole

    let message = 'Supabase active and all tables synced'
    if (isKeyMalformed) {
      message = 'SUPABASE_SERVICE_ROLE_KEY is set to a short string (likely database password) instead of the Supabase service_role JWT key (starts with "eyJ...").'
    } else if (!tablesReady) {
      if (!productsReady && !ordersReady) {
        message = 'Supabase connected, but SQL tables need to be created'
      } else if (!ordersReady || !orderItemsReady) {
        message = 'Products table active; orders permissions need granting'
      }
    } else if (!canWriteProducts) {
      message = 'Supabase connected (Read-Only). Product updates require SUPABASE_SERVICE_ROLE_KEY or public RLS update policy.'
    }

    return {
      connected: true,
      tablesReady,
      hasServiceRole: isServiceRole,
      isKeyMalformed,
      productsReady,
      ordersReady,
      orderItemsReady,
      canWriteProducts,
      message,
      details: {
        productsError,
        ordersError,
        orderItemsError,
      },
    }
  } catch (err: any) {
    return {
      connected: false,
      tablesReady: false,
      hasServiceRole: isServiceRole,
      isKeyMalformed: false,
      productsReady: false,
      ordersReady: false,
      orderItemsReady: false,
      canWriteProducts: false,
      message: err?.message || 'Connection error to Supabase',
    }
  }
}

/**
 * Fetch all products: checks memory cache, queries Supabase with safety timeout,
 * reconciles with local Prisma records by timestamp so local updates are never lost,
 * and falls back gracefully.
 */
export async function getProducts(forceRefresh = false): Promise<ProductRecord[]> {
  const now = Date.now()
  if (!forceRefresh && memoryProductCache && memoryProductCache.length > 0 && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return memoryProductCache
  }

  // 1. Fetch deleted IDs from Prisma to prevent resurrecting deleted products
  try {
    const deletedRows = await prisma.deletedProduct.findMany().catch(() => [])
    for (const d of deletedRows) {
      deletedProductIds.add(d.id)
    }
  } catch {}

  // 2. Fetch Prisma products
  let prismaProducts: any[] = []
  try {
    prismaProducts = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
    })
  } catch (err) {
    console.warn('Prisma products query notice:', err)
  }

  // 3. Fetch Supabase products (with 3.5s timeout)
  let supaProducts: ProductRecord[] = []
  try {
    const client = getSupabaseClient()
    const { data, error } = await withTimeout(client.from('products').select('*'), 3500)

    if (!error && Array.isArray(data)) {
      supaProducts = data.map(formatProduct)
    }
  } catch (err) {
    console.warn('Supabase products fetch notice:', err)
  }

  // 4. Reconcile both sources using timestamps
  const productMap = new Map<string, ProductRecord>()

  // First populate with Supabase products (if not deleted)
  for (const s of supaProducts) {
    if (deletedProductIds.has(s.id)) continue
    productMap.set(s.id, s)
  }

  // Overlay Prisma products: if Prisma has a newer updatedAt, keep Prisma
  for (const p of prismaProducts) {
    if (deletedProductIds.has(p.id)) continue
    const pFormatted = formatPrismaProduct(p)
    if (productMap.has(p.id)) {
      const supaItem = productMap.get(p.id)!
      const pUpdated = new Date(p.updatedAt).getTime()
      const sUpdated = supaItem.updatedAt ? new Date(supaItem.updatedAt).getTime() : 0

      if (pUpdated >= sUpdated) {
        // Local update is newer or equal: preserve local edits!
        productMap.set(p.id, pFormatted)
      } else {
        productMap.set(p.id, supaItem)
      }
    } else {
      productMap.set(p.id, pFormatted)
    }
  }

  // If completely empty, fallback to DEFAULT_PRODUCTS
  if (productMap.size === 0) {
    for (const item of DEFAULT_PRODUCTS) {
      if (!deletedProductIds.has(item.id)) {
        productMap.set(item.id, item)
      }
    }
  }

  const result = Array.from(productMap.values())
  result.sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tA - tB
  })

  // Synchronize new Supabase records into Prisma SQLite in background
  // (never overwriting Prisma records that are newer)
  try {
    for (const item of result) {
      const pInPrisma = prismaProducts.find((p) => p.id === item.id)
      const pUpdated = pInPrisma ? new Date(pInPrisma.updatedAt).getTime() : 0
      const itemUpdated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0

      if (!pInPrisma) {
        prisma.product.create({
          data: {
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl || '',
            category: item.category,
            ingredients: JSON.stringify(item.ingredients),
            available: item.available,
          },
        }).catch(() => {})
      } else if (itemUpdated > pUpdated) {
        prisma.product.update({
          where: { id: item.id },
          data: {
            name: item.name,
            description: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl || '',
            category: item.category,
            ingredients: JSON.stringify(item.ingredients),
            available: item.available,
          },
        }).catch(() => {})
      }
    }
  } catch {}

  memoryProductCache = result
  lastCacheTimestamp = Date.now()

  return result
}

/**
 * Fetch a single product by ID from Memory, Supabase, or Prisma with timestamp reconciliation
 */
export async function getProductById(id: string): Promise<ProductRecord | null> {
  if (deletedProductIds.has(id)) return null

  // Check memory cache first
  if (memoryProductCache) {
    const found = memoryProductCache.find((p) => p.id === id)
    if (found) return found
  }

  // 1. Check Prisma
  let prismaItem: any = null
  try {
    prismaItem = await prisma.product.findUnique({ where: { id } })
  } catch (err) {
    console.warn('Prisma getProductById notice:', err)
  }

  // 2. Check Supabase
  let supaItem: ProductRecord | null = null
  try {
    const client = getSupabaseClient()
    const { data, error } = await withTimeout(
      client.from('products').select('*').eq('id', id).maybeSingle(),
      2500
    )
    if (!error && data) {
      supaItem = formatProduct(data)
    }
  } catch (err) {
    console.warn('Supabase getProductById notice:', err)
  }

  // If both exist, return whichever was updated more recently
  if (prismaItem && supaItem) {
    const pUpdated = new Date(prismaItem.updatedAt).getTime()
    const sUpdated = supaItem.updatedAt ? new Date(supaItem.updatedAt).getTime() : 0
    if (pUpdated >= sUpdated) {
      return formatPrismaProduct(prismaItem)
    } else {
      return supaItem
    }
  }

  if (prismaItem) return formatPrismaProduct(prismaItem)
  if (supaItem) return supaItem

  // 3. Fallback check in defaults
  const def = DEFAULT_PRODUCTS.find((p) => p.id === id)
  return def || null
}

/**
 * Create a new product in Supabase and Prisma safely without crashing.
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
  // Use standard RFC UUID v4 to satisfy both UUID and TEXT column types in PostgreSQL
  const generatedId = crypto.randomUUID()
  const numPrice = Math.max(0, Number(data.price) || 0)
  const ingredientsArray = parseIngredients(data.ingredients || [])
  const ingredientsStr = JSON.stringify(ingredientsArray)
  const category = data.category?.trim() || 'Pastry'
  const description = data.description?.trim() || ''
  const imageUrl = data.imageUrl?.trim() || ''
  const available = data.available !== false
  const nowIso = new Date().toISOString()

  let createdRecord: ProductRecord = {
    id: generatedId,
    name: data.name.trim(),
    description,
    price: numPrice,
    imageUrl,
    category,
    ingredients: ingredientsArray,
    available,
    createdAt: nowIso,
    updatedAt: nowIso,
    _supabaseSynced: false,
  }

  // 1. Insert to Supabase (PostgreSQL column names in lowercase: imageurl, createdat, etc.)
  try {
    const client = getSupabaseClient()
    const supaPayload = {
      id: generatedId,
      name: createdRecord.name,
      description,
      price: numPrice,
      imageurl: imageUrl,
      category,
      ingredients: ingredientsArray,
      available,
      createdat: nowIso,
      updatedat: nowIso,
    }

    const { data: supaData, error: supaErr } = await withTimeout(
      client.from('products').insert(supaPayload).select().maybeSingle(),
      4000
    )

    if (!supaErr && supaData) {
      createdRecord = formatProduct(supaData)
      createdRecord._supabaseSynced = true
    } else {
      createdRecord._supabaseSynced = false
      if (supaErr) {
        createdRecord._supabaseWarning = `Supabase insert failed: ${supaErr.message} (Code: ${supaErr.code || 'unknown'}). On Vercel, this product will not persist until SUPABASE_SERVICE_ROLE_KEY is configured or public RLS insert policy is enabled.`
        console.warn('Supabase product insert notice:', supaErr.message)
      }
    }
  } catch (err) {
    console.warn('Supabase product create notice:', err)
  }

  // 2. Persist to Prisma SQLite
  try {
    const prismaProduct = await prisma.product.upsert({
      where: { id: createdRecord.id },
      update: {
        name: createdRecord.name,
        description,
        price: numPrice,
        imageUrl,
        category,
        ingredients: ingredientsStr,
        available,
      },
      create: {
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
      const savedSynced = createdRecord._supabaseSynced
      const savedWarning = createdRecord._supabaseWarning
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
        _supabaseSynced: savedSynced,
        _supabaseWarning: savedWarning,
      }
    }
  } catch (prismaErr) {
    console.warn('Prisma product save notice:', prismaErr)
  }

  // Remove from deleted tracker if previously deleted
  deletedProductIds.delete(createdRecord.id)
  await prisma.deletedProduct.deleteMany({ where: { id: createdRecord.id } }).catch(() => {})

  // Immediately update in-memory cache
  updateMemoryCacheWithProduct(createdRecord)

  return createdRecord
}

/**
 * Update a product across Supabase and Prisma safely.
 */
export async function updateProduct(
  id: string,
  updates: Partial<ProductRecord>
): Promise<ProductRecord | null> {
  const existing = await getProductById(id)
  const price = updates.price !== undefined ? Math.max(0, Number(updates.price)) : (existing ? existing.price : 0)
  const ingredientsArray = updates.ingredients ? parseIngredients(updates.ingredients) : (existing ? existing.ingredients : [])
  const ingredientsStr = JSON.stringify(ingredientsArray)
  const nowIso = new Date().toISOString()

  let updatedRecord: ProductRecord = {
    id,
    name: updates.name !== undefined ? updates.name.trim() : (existing?.name || 'Bakery Item'),
    description: updates.description !== undefined ? (updates.description || '') : (existing?.description || ''),
    price,
    imageUrl: updates.imageUrl !== undefined ? (updates.imageUrl || '') : (existing?.imageUrl || ''),
    category: updates.category !== undefined ? updates.category : (existing?.category || 'Pastry'),
    ingredients: ingredientsArray,
    available: updates.available !== undefined ? updates.available : (existing ? existing.available : true),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    _supabaseSynced: false,
  }

  // 1. Update in Supabase (using lowercase columns: imageurl, updatedat)
  try {
    const client = getSupabaseClient()
    const supaPayload: Record<string, any> = {
      updatedat: nowIso,
    }
    if (updates.name !== undefined) supaPayload.name = updates.name.trim()
    if (updates.description !== undefined) supaPayload.description = updates.description || ''
    if (updates.price !== undefined) supaPayload.price = price
    if (updates.imageUrl !== undefined) supaPayload.imageurl = updates.imageUrl || ''
    if (updates.category !== undefined) supaPayload.category = updates.category
    if (updates.ingredients !== undefined) supaPayload.ingredients = ingredientsArray
    if (updates.available !== undefined) supaPayload.available = updates.available

    const { data: supaData, error: supaErr } = await withTimeout(
      client.from('products').update(supaPayload).eq('id', id).select().maybeSingle(),
      4000
    )

    if (!supaErr && supaData) {
      updatedRecord = formatProduct(supaData)
      updatedRecord._supabaseSynced = true
    } else {
      updatedRecord._supabaseSynced = false
      if (supaErr) {
        updatedRecord._supabaseWarning = `Supabase update rejected: ${supaErr.message} (Code: ${supaErr.code || 'unknown'}). On Vercel, updates will not persist until SUPABASE_SERVICE_ROLE_KEY is added or public RLS update policy is enabled.`
        console.warn('Supabase product update notice:', supaErr.message)
      } else if (!supaData) {
        // 0 rows updated in Supabase! Check if product exists in Supabase
        const { data: existingInSupa } = await withTimeout(
          client.from('products').select('id').eq('id', id).maybeSingle(),
          2000
        ).catch(() => ({ data: null }))

        if (existingInSupa) {
          updatedRecord._supabaseWarning = `Product exists in Supabase, but Row Level Security (RLS) blocked the update (0 rows affected). On Vercel, updates will not reflect until SUPABASE_SERVICE_ROLE_KEY is added to Vercel Environment Variables or the SQL update policy is run in Supabase.`
          console.warn('[Supabase RLS Restriction] Product update affected 0 rows due to RLS policy.')
        } else {
          // Attempt insert into Supabase if it wasn't there
          const insertRes = await withTimeout(
            client.from('products').insert({
              id,
              name: updatedRecord.name,
              description: updatedRecord.description,
              price: updatedRecord.price,
              imageurl: updatedRecord.imageUrl,
              category: updatedRecord.category,
              ingredients: ingredientsArray,
              available: updatedRecord.available,
              createdat: nowIso,
              updatedat: nowIso,
            }).select().maybeSingle(),
            3000
          ).catch(() => null)

          if (insertRes?.data) {
            updatedRecord = formatProduct(insertRes.data)
            updatedRecord._supabaseSynced = true
          } else {
            updatedRecord._supabaseWarning = `Product does not exist in Supabase and could not be inserted (RLS restriction). Add SUPABASE_SERVICE_ROLE_KEY in Vercel to sync.`
          }
        }
      }
    }
  } catch (e) {
    console.warn('Supabase product update exception:', e)
  }

  // 2. Persist to Prisma SQLite
  try {
    const prismaProduct = await prisma.product.upsert({
      where: { id },
      update: {
        name: updatedRecord.name,
        description: updatedRecord.description || '',
        price: updatedRecord.price,
        imageUrl: updatedRecord.imageUrl || '',
        category: updatedRecord.category,
        ingredients: ingredientsStr,
        available: updatedRecord.available,
      },
      create: {
        id,
        name: updatedRecord.name,
        description: updatedRecord.description || '',
        price: updatedRecord.price,
        imageUrl: updatedRecord.imageUrl || '',
        category: updatedRecord.category,
        ingredients: ingredientsStr,
        available: updatedRecord.available,
      },
    })

    if (prismaProduct) {
      const savedSynced = updatedRecord._supabaseSynced
      const savedWarning = updatedRecord._supabaseWarning
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
        _supabaseSynced: savedSynced,
        _supabaseWarning: savedWarning,
      }
    }
  } catch (e) {
    console.warn('Prisma product update notice:', e)
  }

  // Remove from deleted tracker
  deletedProductIds.delete(id)
  await prisma.deletedProduct.deleteMany({ where: { id } }).catch(() => {})

  // Immediately update in-memory cache so subsequent reads see the updated product
  updateMemoryCacheWithProduct(updatedRecord)

  return updatedRecord
}

/**
 * Delete a product from Supabase and Prisma safely.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  let deleted = false

  // 1. Delete from Supabase
  try {
    const client = getSupabaseClient()
    const { data: supaDeleted, error } = await withTimeout(
      client.from('products').delete().eq('id', id).select(),
      3500
    )
    if (!error && Array.isArray(supaDeleted) && supaDeleted.length > 0) {
      deleted = true
    } else if (error) {
      console.warn('Supabase delete notice:', error.message)
    } else if (Array.isArray(supaDeleted) && supaDeleted.length === 0) {
      console.warn(`[Supabase RLS Warning] Supabase delete on product ${id} affected 0 rows due to RLS policy.`)
    }
  } catch (e) {
    console.warn('Supabase delete notice:', e)
  }

  // 2. Delete from Prisma
  try {
    await prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {})
    const res = await prisma.product.deleteMany({ where: { id } }).catch(() => null)
    if (res && res.count > 0) deleted = true
  } catch (e) {
    console.warn('Prisma delete notice:', e)
  }

  // 3. Mark as deleted in SQLite to prevent stale Supabase query from resurrecting it
  try {
    await prisma.deletedProduct.upsert({
      where: { id },
      create: { id },
      update: {},
    }).catch(() => {})
  } catch {}

  // Remove from memory cache
  removeProductFromMemoryCache(id)

  return deleted || true
}

/**
 * Mirror order and order items to Supabase safely.
 * Uses exact PostgreSQL lowercase column schema to prevent PostgREST errors.
 */
export async function saveOrderToSupabase(orderData: any, orderItems: any[]) {
  try {
    const client = getSupabaseClient()
    const nowIso = new Date().toISOString()

    const orderPayload = {
      id: String(orderData.id),
      userid: orderData.userId ? String(orderData.userId) : null,
      totalamount: Number(orderData.totalAmount) || 0,
      status: String(orderData.status || 'PENDING'),
      ordertype: String(orderData.orderType || 'RETAIL'),
      deliverytype: String(orderData.deliveryType || 'PICKUP'),
      deliveryaddress: orderData.deliveryAddress ? String(orderData.deliveryAddress) : null,
      deliverydate: orderData.deliveryDate ? new Date(orderData.deliveryDate).toISOString() : null,
      customername: String(orderData.customerName || 'Valued Customer'),
      customeremail: String(orderData.customerEmail || ''),
      customerphone: String(orderData.customerPhone || ''),
      customernote: orderData.customerNote ? String(orderData.customerNote) : null,
      paystackreference: orderData.paystackReference ? String(orderData.paystackReference) : null,
      createdat: orderData.createdAt ? new Date(orderData.createdAt).toISOString() : nowIso,
      updatedat: nowIso,
    }

    const { data: order, error } = await withTimeout(
      client.from('orders').insert(orderPayload).select().maybeSingle(),
      4000
    )

    if (!error && order) {
      if (orderItems && orderItems.length > 0) {
        const itemsToInsert = orderItems.map((item) => ({
          id: crypto.randomUUID(),
          orderid: order.id,
          productid: String(item.productId),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          createdat: nowIso,
        }))

        await withTimeout(client.from('order_items').insert(itemsToInsert), 4000)
      }
      return { success: true, order }
    } else if (error) {
      console.warn('Supabase order insert notice:', error.message)
    }
  } catch (err) {
    console.warn('Supabase order mirror notice:', err)
  }
  return { success: false }
}
