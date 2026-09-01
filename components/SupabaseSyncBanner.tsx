'use client'

import { useEffect, useState } from 'react'
import { Database, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink } from 'lucide-react'

export default function SupabaseSyncBanner() {
  const [status, setStatus] = useState<{
    connected: boolean
    tablesReady: boolean
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showSql, setShowSql] = useState(false)

  async function checkStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/supabase-status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, tablesReady: false, message: 'Could not connect' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const copySql = () => {
    const sqlContent = `-- Supabase Schema for Eno's Pastries
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  imageUrl TEXT,
  category TEXT NOT NULL DEFAULT 'Pastry',
  ingredients JSONB DEFAULT '[]'::jsonb,
  available BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT,
  totalAmount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDING',
  orderType TEXT NOT NULL DEFAULT 'RETAIL',
  deliveryType TEXT NOT NULL DEFAULT 'PICKUP',
  deliveryAddress TEXT,
  deliveryDate TIMESTAMPTZ,
  customerName TEXT NOT NULL,
  customerEmail TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  customerNote TEXT,
  paystackReference TEXT UNIQUE,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderId TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  createdAt TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all modifications on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);`

    navigator.clipboard.writeText(sqlContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-stone-900">Supabase Cloud Database</h3>
              {loading ? (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Checking
                </span>
              ) : status?.tablesReady ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active & Synced
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-700" /> Connected (Tables Pending)
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Project URL: <span className="font-mono text-stone-700">vfolwsqdizcnmpowptko.supabase.co</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={checkStatus}
            disabled={loading}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowSql(!showSql)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {showSql ? 'Hide SQL' : 'View SQL Setup'}
          </button>

          <a
            href="https://supabase.com/dashboard/project/vfolwsqdizcnmpowptko/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Supabase SQL Editor
          </a>
        </div>
      </div>

      {showSql && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-stone-700">
              Run this in your Supabase SQL Editor to create tables & enable RLS:
            </p>
            <button
              onClick={copySql}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied SQL!' : 'Copy SQL'}
            </button>
          </div>
          <pre className="bg-stone-950 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
{`CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  imageUrl TEXT,
  category TEXT NOT NULL DEFAULT 'Pastry',
  ingredients JSONB DEFAULT '[]'::jsonb,
  available BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT,
  totalAmount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDING',
  orderType TEXT NOT NULL DEFAULT 'RETAIL',
  deliveryType TEXT NOT NULL DEFAULT 'PICKUP',
  deliveryAddress TEXT,
  deliveryDate TIMESTAMPTZ,
  customerName TEXT NOT NULL,
  customerEmail TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  customerNote TEXT,
  paystackReference TEXT UNIQUE,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);`}
          </pre>
        </div>
      )}
    </div>
  )
}
