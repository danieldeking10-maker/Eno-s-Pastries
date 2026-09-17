'use client'

import { useEffect, useState } from 'react'
import { Database, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink, Key } from 'lucide-react'

export default function SupabaseSyncBanner() {
  const [status, setStatus] = useState<{
    connected: boolean
    tablesReady: boolean
    productsReady?: boolean
    ordersReady?: boolean
    orderItemsReady?: boolean
    hasServiceRole?: boolean
    canWriteProducts?: boolean
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

  const sqlContent = `-- ==========================================
-- SUPABASE COMPLETE SETUP & PERMISSIONS SCRIPT
-- For Eno's Pastries (Resolves Vercel & RLS update issues)
-- ==========================================

-- 1. Create tables if they do not exist
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  imageurl TEXT,
  category TEXT NOT NULL DEFAULT 'Pastry',
  ingredients JSONB DEFAULT '[]'::jsonb,
  available BOOLEAN DEFAULT true,
  createdat TIMESTAMPTZ DEFAULT now(),
  updatedat TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userid TEXT,
  totalamount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDING',
  ordertype TEXT NOT NULL DEFAULT 'RETAIL',
  deliverytype TEXT NOT NULL DEFAULT 'PICKUP',
  deliveryaddress TEXT,
  deliverydate TIMESTAMPTZ,
  customername TEXT NOT NULL,
  customeremail TEXT NOT NULL,
  customerphone TEXT NOT NULL,
  customernote TEXT,
  paystackreference TEXT UNIQUE,
  createdat TIMESTAMPTZ DEFAULT now(),
  updatedat TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  orderid TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  productid TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  createdat TIMESTAMPTZ DEFAULT now()
);

-- 2. Grant schema and table permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 3. Row Level Security Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all modifications on products" ON public.products;
CREATE POLICY "Allow all modifications on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert products" ON public.products;
CREATE POLICY "Public can insert products" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update products" ON public.products;
CREATE POLICY "Public can update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete products" ON public.products;
CREATE POLICY "Public can delete products" ON public.products FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
CREATE POLICY "Public can update orders" ON public.orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);`

  const copySql = () => {
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-stone-900">Supabase Cloud Database</h3>
              {loading ? (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Checking
                </span>
              ) : status?.tablesReady && status?.canWriteProducts ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active & Fully Synced (Read/Write)
                </span>
              ) : status?.tablesReady && !status?.canWriteProducts ? (
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-700" /> Read Active — Updates Restricted by RLS
                </span>
              ) : status?.productsReady ? (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-700" /> Products Active (Orders Tables Setup Needed)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-700" /> Tables Setup Required
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

      {status && !status.canWriteProducts && !loading && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 text-xs text-stone-700 space-y-2">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            Why updated products don&apos;t show on Vercel:
          </div>
          <p className="leading-relaxed text-stone-600">
            On Vercel, serverless functions run without a permanent local database. In Supabase, Row Level Security (RLS) is currently preventing product updates and inserts. To make product updates show immediately on Vercel:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-semibold text-stone-800">
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-amber-900 font-black flex items-center gap-1.5 mb-1">
                <Key className="w-3.5 h-3.5 text-amber-700" /> Option 1 (Recommended):
              </span>
              <p className="text-[11px] font-normal text-stone-600 leading-snug">
                Add <code className="bg-stone-100 text-amber-950 font-mono px-1 py-0.5 rounded text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code> in your <strong>Vercel Project Settings &gt; Environment Variables</strong>.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-amber-900 font-black flex items-center gap-1.5 mb-1">
                <Copy className="w-3.5 h-3.5 text-amber-700" /> Option 2:
              </span>
              <p className="text-[11px] font-normal text-stone-600 leading-snug">
                Click <strong>View SQL Setup</strong> below, copy the SQL, and paste it into the <strong>Supabase SQL Editor</strong> to enable public update permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {showSql && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-stone-700">
              Run this in your Supabase SQL Editor to enable tables & update permissions:
            </p>
            <button
              onClick={copySql}
              className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied SQL!' : 'Copy SQL'}
            </button>
          </div>
          <pre className="bg-stone-950 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 scrollbar-thin">
            {sqlContent}
          </pre>
        </div>
      )}
    </div>
  )
}

