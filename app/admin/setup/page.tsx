"use client";

import { useEffect, useState } from "react";
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Copy,
  ExternalLink,
  Server,
  Check,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function SetupPage() {
  const [status, setStatus] = useState<"checking" | "connected" | "not_configured" | "error">("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/orders");
      if (response.status === 503) {
        setStatus("not_configured");
      } else if (response.ok) {
        setStatus("connected");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("not_configured");
    }
  };

  const copySchema = () => {
    const schema = `-- Copia este código en tu consola SQL de Neon

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    neighborhood VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Ibagué',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    neighborhood VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Ibagué',
    notes TEXT,
    subtotal DECIMAL(12, 2) NOT NULL,
    delivery_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'pse')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('unit', 'box')),
    units_per_box INTEGER,
    image VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`;

    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando conexión...</p>
        </div>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Base de datos conectada!</h1>
            <p className="text-gray-600 mb-6">
              Tu base de datos PostgreSQL está funcionando correctamente. Los pedidos se guardarán de forma persistente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Database className="w-5 h-5" />
                Ir al Dashboard
              </Link>
              <button
                onClick={checkConnection}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Verificar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Configurar Base de Datos
          </h1>
          <p className="text-gray-600 mt-2">
            Sigue estos pasos para configurar PostgreSQL y tener pedidos persistentes.
          </p>
        </div>

        {/* Alerta */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Base de datos no configurada</p>
              <p className="text-sm text-amber-700 mt-1">
                Actualmente los pedidos se guardan solo en el navegador del cliente. Configura PostgreSQL 
                para tener una base de datos persistente compartida.
              </p>
            </div>
          </div>
        </div>

        {/* Pasos */}
        <div className="space-y-6">
          {/* Paso 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Crear cuenta en Neon</h2>
                  <p className="text-sm text-gray-500">PostgreSQL serverless gratuito</p>
                </div>
              </div>
              
              <div className="ml-14 space-y-3">
                <a
                  href="https://neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ir a neon.tech
                </a>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Regístrate con GitHub o email
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Crea un nuevo proyecto (gratis hasta 500MB)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Elige la región más cercana (US East recomendado para Vercel)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Crear las tablas</h2>
                  <p className="text-sm text-gray-500">Ejecuta el schema SQL</p>
                </div>
              </div>
              
              <div className="ml-14 space-y-4">
                <div className="bg-gray-900 rounded-lg p-4 relative">
                  <button
                    onClick={copySchema}
                    className="absolute top-3 right-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    title="Copiar SQL"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    <code>{`-- En Neon Dashboard → SQL Editor
-- Pega y ejecuta este código:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customers (...);
CREATE TABLE IF NOT EXISTS orders (...);
CREATE TABLE IF NOT EXISTS order_items (...);`}</code>
                  </pre>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    En tu proyecto Neon, ve a <strong>SQL Editor</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Copia el código completo del archivo <code className="bg-gray-100 px-2 py-0.5 rounded">db/schema.sql</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Pégalo y haz clic en <strong>Run</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Obtener URL de conexión</h2>
                  <p className="text-sm text-gray-500">Para conectar con Vercel</p>
                </div>
              </div>
              
              <div className="ml-14 space-y-3">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    En Neon, ve a <strong>Dashboard → Connection Details</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Copia la <strong>Connection String</strong> (formato: postgres://...)
                  </li>
                </ul>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Asegúrate de usar la URL de conexión con contraseña incluida.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  4
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Configurar en Vercel</h2>
                  <p className="text-sm text-gray-500">Variable de entorno DATABASE_URL</p>
                </div>
              </div>
              
              <div className="ml-14 space-y-3">
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Ve a tu proyecto en <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com</a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <strong>Settings → Environment Variables</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Agrega variable: <code className="bg-gray-100 px-2 py-0.5 rounded">DATABASE_URL</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Pega la URL de conexión de Neon
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Haz clic en <strong>Save</strong> y re-deploy
                  </li>
                </ul>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs text-gray-700">
                  DATABASE_URL=postgresql://usuario:contraseña@host.neon.tech/dbname?sslmode=require
                </div>
              </div>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  ✓
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Verificar conexión</h2>
                  <p className="text-sm text-gray-500">Confirma que todo funciona</p>
                </div>
              </div>
              
              <div className="ml-14">
                <button
                  onClick={checkConnection}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Verificar ahora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-8 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 border border-primary/10">
          <div className="flex items-start gap-4">
            <Server className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">¿Por qué necesito esto?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Sin una base de datos, los pedidos se guardan solo en el navegador de cada cliente. 
                Esto significa que:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Si el cliente borra su historial, pierde el pedido
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  El admin no ve pedidos desde otros dispositivos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  No hay persistencia real entre sesiones
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
