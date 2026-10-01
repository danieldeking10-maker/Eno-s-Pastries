'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Product } from './ProductCard';

type CartContextType = {
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
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
    const stored = window.localStorage.getItem(LOCAL_CART_KEY);
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleWindowError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleWindowError);
    return () => window.removeEventListener('error', handleWindowError);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      let remoteCart: Product[] | null = null;
      try {
        const response = await fetch('/api/cart', { cache: 'no-store' });
        if (!response.ok) throw new Error('Cart storage is unavailable');
        const data = await response.json().catch(() => ({}));
        remoteCart = Array.isArray(data?.cart)
          ? data.cart
              .map(normalizeCartItem)
              .filter((item: Product | null): item is Product => item !== null)
          : [];
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('Could not save cart in this browser:', err);
    }
    void fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart }),
    }).then((response) => {
      if (!response.ok) throw new Error('Cart storage is unavailable');
    }).catch(() => {
      console.warn("Cart storage unavailable; changes are saved in this browser.");
    });
  }, [cart, isLoaded]);

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
  }, []);

  const cartCount = useMemo(() => cart.length, [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, product) => sum + (Number(product?.price) || 0), 0),
    [cart],
  );

  const value = useMemo(
    () => ({ cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal }),
    [cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal],
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
