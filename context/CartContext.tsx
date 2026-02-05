"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";

export interface Product {
  sku: string;
  name: string;
  price: number;
  image?: string;
  unitsPerBox?: number;
}

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  type: "unit" | "box";
  unitsPerBox?: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, type: "unit" | "box", quantity: number) => void;
  removeItem: (sku: string, type: "unit" | "box") => void;
  updateQuantity: (sku: string, type: "unit" | "box", quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "disluna_cart";

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Error saving cart to localStorage:", error);
      }
    }
  }, [items, isHydrated]);

  const addItem = useCallback(
    (product: Product, type: "unit" | "box", quantity: number) => {
      if (quantity <= 0) return;

      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex(
          (item) => item.sku === product.sku && item.type === type
        );

        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }

        // Add new item
        return [
          ...currentItems,
          {
            sku: product.sku,
            name: product.name,
            price: product.price,
            quantity,
            type,
            unitsPerBox: product.unitsPerBox,
            image: product.image,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((sku: string, type: "unit" | "box") => {
    setItems((currentItems) =>
      currentItems.filter((item) => !(item.sku === sku && item.type === type))
    );
  }, []);

  const updateQuantity = useCallback(
    (sku: string, type: "unit" | "box", quantity: number) => {
      if (quantity <= 0) {
        removeItem(sku, type);
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.sku === sku && item.type === type
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => {
      // item.price ya es el precio correcto (unitPrice o boxPrice)
      return sum + item.price * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isHydrated,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
