-- ============================================
-- Schema para DISLUNA Marketplace
-- Compatible con PostgreSQL (Neon)
-- ============================================

-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabla: customers
-- ============================================
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

-- Índice para búsqueda por teléfono
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================
-- Tabla: orders
-- ============================================
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

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ============================================
-- Tabla: order_items
-- ============================================
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

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);

-- ============================================
-- Funciones útiles
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Vistas útiles para el dashboard
-- ============================================

-- Vista de pedidos con info del cliente
CREATE OR REPLACE VIEW orders_with_customer AS
SELECT 
    o.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- Vista de estadísticas diarias
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as orders_count,
    COALESCE(SUM(total), 0) as revenue
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Vista de productos más vendidos
CREATE OR REPLACE VIEW top_products AS
SELECT 
    sku,
    name,
    SUM(quantity) as total_quantity,
    SUM(price * quantity) as total_revenue
FROM order_items
GROUP BY sku, name
ORDER BY total_quantity DESC;

-- Vista de clientes frecuentes
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
    c.id as customer_id,
    c.name,
    c.phone,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total), 0) as total_spent,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.phone
ORDER BY total_spent DESC;

-- ============================================
-- Datos de ejemplo (opcional, para testing)
-- ============================================

-- Insertar cliente de prueba (descomentar si se necesita)
-- INSERT INTO customers (phone, name, email, address, neighborhood) 
-- VALUES ('3123456789', 'Cliente de Prueba', 'test@example.com', 'Calle 10 #5-45', 'Centro')
-- ON CONFLICT (phone) DO NOTHING;
