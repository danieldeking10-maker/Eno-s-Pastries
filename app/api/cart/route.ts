import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { hasServiceRole, supabaseAdmin } from '@/lib/supabase'

const CART_COOKIE = 'enos_cart_session'
const CART_BUCKET = (process.env.SUPABASE_CART_BUCKET || 'cart-sessions').trim()
const MAX_CART_ITEMS = 100

type CartItem = Record<string, unknown>

function cartPath(sessionId: string) {
  return `${sessionId}.json`
}

function isCart(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.length <= MAX_CART_ITEMS && value.every((item) => (
    item && typeof item === 'object' && !Array.isArray(item)
  ))
}

async function getSessionId() {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CART_COOKIE)?.value
  return existing || crypto.randomUUID()
}

function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

async function ensureStorage() {
  if (!hasServiceRole() || !supabaseAdmin) {
    throw new Error('Supabase service role is not configured for cart storage')
  }

  const { data } = await supabaseAdmin.storage.getBucket(CART_BUCKET)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(CART_BUCKET, { public: false })
    if (error && !error.message.toLowerCase().includes('already exists')) {
      throw error
    }
  }

  return supabaseAdmin.storage.from(CART_BUCKET)
}

export async function GET() {
  try {
    const sessionId = await getSessionId()
    const storage = await ensureStorage()
    const { data, error } = await storage.download(cartPath(sessionId))
    let cart: CartItem[] = []

    if (!error && data) {
      const text = await data.text()
      const parsed: unknown = JSON.parse(text)
      if (isCart(parsed)) cart = parsed
    }

    const response = NextResponse.json({ cart })
    setSessionCookie(response, sessionId)
    return response
  } catch (error) {
    console.error('Cart storage read error:', error)
    return NextResponse.json({ error: 'Cart storage is unavailable' }, { status: 503 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    if (!isCart(body?.cart)) {
      return NextResponse.json({ error: 'Invalid cart payload' }, { status: 400 })
    }

    const sessionId = await getSessionId()
    const storage = await ensureStorage()
    const payload = JSON.stringify(body.cart)
    const { error } = await storage.upload(
      cartPath(sessionId),
      new Blob([payload], { type: 'application/json' }),
      { contentType: 'application/json', upsert: true, cacheControl: 'no-cache' },
    )

    if (error) throw error

    const response = NextResponse.json({ ok: true })
    setSessionCookie(response, sessionId)
    return response
  } catch (error) {
    console.error('Cart storage write error:', error)
    return NextResponse.json({ error: 'Cart storage is unavailable' }, { status: 503 })
  }
}
