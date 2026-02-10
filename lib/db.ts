import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// ============================================
// Conexión lazy a la base de datos
// ============================================

let sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!sql && process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export { getSql };

// ============================================
// Tipos
// ============================================

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
  customerId: number;
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

export interface Customer {
  id: number;
  phone: string;
  name: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  createdAt: string;
}

// ============================================
// Funciones de Clientes
// ============================================

export async function getOrCreateCustomer(
  phone: string,
  name: string,
  email?: string
): Promise<Customer> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  // Buscar cliente existente
  const existing = await db`
    SELECT * FROM customers 
    WHERE phone = ${phone}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const customer = existing[0];
    return {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      address: customer.address,
      neighborhood: customer.neighborhood,
      city: customer.city,
      createdAt: customer.created_at,
    };
  }

  // Crear nuevo cliente
  const result = await db`
    INSERT INTO customers (phone, name, email)
    VALUES (${phone}, ${name}, ${email || null})
    RETURNING *
  `;

  const customer = result[0];
  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    email: customer.email,
    address: customer.address,
    neighborhood: customer.neighborhood,
    city: customer.city,
    createdAt: customer.created_at,
  };
}

// ============================================
// Funciones de Pedidos
// ============================================

export async function createOrder(orderData: {
  orderNumber: string;
  customerId: number;
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
}): Promise<Order | null> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  // Crear el pedido
  const orderResult = await db`
    INSERT INTO orders (
      order_number, customer_id, address, neighborhood, city, notes,
      subtotal, delivery_cost, total, delivery_method, payment_method
    ) VALUES (
      ${orderData.orderNumber}, ${orderData.customerId}, ${orderData.address}, 
      ${orderData.neighborhood}, ${orderData.city}, ${orderData.notes || null},
      ${orderData.subtotal}, ${orderData.deliveryCost}, ${orderData.total},
      ${orderData.deliveryMethod}, ${orderData.paymentMethod}
    )
    RETURNING *
  `;

  const order = orderResult[0];
  const orderId = order.id;

  // Insertar items del pedido
  for (const item of orderData.items) {
    await db`
      INSERT INTO order_items (
        order_id, sku, name, price, quantity, type, units_per_box, image
      ) VALUES (
        ${orderId}, ${item.sku}, ${item.name}, ${item.price}, 
        ${item.quantity}, ${item.type}, ${item.unitsPerBox || null}, ${item.image || null}
      )
    `;
  }

  return getOrderById(orderId);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  const result = await db`
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ${orderId}
    LIMIT 1
  `;

  if (result.length === 0) return null;

  const order = result[0];
  const items = await getOrderItems(orderId);

  return formatOrder(order, items);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  const result = await db`
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.order_number = ${orderNumber}
    LIMIT 1
  `;

  if (result.length === 0) return null;

  const order = result[0];
  const items = await getOrderItems(order.id);

  return formatOrder(order, items);
}

export async function getAllOrders(): Promise<Order[]> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  const orders = await db`
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `;

  const result: Order[] = [];
  for (const order of orders) {
    const items = await getOrderItems(order.id);
    result.push(formatOrder(order, items));
  }

  return result;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<Order | null> {
  const db = getSql();
  if (!db) throw new Error('Database not configured');

  const result = await db`
    UPDATE orders 
    SET status = ${status}
    WHERE id = ${orderId}
    RETURNING *
  `;

  if (result.length === 0) return null;

  return getOrderById(orderId);
}

async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const db = getSql();
  if (!db) return [];

  const items = await db`
    SELECT * FROM order_items
    WHERE order_id = ${orderId}
  `;

  return items.map(item => ({
    sku: item.sku,
    name: item.name,
    price: parseFloat(item.price),
    quantity: item.quantity,
    type: item.type,
    unitsPerBox: item.units_per_box,
    image: item.image,
  }));
}

function formatOrder(order: any, items: OrderItem[]): Order {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    address: order.address,
    neighborhood: order.neighborhood,
    city: order.city,
    notes: order.notes,
    items,
    subtotal: parseFloat(order.subtotal),
    deliveryCost: parseFloat(order.delivery_cost),
    total: parseFloat(order.total),
    deliveryMethod: order.delivery_method,
    paymentMethod: order.payment_method,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

// ============================================
// Estadísticas
// ============================================

export async function getOrderStats(): Promise<{
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  averageOrderValue: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
}> {
  const db = getSql();
  if (!db) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      todayOrders: 0,
      todayRevenue: 0,
    };
  }

  const stats = await db`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total), 0) as total_revenue,
      COUNT(DISTINCT customer_id) as total_customers,
      COALESCE(AVG(total), 0) as average_order_value,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_orders,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total ELSE 0 END), 0) as today_revenue
    FROM orders
  `;

  const s = stats[0];
  return {
    totalOrders: parseInt(s.total_orders),
    totalRevenue: parseFloat(s.total_revenue),
    totalCustomers: parseInt(s.total_customers),
    averageOrderValue: parseFloat(s.average_order_value),
    pendingOrders: parseInt(s.pending_orders),
    todayOrders: parseInt(s.today_orders),
    todayRevenue: parseFloat(s.today_revenue),
  };
}

export async function getOrdersByDay(days: number = 30): Promise<{
  date: string;
  orders: number;
  revenue: number;
}[]> {
  const db = getSql();
  if (!db) return [];

  const result = await db`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE created_at >= CURRENT_DATE - ${days}::integer * INTERVAL '1 day'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Fill missing days with zeros
  const data: { date: string; orders: number; revenue: number }[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const existing = result.find((r: any) => {
      const rDate = new Date(r.date).toISOString().split('T')[0];
      return rDate === dateStr;
    });
    
    data.push({
      date: dateStr,
      orders: existing ? parseInt(existing.orders) : 0,
      revenue: existing ? parseFloat(existing.revenue) : 0,
    });
  }

  return data;
}

