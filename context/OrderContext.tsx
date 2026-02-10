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

export interface OrderItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  type: "unit" | "box";
  unitsPerBox?: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  neighborhood: string;
  city: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  deliveryMethod: "pickup" | "delivery";
  paymentMethod: "cash" | "transfer" | "pse";
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageOrderValue: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

interface OrdersByDay {
  date: string;
  orders: number;
  revenue: number;
}

interface OrdersByNeighborhood {
  neighborhood: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order["status"]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByCustomerId: (customerId: string) => Order[];
  getOrdersByStatus: (status: Order["status"]) => Order[];
  stats: OrderStats;
  ordersByDay: OrdersByDay[];
  ordersByNeighborhood: OrdersByNeighborhood[];
  topProducts: TopProduct[];
  recentOrders: Order[];
  customerFrequency: { customerId: string; name: string; phone: string; orders: number; totalSpent: number }[];
  isLoading: boolean;
  isDbConnected: boolean | null;
  error: string | null;
  refreshData: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const ORDERS_STORAGE_KEY = "disluna_orders";

interface OrderProviderProps {
  children: ReactNode;
}

// API base URL
const API_BASE = "/api/orders";

export function OrderProvider({ children }: OrderProviderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}?include=stats`);
      
      if (response.status === 503) {
        // DB no configurada, usar localStorage
        const data = await response.json();
        if (data.needsSetup) {
          setIsDbConnected(false);
          setUsingLocalStorage(true);
          // Cargar desde localStorage
          const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setOrders(parsed);
            }
          }
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setIsDbConnected(true);
      setUsingLocalStorage(false);
      
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Error al cargar los pedidos');
      // Fallback a localStorage
      setUsingLocalStorage(true);
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        } catch {
          // ignore parse error
        }
      }
    } finally {
      setIsLoading(false);
      setIsHydrated(true);
    }
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persistir a localStorage si estamos usando modo offline
  useEffect(() => {
    if (isHydrated && usingLocalStorage) {
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
      } catch (error) {
        console.error("Error saving orders to localStorage:", error);
      }
    }
  }, [orders, isHydrated, usingLocalStorage]);

  const addOrder = useCallback(
    async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">): Promise<Order> => {
      const now = new Date().toISOString();
      
      if (usingLocalStorage || !isDbConnected) {
        // Modo offline - guardar en localStorage
        const newOrder: Order = {
          ...orderData,
          id: `ORD-${Date.now()}`,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        setOrders((prev) => [newOrder, ...prev]);
        return newOrder;
      }

      // Modo online - guardar en DB via API
      try {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create order');
        }

        const { order } = await response.json();
        
        // Transformar formato de la API al formato del contexto
        const newOrder: Order = {
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId.toString(),
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          address: order.address,
          neighborhood: order.neighborhood,
          city: order.city,
          notes: order.notes,
          items: order.items,
          subtotal: order.subtotal,
          deliveryCost: order.deliveryCost,
          total: order.total,
          deliveryMethod: order.deliveryMethod,
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };

        setOrders((prev) => [newOrder, ...prev]);
        return newOrder;
      } catch (error) {
        console.error('Error creating order:', error);
        // Fallback a localStorage
        const newOrder: Order = {
          ...orderData,
          id: `ORD-${Date.now()}`,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
        setOrders((prev) => [newOrder, ...prev]);
        return newOrder;
      }
    },
    [usingLocalStorage, isDbConnected]
  );

  const updateOrderStatus = useCallback(async (orderId: string, status: Order["status"]) => {
    if (usingLocalStorage || !isDbConnected) {
      // Modo offline
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );
      return;
    }

    // Modo online
    try {
      const response = await fetch(`${API_BASE}/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      // Actualizar estado local
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );
    } catch (error) {
      console.error('Error updating order:', error);
      // Fallback a localStorage
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order
        )
      );
    }
  }, [usingLocalStorage, isDbConnected]);

  const getOrderById = useCallback(
    (orderId: string) => orders.find((o) => o.id === orderId),
    [orders]
  );

  const getOrdersByCustomerId = useCallback(
    (customerId: string) => orders.filter((o) => o.customerId === customerId),
    [orders]
  );

  const getOrdersByStatus = useCallback(
    (status: Order["status"]) => orders.filter((o) => o.status === status),
    [orders]
  );

  // Stats calculations (funcionan tanto para API como localStorage)
  const stats = useMemo((): OrderStats => {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
    
    const uniqueCustomers = new Set(orders.map((o) => o.customerId));
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      totalOrders: orders.length,
      totalRevenue,
      totalCustomers: uniqueCustomers.size,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
    };
  }, [orders]);

  // Orders by day (last 30 days)
  const ordersByDay = useMemo((): OrdersByDay[] => {
    const days: Record<string, { orders: number; revenue: number }> = {};
    
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      days[dateStr] = { orders: 0, revenue: 0 };
    }

    // Fill with actual orders
    orders.forEach((order) => {
      const dateStr = order.createdAt.split("T")[0];
      if (days[dateStr]) {
        days[dateStr].orders++;
        days[dateStr].revenue += order.total;
      }
    });

    return Object.entries(days).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [orders]);

  // Orders by neighborhood
  const ordersByNeighborhood = useMemo((): OrdersByNeighborhood[] => {
    const neighborhoods: Record<string, { orders: number; revenue: number }> = {};
    
    orders.forEach((order) => {
      const neighborhood = order.neighborhood || "Sin barrio";
      if (!neighborhoods[neighborhood]) {
        neighborhoods[neighborhood] = { orders: 0, revenue: 0 };
      }
      neighborhoods[neighborhood].orders++;
      neighborhoods[neighborhood].revenue += order.total;
    });

    return Object.entries(neighborhoods)
      .map(([neighborhood, data]) => ({
        neighborhood,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // Top products
  const topProducts = useMemo((): TopProduct[] => {
    const products: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};
    
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!products[item.sku]) {
          products[item.sku] = {
            name: item.name,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          };
        }
        products[item.sku].quantity += item.quantity;
        products[item.sku].revenue += item.price * item.quantity;
      });
    });

    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orders]);

  // Recent orders (last 10)
  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  // Customer frequency
  const customerFrequency = useMemo(() => {
    const customers: Record<string, { customerId: string; name: string; phone: string; orders: number; totalSpent: number }> = {};
    
    orders.forEach((order) => {
      if (!customers[order.customerId]) {
        customers[order.customerId] = {
          customerId: order.customerId,
          name: order.customerName,
          phone: order.customerPhone,
          orders: 0,
          totalSpent: 0,
        };
      }
      customers[order.customerId].orders++;
      customers[order.customerId].totalSpent += order.total;
    });

    return Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Refresh data from API
  const refreshData = useCallback(async () => {
    if (usingLocalStorage || !isDbConnected) {
      return; // No hay nada que refrescar en modo offline
    }
    await loadData();
  }, [loadData, usingLocalStorage, isDbConnected]);

  const value = useMemo(
    () => ({
      orders,
      addOrder,
      updateOrderStatus,
      getOrderById,
      getOrdersByCustomerId,
      getOrdersByStatus,
      stats,
      ordersByDay,
      ordersByNeighborhood,
      topProducts,
      recentOrders,
      customerFrequency,
      isLoading,
      isDbConnected,
      error,
      refreshData,
    }),
    [
      orders,
      addOrder,
      updateOrderStatus,
      getOrderById,
      getOrdersByCustomerId,
      getOrdersByStatus,
      stats,
      ordersByDay,
      ordersByNeighborhood,
      topProducts,
      recentOrders,
      customerFrequency,
      isLoading,
      isDbConnected,
      error,
      refreshData,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextType {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within a OrderProvider");
  }
  return context;
}
