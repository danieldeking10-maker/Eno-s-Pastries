'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product } from './ProductCard';

type CartContextType = {
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
};

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
    try {
      if (typeof window !== 'undefined') {
        const savedCart = localStorage.getItem('enosPastriesCart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            const normalizedCart = parsed
              .map(normalizeCartItem)
              .filter((item): item is Product => item !== null);
            setCart(normalizedCart);
          }
        }
      }
    } catch (err) {
      console.error('Error loading cart from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('enosPastriesCart', JSON.stringify(cart));
      }
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
    }
  }, [cart, isLoaded]);

  const addToCart = (product: Product) => {
    const normalizedProduct = normalizeCartItem(product);
    if (!normalizedProduct) return;
    setCart((prev) => [...prev, normalizedProduct]);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.length;
  const cartTotal = cart.reduce((sum, product) => sum + (Number(product?.price) || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal }}>
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