export async function getOrdersByNeighborhood(): Promise<{
  neighborhood: string;
  orders: number;
  revenue: number;
}[]> {
  const db = getSql();
  if (!db) return [];

  const result = await db`
    SELECT 
      COALESCE(NULLIF(neighborhood, ''), 'Sin barrio') as neighborhood,
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    GROUP BY COALESCE(NULLIF(neighborhood, ''), 'Sin barrio')
    ORDER BY orders DESC
  `;

  return result.map(r => ({
    neighborhood: r.neighborhood,
    orders: parseInt(r.orders),
    revenue: parseFloat(r.revenue),
  }));
}

export async function getTopProducts(limit: number = 10): Promise<{
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
}[]> {
  const db = getSql();
  if (!db) return [];

  const result = await db`
    SELECT 
      name,
      sku,
      SUM(quantity) as quantity,
      SUM(price * quantity) as revenue
    FROM order_items
    GROUP BY name, sku
    ORDER BY quantity DESC
    LIMIT ${limit}
  `;

  return result.map(r => ({
    name: r.name,
    sku: r.sku,
    quantity: parseInt(r.quantity),
    revenue: parseFloat(r.revenue),
  }));
}

export async function getCustomerFrequency(): Promise<{
  customerId: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
}[]> {
  const db = getSql();
  if (!db) return [];

  const result = await db`
    SELECT 
      c.id::text as customer_id,
      c.name,
      c.phone,
      COUNT(o.id) as orders,
      COALESCE(SUM(o.total), 0) as total_spent
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name, c.phone
    HAVING COUNT(o.id) > 0
    ORDER BY total_spent DESC
  `;

  return result.map(r => ({
    customerId: r.customer_id,
    name: r.name,
    phone: r.phone,
    orders: parseInt(r.orders),
    totalSpent: parseFloat(r.total_spent),
  }));
}

// ============================================
// Verificar conexión
// ============================================

export async function checkConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  
  try {
    const db = getSql();
    if (!db) return false;
    await db`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}
