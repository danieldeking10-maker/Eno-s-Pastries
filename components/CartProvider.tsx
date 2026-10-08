'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Product } from './ProductCard';

type CartContextType = {
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  sessionId: string;
  isCloudSynced: boolean;
};

const LOCAL_CART_KEY = 'enos_cart_v1';

function normalizeCartItem(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;

  const item = value as Partial<Product>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const price = Number(item.price);

  if (!name || !Number.isFinite(price) || price < 0) return null;

  return {
    id: item.id ? String(item.id) : name,
    name,
    description: typeof item.description === 'string' ? item.description : '',
    price,
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
    category: typeof item.category === 'string' && item.category ? item.category : 'Pastry',
    ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(String) : [],
    available: item.available !== false,
    bestseller: item.bestseller === true,
  };
}

function readLocalCart(): Product[] | null {
  try {
    const stored = window.localStorage.getItem(LOCAL_CART_KEY) ?? window.localStorage.getItem('enosPastriesCart');
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.map(normalizeCartItem).filter((item): item is Product => item !== null)
      : null;
  } catch {
    return null;
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleWindowError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleWindowError);
    return () => window.removeEventListener('error', handleWindowError);
  }, []);

  // Restore this browser's cart first, then try the cloud backups.
  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      let remoteCart: Product[] | null = null;

      try {
        let sid = localStorage.getItem('enosPastriesCartSessionId') || '';
        if (!sid) {
          sid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `cart_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem('enosPastriesCartSessionId', sid);
        }
        if (!cancelled) setSessionId(sid);

        const localCart = readLocalCart();
        if (localCart !== null) {
          if (!cancelled) setCart(localCart);
          return;
        }

        const sessionResponse = await fetch(`/api/cart/session?sessionId=${encodeURIComponent(sid)}`, { cache: 'no-store' });
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json().catch(() => ({}));
          const sessionItems = sessionData?.cartSession?.items;
          if (Array.isArray(sessionItems)) {
            remoteCart = sessionItems
              .map(normalizeCartItem)
              .filter((item: Product | null): item is Product => item !== null);
          }
        }

        if (remoteCart === null) {
          const response = await fetch('/api/cart', { cache: 'no-store' });
          if (response.ok) {
            const data = await response.json().catch(() => ({}));
            if (Array.isArray(data?.cart)) {
              remoteCart = data.cart
                .map(normalizeCartItem)
                .filter((item: Product | null): item is Product => item !== null);
            }
          }
        }
      } catch {
        console.warn("Cart storage unavailable; using this browser's saved cart.");
      } finally {
        const localCart = readLocalCart();
        if (!cancelled) setCart(localCart ?? remoteCart ?? []);
        if (!cancelled) setIsLoaded(true);
      }
    }

    void loadCart();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save locally immediately and debounce remote backup writes.
  useEffect(() => {
    if (!isLoaded || !sessionId) return;
    try {
      window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('Could not save cart in this browser:', err);
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      let synced = false;
      try {
        setIsCloudSynced(false);
        const response = await fetch('/api/cart/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, items: cart }),
        });
        const result = await response.json().catch(() => ({}));
        synced = response.ok && result?.success === true;
      } catch {
        synced = false;
      }
      if (!synced) {
        try {
          const response = await fetch('/api/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart }),
          });
          synced = response.ok;
        } catch {
          synced = false;
        }
      }
      setIsCloudSynced(synced);
    }, 700);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [cart, isLoaded, sessionId]);

  const addToCart = useCallback((product: Product) => {
    const normalizedProduct = normalizeCartItem(product);
    if (!normalizedProduct) return;
    setCart((prev) => [...prev, normalizedProduct]);
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    if (sessionId) {
      fetch(`/api/cart/session?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }, [sessionId]);

  const cartCount = useMemo(() => cart.length, [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, product) => sum + (Number(product?.price) || 0), 0),
    [cart],
  );

  const value = useMemo(
    () => ({ cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal, sessionId, isCloudSynced }),
    [cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal, sessionId, isCloudSynced],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
