import { getSupabaseClient, hasServiceRole, SUPABASE_CART_BUCKET } from './supabase'
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
 * Checks Supabase connection, schema readiness, RLS/write permissions, and storage buckets.
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

    // 5. Check cart sessions storage bucket
    let cartBucketReady = false
    try {
      const { data: bucketList } = await withTimeout(client.storage.listBuckets(), 3000)
      if (bucketList?.some((b: any) => b.name === SUPABASE_CART_BUCKET)) {
        cartBucketReady = true
      }
    } catch {
      cartBucketReady = false
    }

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

    if (!isServiceRole && !isKeyMalformed && !message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      message += '. Cloud cart backups and order mirroring require SUPABASE_SERVICE_ROLE_KEY.'
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
      cartBucketReady,
      cartBucketName: SUPABASE_CART_BUCKET,
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
      cartBucketReady: false,
      cartBucketName: SUPABASE_CART_BUCKET,
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

    if (error) {
      console.warn('Supabase products fetch warning:', error.message)
    } else if (Array.isArray(data)) {
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
  const ingredientsArray = updates.ingredients !== undefined ? parseIngredients(updates.ingredients) : (existing ? existing.ingredients : [])
  const ingredientsStr = JSON.stringify(ingredientsArray)
  const nowIso = new Date().toISOString()

  let updatedRecord: ProductRecord = {
    id,
    name: updates.name !== undefined ? String(updates.name).trim() : (existing?.name || 'Bakery Item'),
    description: updates.description !== undefined ? String(updates.description || '') : (existing?.description || ''),
    price,
    imageUrl: updates.imageUrl !== undefined ? String(updates.imageUrl || '') : (existing?.imageUrl || ''),
    category: updates.category !== undefined ? String(updates.category).trim() || 'Pastry' : (existing?.category || 'Pastry'),
    ingredients: ingredientsArray,
    available: updates.available !== undefined ? updates.available : (existing ? existing.available : true),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    _supabaseSynced: false,
  }

  try {
    const client = getSupabaseClient()
    const supaPayload: Record<string, any> = {
      updatedat: nowIso,
    }

    if (updates.name !== undefined) supaPayload.name = String(updates.name).trim()
    if (updates.description !== undefined) supaPayload.description = String(updates.description || '')
    if (updates.price !== undefined) supaPayload.price = price
    if (updates.imageUrl !== undefined) supaPayload.imageurl = String(updates.imageUrl || '')
    if (updates.category !== undefined) supaPayload.category = String(updates.category).trim() || 'Pastry'
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
        const { data: existingInSupa } = await withTimeout(
          client.from('products').select('id').eq('id', id).maybeSingle(),
          2000
        ).catch(() => ({ data: null }))

        if (existingInSupa) {
          updatedRecord._supabaseWarning = `Product exists in Supabase, but Row Level Security (RLS) blocked the update (0 rows affected). On Vercel, updates will not reflect until SUPABASE_SERVICE_ROLE_KEY is added to Vercel Environment Variables or the SQL update policy is run in Supabase.`
          console.warn('[Supabase RLS Restriction] Product update affected 0 rows due to RLS policy.')
        } else {
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

  deletedProductIds.delete(id)
  await prisma.deletedProduct.deleteMany({ where: { id } }).catch(() => {})
  updateMemoryCacheWithProduct(updatedRecord)

  return updatedRecord
}

/**
 * Delete a product from Supabase and Prisma safely.
 */
export async function deleteProduct(id: string): Promise<boolean> {
  let deleted = false

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

  try {
    await prisma.orderItem.deleteMany({ where: { productId: id } }).catch(() => {})
    const res = await prisma.product.deleteMany({ where: { id } }).catch(() => null)
    if (res && res.count > 0) deleted = true
  } catch (e) {
    console.warn('Prisma delete notice:', e)
  }

  try {
    await prisma.deletedProduct.upsert({
      where: { id },
      create: { id },
      update: {},
    }).catch(() => {})
  } catch {}

  removeProductFromMemoryCache(id)

  return deleted
}

/**
 * Mirror order and order items to Supabase safely.
 * Uses exact PostgreSQL lowercase column schema to prevent PostgREST errors.
 */
export async function saveOrderToSupabase(orderData: any, orderItems: any[]) {
  if (!hasServiceRole()) return { success: false }

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
      paystacktransactionid: orderData.paystackTransactionId ? String(orderData.paystackTransactionId) : null,
      paymentchannel: orderData.paymentChannel ? String(orderData.paymentChannel) : null,
      paymentcurrency: orderData.paymentCurrency ? String(orderData.paymentCurrency) : null,
      paidat: orderData.paidAt ? new Date(orderData.paidAt).toISOString() : null,
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

export async function syncOrderPaymentToSupabase(orderId: string, paymentDetails: {
  paystackTransactionId: string
  paymentChannel: string | null
  paymentCurrency: string
  paidAt: Date
}) {
  if (!hasServiceRole()) return
  const client = getSupabaseClient()
  const nowIso = new Date().toISOString()

  // First try updating with all payment fields
  const fullPayload: Record<string, any> = {
    status: 'CONFIRMED',
    paystacktransactionid: paymentDetails.paystackTransactionId,
    paymentchannel: paymentDetails.paymentChannel,
    paymentcurrency: paymentDetails.paymentCurrency,
    paidat: paymentDetails.paidAt.toISOString(),
    updatedat: nowIso,
  }

  const { error: fullError } = await withTimeout(
    client.from('orders').update(fullPayload).eq('id', orderId),
    4000
  ).catch((e) => ({ error: e }))

  if (fullError) {
    // Fallback: update status and timestamp only if extended columns are not present
    const basePayload = {
      status: 'CONFIRMED',
      updatedat: nowIso,
    }
    await withTimeout(
      client.from('orders').update(basePayload).eq('id', orderId),
      4000
    ).catch(() => {})
  }
}

function formatSupabaseOrder(o: any, items: any[] = []): any {
  return {
    id: String(o.id),
    userId: o.userid || null,
    totalAmount: Number(o.totalamount || o.totalAmount) || 0,
    status: o.status || 'PENDING',
    orderType: o.ordertype || o.orderType || 'RETAIL',
    deliveryType: o.deliverytype || o.deliveryType || 'PICKUP',
    deliveryAddress: o.deliveryaddress || o.deliveryAddress || null,
    deliveryDate: o.deliverydate || o.deliveryDate || null,
    customerName: o.customername || o.customerName || 'Customer',
    customerEmail: o.customeremail || o.customerEmail || '',
    customerPhone: o.customerphone || o.customerPhone || '',
    customerNote: o.customernote || o.customerNote || null,
    paystackReference: o.paystackreference || o.paystackReference || null,
    paystackTransactionId: o.paystacktransactionid || o.paystackTransactionId || null,
    paidAt: o.paidat || o.paidAt || null,
    paymentChannel: o.paymentchannel || o.paymentChannel || null,
    paymentCurrency: o.paymentcurrency || o.paymentCurrency || null,
    createdAt: o.createdat || o.createdAt || new Date().toISOString(),
    updatedAt: o.updatedat || o.updatedAt || new Date().toISOString(),
    items: items.map((it: any) => ({
      id: String(it.id),
      orderId: String(it.orderid || it.orderId || o.id),
      productId: String(it.productid || it.productId),
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      createdAt: it.createdat || it.createdAt || new Date().toISOString(),
      product: it.product || null,
    })),
  }
}

export async function getOrderByReferenceFromSupabase(reference: string): Promise<any | null> {
  try {
    const client = getSupabaseClient()
    const { data: order, error } = await withTimeout(
      client.from('orders').select('*').eq('paystackreference', reference).maybeSingle(),
      4000
    )
    if (error || !order) return null
    return formatSupabaseOrder(order)
  } catch {
    return null
  }
}

export interface CartSessionData {
  sessionId: string
  items: any[]
  totalCount: number
  totalAmount: number
  updatedAt: string
  metadata?: any
}

/**
 * Persists a customer's active cart session into Supabase Storage under SUPABASE_CART_BUCKET
 */
export async function saveCartSessionToSupabase(
  sessionId: string,
  items: any[],
  metadata?: any
): Promise<{ success: boolean; cartSession?: CartSessionData; error?: string }> {
  if (!hasServiceRole()) {
    return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }
  }

  try {
    const client = getSupabaseClient()
    const fileName = `${sessionId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`

    const totalCount = Array.isArray(items) ? items.length : 0
    const totalAmount = Array.isArray(items)
      ? items.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1), 0)
      : 0

    const cartSession: CartSessionData = {
      sessionId,
      items: items || [],
      totalCount,
      totalAmount,
      updatedAt: new Date().toISOString(),
      metadata,
    }

    const payloadBlob = new Blob([JSON.stringify(cartSession)], { type: 'application/json' })

    const { error } = await client.storage
      .from(SUPABASE_CART_BUCKET)
      .upload(fileName, payloadBlob, {
        contentType: 'application/json',
        upsert: true,
      })

    if (error) {
      console.warn('Supabase cart session upload notice:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, cartSession }
  } catch (err: any) {
    console.warn('Supabase cart session save error:', err)
    return { success: false, error: err?.message || 'Failed to save cart session' }
  }
}

/**
 * Retrieves a customer's active cart session from Supabase Storage under SUPABASE_CART_BUCKET
 */
export async function getCartSessionFromSupabase(
  sessionId: string
): Promise<{ success: boolean; cartSession?: CartSessionData; error?: string }> {
  if (!hasServiceRole()) {
    return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }
  }

  try {
    const client = getSupabaseClient()
    const fileName = `${sessionId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`

    const { data, error } = await client.storage.from(SUPABASE_CART_BUCKET).download(fileName)

    if (error || !data) {
      return { success: false, error: error?.message || 'Session not found' }
    }

    const text = await data.text()
    const cartSession = JSON.parse(text) as CartSessionData

    return { success: true, cartSession }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get cart session' }
  }
}

/**
 * Removes a customer's cart session from Supabase Storage once converted to order
 */
export async function deleteCartSessionFromSupabase(sessionId: string): Promise<boolean> {
  if (!hasServiceRole()) return false

  try {
    const client = getSupabaseClient()
    const fileName = `${sessionId.replace(/[^a-zA-Z0-9_-]/g, '')}.json`

    const { error } = await client.storage.from(SUPABASE_CART_BUCKET).remove([fileName])

    return !error
  } catch {
    return false
  }
}

/**
 * Fetches all orders with item details from Supabase cloud database
 */
export async function getOrdersFromSupabase(filter?: {
  email?: string
  phone?: string
  query?: string
  isAdmin?: boolean
}) {
  try {
    const client = getSupabaseClient()
    let q = client.from('orders').select('*, items:order_items(*)').order('createdat', { ascending: false })

    if (filter?.email && filter?.phone) {
      q = q.or(`customeremail.ilike.%${filter.email}%,customerphone.ilike.%${filter.phone}%`)
    } else if (filter?.email) {
      q = q.ilike('customeremail', `%${filter.email}%`)
    } else if (filter?.phone) {
      q = q.ilike('customerphone', `%${filter.phone}%`)
    } else if (filter?.query) {
      if (filter.isAdmin) {
        q = q.or(`customeremail.ilike.%${filter.query}%,customerphone.ilike.%${filter.query}%,customername.ilike.%${filter.query}%,id.ilike.%${filter.query}%,paystackreference.ilike.%${filter.query}%`)
      } else {
        q = q.or(`customeremail.ilike.%${filter.query}%,customerphone.ilike.%${filter.query}%`)
      }
    }

    const { data, error } = await withTimeout(q, 5000)
    if (error || !Array.isArray(data)) return []

    const products = await getProducts()
    const productMap = new Map(products.map((p) => [p.id, p]))

    return data.map((o: any) => ({
      id: o.id,
      userId: o.userid,
      totalAmount: Number(o.totalamount) || 0,
      status: o.status || 'PENDING',
      orderType: o.ordertype || 'RETAIL',
      deliveryType: o.deliverytype || 'PICKUP',
      deliveryAddress: o.deliveryaddress,
      deliveryDate: o.deliverydate,
      customerName: o.customername,
      customerEmail: o.customeremail,
      customerPhone: o.customerphone,
      customerNote: o.customernote,
      paystackReference: o.paystackreference,
      paystackTransactionId: o.paystacktransactionid,
      paymentChannel: o.paymentchannel,
      paymentCurrency: o.paymentcurrency,
      paidAt: o.paidat,
      createdAt: o.createdat,
      updatedAt: o.updatedat,
      items: Array.isArray(o.items)
        ? o.items.map((it: any) => {
            const prod = productMap.get(it.productid)
            return {
              id: it.id,
              orderId: it.orderid,
              productId: it.productid,
              quantity: it.quantity,
              price: it.price,
              product: prod ? { name: prod.name, imageUrl: prod.imageUrl, category: prod.category } : null,
            }
          })
        : [],
    }))
  } catch (err) {
    console.warn('Error fetching orders from Supabase:', err)
    return []
  }
}

/**
 * Fetches a single order by ID from Supabase
 */
export async function getOrderByIdFromSupabase(id: string) {
  try {
    const client = getSupabaseClient()
    const { data: o, error } = await withTimeout(
      client.from('orders').select('*, items:order_items(*)').eq('id', id).maybeSingle(),
      4000
    )
    if (error || !o) return null

    const products = await getProducts()
    const productMap = new Map(products.map((p) => [p.id, p]))

    return {
      id: o.id,
      userId: o.userid,
      totalAmount: Number(o.totalamount) || 0,
      status: o.status || 'PENDING',
      orderType: o.ordertype || 'RETAIL',
      deliveryType: o.deliverytype || 'PICKUP',
      deliveryAddress: o.deliveryaddress,
      deliveryDate: o.deliverydate,
      customerName: o.customername,
      customerEmail: o.customeremail,
      customerPhone: o.customerphone,
      customerNote: o.customernote,
      paystackReference: o.paystackreference,
      paystackTransactionId: o.paystacktransactionid,
      paymentChannel: o.paymentchannel,
      paymentCurrency: o.paymentcurrency,
      paidAt: o.paidat,
      createdAt: o.createdat,
      updatedAt: o.updatedat,
      items: Array.isArray(o.items)
        ? o.items.map((it: any) => {
            const prod = productMap.get(it.productid)
            return {
              id: it.id,
              orderId: it.orderid,
              productId: it.productid,
              quantity: it.quantity,
              price: it.price,
              product: prod ? { name: prod.name, imageUrl: prod.imageUrl, category: prod.category } : null,
            }
          })
        : [],
    }
  } catch (err) {
    console.warn('Error fetching order by ID from Supabase:', err)
    return null
  }
}

/**
 * Updates order status in Supabase
 */
export async function updateOrderStatusInSupabase(id: string, status: string, paymentDetails?: any) {
  try {
    const client = getSupabaseClient()
    const updatePayload: Record<string, any> = {
      status,
      updatedat: new Date().toISOString(),
    }
    if (paymentDetails) {
      if (paymentDetails.paystackTransactionId) updatePayload.paystacktransactionid = paymentDetails.paystackTransactionId
      if (paymentDetails.paymentChannel) updatePayload.paymentchannel = paymentDetails.paymentChannel
      if (paymentDetails.paymentCurrency) updatePayload.paymentcurrency = paymentDetails.paymentCurrency
      if (paymentDetails.paidAt) updatePayload.paidat = new Date(paymentDetails.paidAt).toISOString()
    }
    const { data, error } = await withTimeout(
      client.from('orders').update(updatePayload).eq('id', id).select().maybeSingle(),
      4000
    )
    return !error && !!data
  } catch (err) {
    console.warn('Error updating order status in Supabase:', err)
    return false
  }
}

