import { NextRequest, NextResponse } from 'next/server'
import {
  saveCartSessionToSupabase,
  getCartSessionFromSupabase,
  deleteCartSessionFromSupabase,
} from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId query parameter is required' }, { status: 400 })
    }

    const result = await getCartSessionFromSupabase(sessionId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch cart session' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, items, metadata } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required in request body' }, { status: 400 })
    }

    const result = await saveCartSessionToSupabase(sessionId, items || [], metadata)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to persist cart session' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      try {
        const body = await req.json()
        sessionId = body?.sessionId
      } catch {}
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const success = await deleteCartSessionFromSupabase(sessionId)
    return NextResponse.json({ success })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete cart session' },
      { status: 500 }
    )
  }
}
