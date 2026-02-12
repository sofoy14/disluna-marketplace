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
import { products as initialProducts } from "@/data/products";

export interface Product {
  sku: string;
  name: string;
  category: string;
  size: string;
  unitPrice: number;
  boxPrice: number;
  unitsPerBox: number;
  image?: string;
  description?: string;
}

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "sku">) => void;
  updateProduct: (sku: string, product: Partial<Product>) => void;
  deleteProduct: (sku: string) => void;
  getProductBySku: (sku: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];
  categories: string[];
  searchProducts: (query: string) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const PRODUCTS_STORAGE_KEY = "disluna_products";
const PRODUCTS_LOADED_KEY = "disluna_products_loaded";

interface ProductProviderProps {
  children: ReactNode;
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount, or load initial products
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setIsHydrated(true);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading products from localStorage:", error);
    }

    // Load initial products if nothing in storage
    setProducts(initialProducts);
    setIsHydrated(true);

    // Mark as loaded so we don't overwrite
    if (typeof window !== "undefined") {
      localStorage.setItem(PRODUCTS_LOADED_KEY, "true");
    }
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isHydrated && products.length > 0) {
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      } catch (error) {
        console.error("Error saving products to localStorage:", error);
      }
    }
  }, [products, isHydrated]);

  const addProduct = useCallback((productData: Omit<Product, "sku">) => {
    const newProduct: Product = {
      ...productData,
      sku: Date.now().toString(), // Generate unique SKU based on timestamp
    };

    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const updateProduct = useCallback((sku: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.sku === sku ? { ...product, ...updates } : product
      )
    );
  }, []);

  const deleteProduct = useCallback((sku: string) => {
    setProducts((prev) => prev.filter((product) => product.sku !== sku));
  }, []);

  const getProductBySku = useCallback(
    (sku: string) => products.find((p) => p.sku === sku),
    [products]
  );

  const getProductsByCategory = useCallback(
    (category: string) => products.filter((p) => p.category === category),
    [products]
  );

  const searchProducts = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.sku.includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery)
      );
    },
    [products]
  );

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductBySku,
      getProductsByCategory,
      categories,
      searchProducts,
    }),
    [
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductBySku,
      getProductsByCategory,
      categories,
      searchProducts,
    ]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts(): ProductContextType {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
