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

interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CustomerContextType {
  customers: Customer[];
  getOrCreateCustomerId: (phone: string, name: string, email: string) => string;
  getCustomerByPhone: (phone: string) => Customer | undefined;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const CUSTOMERS_STORAGE_KEY = "disluna_customers";

interface CustomerProviderProps {
  children: ReactNode;
}

export function CustomerProvider({ children }: CustomerProviderProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomers(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading customers from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
      } catch (error) {
        console.error("Error saving customers to localStorage:", error);
      }
    }
  }, [customers, isHydrated]);

  const getOrCreateCustomerId = useCallback(
    (phone: string, name: string, email: string): string => {
      // Limpiar el teléfono (solo números)
      const cleanPhone = phone.replace(/\D/g, "");

      // Buscar si ya existe
      const existingCustomer = customers.find(
        (c) => c.phone.replace(/\D/g, "") === cleanPhone
      );

      if (existingCustomer) {
        return existingCustomer.id;
      }

      // Crear nuevo cliente con ID secuencial
      const nextId = customers.length + 1;
      const customerId = nextId.toString().padStart(2, "0");

      const newCustomer: Customer = {
        id: customerId,
        phone: phone,
        name: name,
        email: email,
        createdAt: new Date().toISOString(),
      };

      setCustomers((prev) => [...prev, newCustomer]);
      return customerId;
    },
    [customers]
  );

  const getCustomerByPhone = useCallback(
    (phone: string): Customer | undefined => {
      const cleanPhone = phone.replace(/\D/g, "");
      return customers.find((c) => c.phone.replace(/\D/g, "") === cleanPhone);
    },
    [customers]
  );

  const value = useMemo(
    () => ({
      customers,
      getOrCreateCustomerId,
      getCustomerByPhone,
    }),
    [customers, getOrCreateCustomerId, getCustomerByPhone]
  );

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers(): CustomerContextType {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error("useCustomers must be used within a CustomerProvider");
  }
  return context;
}
