import { NextRequest, NextResponse } from 'next/server';
import {
  getAllOrders,
  createOrder,
  getOrCreateCustomer,
  getOrderStats,
  getOrdersByDay,
  getOrdersByNeighborhood,
  getTopProducts,
  getCustomerFrequency,
  checkConnection,
} from '@/lib/db';

// GET /api/orders - Listar todos los pedidos y estadísticas
export async function GET(request: NextRequest) {
  try {
    // Verificar conexión primero
    const isConnected = await checkConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database not configured', needsSetup: true },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include');

    // Si solicitan estadísticas completas
    if (include === 'stats') {
      const [
        orders,
        stats,
        ordersByDay,
        ordersByNeighborhood,
        topProducts,
        customerFrequency,
      ] = await Promise.all([
        getAllOrders(),
        getOrderStats(),
        getOrdersByDay(30),
        getOrdersByNeighborhood(),
        getTopProducts(10),
        getCustomerFrequency(),
      ]);

      return NextResponse.json({
        orders,
        stats,
        ordersByDay,
        ordersByNeighborhood,
        topProducts,
        customerFrequency,
      });
    }

    // Solo pedidos
    const orders = await getAllOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    // Verificar conexión
    const isConnected = await checkConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database not configured', needsSetup: true },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      orderNumber,
      customerPhone,
      customerName,
      customerEmail,
      address,
      neighborhood,
      city,
      notes,
      items,
      subtotal,
      deliveryCost,
      total,
      deliveryMethod,
      paymentMethod,
    } = body;

    // Validaciones básicas
    if (!orderNumber || !customerPhone || !customerName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Crear u obtener cliente
    const customer = await getOrCreateCustomer(customerPhone, customerName, customerEmail);

    // Crear el pedido
    const order = await createOrder({
      orderNumber,
      customerId: customer.id,
      address,
      neighborhood,
      city,
      notes,
      items,
      subtotal,
      deliveryCost,
      total,
      deliveryMethod,
      paymentMethod,
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order, customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
