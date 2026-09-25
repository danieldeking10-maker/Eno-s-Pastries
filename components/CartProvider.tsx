'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

  // Initialize session ID and cart from localStorage, fallback to cloud session
  useEffect(() => {
    let sid = '';
    try {
      if (typeof window !== 'undefined') {
        sid = localStorage.getItem('enosPastriesCartSessionId') || '';
        if (!sid) {
          sid = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('enosPastriesCartSessionId', sid);
        }
        setSessionId(sid);

        const savedCart = localStorage.getItem('enosPastriesCart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
            setIsLoaded(true);
            return;
          }
        }

        // If local storage is empty, check Supabase Storage cart bucket session
        if (sid) {
          fetch(`/api/cart/session?sessionId=${encodeURIComponent(sid)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data?.cartSession?.items && Array.isArray(data.cartSession.items) && data.cartSession.items.length > 0) {
                setCart(data.cartSession.items);
                localStorage.setItem('enosPastriesCart', JSON.stringify(data.cartSession.items));
              }
            })
            .catch(() => {})
            .finally(() => setIsLoaded(true));
          return;
        }
      }
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage and sync to Supabase cart storage bucket
  useEffect(() => {
    if (!isLoaded || !sessionId) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('enosPastriesCart', JSON.stringify(cart));
      }
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounced remote backup to Supabase cart-sessions bucket
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        setIsCloudSynced(false);
        await fetch('/api/cart/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            items: cart,
          }),
        });
        setIsCloudSynced(true);
      } catch {
        // Soft fail on network issues; localStorage retains user items
        setIsCloudSynced(false);
      }
    }, 700);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [cart, isLoaded, sessionId]);

  const addToCart = (product: Product) => {
    if (!product) return;
    setCart((prev) => [...prev, product]);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    if (sessionId) {
      fetch(`/api/cart/session?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  const cartCount = cart.length;
  const cartTotal = cart.reduce((sum, product) => sum + (Number(product?.price) || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
        sessionId,
        isCloudSynced,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
