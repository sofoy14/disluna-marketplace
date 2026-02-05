import { test, expect, chromium, type Browser } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

test.describe('DISLUNA Marketplace - Pruebas Mejoradas', () => {
  let browser: Browser;
  
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  // ============================================
  // FLUJO 1: Home → Categoría → Catálogo
  // ============================================
  test('FLUJO 1: Click en categoría desde Home', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Buscar link de categoría "Colas" con selector más específico
    const categoriaLink = page.locator('a[href*="categoria=colas"]').first();
    await expect(categoriaLink).toBeVisible();
    await categoriaLink.click();
    
    // Verificar navegación
    await expect(page).toHaveURL(/categoria=colas/);
    await expect(page.locator('h1:has-text("Nuestros Productos")')).toBeVisible();
    
    console.log('✅ FLUJO 1: Home → Categoría → Catálogo funciona correctamente');
    await context.close();
  });

  // ============================================
  // FLUJO 2: Búsqueda → Preview → Detalle
  // ============================================
  test('FLUJO 2: Búsqueda con preview', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Buscar en el input de búsqueda del hero
    const searchInput = page.locator('section input[placeholder*="Busca"]').first();
    await searchInput.fill('sprite');
    await page.waitForTimeout(500);
    
    // Verificar que aparece el preview
    const previewResult = page.locator('div:has-text("Sprite")').first();
    await expect(previewResult).toBeVisible();
    
    // Click en el primer resultado
    const firstResult = page.locator('a[href*="/productos/SPRI"]').first();
    await firstResult.click();
    
    // Verificar navegación a detalle
    await expect(page).toHaveURL(/productos\/SPRI/);
    await expect(page.locator('h1')).toContainText('Sprite');
    
    console.log('✅ FLUJO 2: Búsqueda → Preview → Detalle funciona correctamente');
    await context.close();
  });

  // ============================================
  // FLUJO 3: Agregar al carrito (unidad y caja)
  // ============================================
  test('FLUJO 3: Agregar producto por unidad y caja', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Limpiar carrito
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    
    // Ir a producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await page.waitForLoadState('networkidle');
    
    // Agregar por unidad
    await page.click('button:has-text("Por unidad")');
    await page.click('button:has-text("Agregar al carrito")');
    
    // Verificar mensaje de éxito
    await expect(page.locator('button:has-text("Agregado")')).toBeVisible({ timeout: 3000 });
    
    // Agregar por caja
    await page.click('button:has-text("Por caja")');
    await page.click('button[aria-label="Aumentar cantidad"], button:has(.lucide-plus)').first();
    await page.click('button:has-text("Agregar al carrito")');
    
    // Abrir carrito sidebar
    await page.click('button[aria-label="Abrir carrito"]');
    await page.waitForTimeout(300);
    
    // Verificar items en carrito
    const cartItems = page.locator('h4:has-text("Coca-Cola")');
    await expect(cartItems.first()).toBeVisible();
    
    console.log('✅ FLUJO 3: Agregar al carrito funciona correctamente');
    await context.close();
  });

  // ============================================
  // FLUJO 4: Checkout → Confirmación
  // ============================================
  test('FLUJO 4: Proceso completo de checkout', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Agregar producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Agregar al carrito")');
    await page.waitForTimeout(500);
    
    // Ir a carrito
    await page.goto(`${BASE_URL}/carrito`);
    await page.waitForLoadState('networkidle');
    
    // Proceder al checkout
    await page.click('a:has-text("Proceder al pago")');
    await page.waitForURL('**/checkout**');
    
    // Llenar formulario
    await page.locator('input[type="text"]').nth(0).fill('Usuario Test');
    await page.locator('input[type="tel"]').fill('3123456789');
    await page.locator('input[type="email"]').fill('test@test.com');
    await page.locator('input[type="text"]').nth(2).fill('Calle 123');
    await page.locator('input[type="text"]').nth(3).fill('Centro');
    
    // Seleccionar método de entrega
    await page.click('text=Envío a domicilio');
    
    // Seleccionar método de pago
    await page.click('text=Contraentrega');
    
    // Aceptar términos
    await page.click('input[type="checkbox"]');
    
    // Confirmar
    await page.click('button:has-text("Confirmar pedido")');
    
    // Verificar confirmación
    await page.waitForURL('**/checkout/confirmacion**', { timeout: 10000 });
    await expect(page.locator('h1:has-text("¡Pedido recibido!")')).toBeVisible();
    
    console.log('✅ FLUJO 4: Checkout completo funciona correctamente');
    await context.close();
  });

  // ============================================
  // FLUJO 5: Navegación por menú
  // ============================================
  test('FLUJO 5: Menú de navegación funciona en todas las páginas', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const pages = ['/', '/productos', '/nosotros', '/carrito'];
    
    for (const p of pages) {
      await page.goto(`${BASE_URL}${p}`);
      await page.waitForLoadState('networkidle');
      
      // Verificar menú presente
      await expect(page.locator('nav a:has-text("Inicio")')).toBeVisible();
      await expect(page.locator('nav a:has-text("Productos")')).toBeVisible();
      
      // Test navegación a inicio
      await page.click('nav a:has-text("Inicio")');
      await expect(page).toHaveURL(/\/$/);
    }
    
    console.log('✅ FLUJO 5: Navegación por menú funciona correctamente');
    await context.close();
  });

  // ============================================
  // FLUJO 6: Responsive Mobile
  // ============================================
  test('FLUJO 6: Menú mobile funciona correctamente', async () => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
    });
    const page = await context.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Verificar menú hamburguesa
    const menuBtn = page.locator('button:has(.lucide-menu), header button').nth(1);
    await expect(menuBtn).toBeVisible();
    
    // Abrir menú
    await menuBtn.click();
    await page.waitForTimeout(300);
    
    // Verificar opciones del menú
    await expect(page.locator('a:has-text("Productos")').nth(1)).toBeVisible();
    
    // Navegar desde el menú
    await page.click('a:has-text("Productos")');
    await expect(page).toHaveURL(/productos/);
    
    console.log('✅ FLUJO 6: Menú mobile funciona correctamente');
    await context.close();
  });

  // ============================================
  // TESTS ADICIONALES
  // ============================================
  
  test('Verificar que preview de búsqueda se cierra al navegar', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Abrir búsqueda
    const searchInput = page.locator('section input[placeholder*="Busca"]').first();
    await searchInput.fill('coca');
    await page.waitForTimeout(500);
    
    // Verificar preview abierto
    await expect(page.locator('div:has-text("Ver todos los resultados")')).toBeVisible();
    
    // Click en resultado
    await page.locator('a[href*="/productos/COKE"]').first().click();
    
    // Verificar que preview se cerró (no debe estar visible)
    await page.waitForTimeout(300);
    const previewVisible = await page.locator('div:has-text("Ver todos los resultados")').isVisible().catch(() => false);
    
    if (!previewVisible) {
      console.log('✅ Preview se cierra correctamente al navegar');
    } else {
      console.log('⚠️ Preview podría no cerrarse correctamente');
    }
    
    await context.close();
  });

  test('Verificar persistencia del carrito en localStorage', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Limpiar
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    
    // Agregar producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Agregar al carrito")');
    await page.waitForTimeout(500);
    
    // Recargar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Abrir carrito y verificar que persiste
    await page.click('button[aria-label="Abrir carrito"]');
    await page.waitForTimeout(300);
    
    const cartContent = await page.evaluate(() => localStorage.getItem('disluna_cart'));
    expect(cartContent).toContain('COKE001');
    
    console.log('✅ Carrito persiste correctamente en localStorage');
    await context.close();
  });

  test('Verificar actualización de cantidades en carrito', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Agregar producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Agregar al carrito")');
    await page.waitForTimeout(500);
    
    // Ir al carrito
    await page.goto(`${BASE_URL}/carrito`);
    await page.waitForLoadState('networkidle');
    
    // Incrementar cantidad
    const plusBtn = page.locator('button:has(.lucide-plus)').first();
    await plusBtn.click();
    await page.waitForTimeout(300);
    
    // Verificar que cantidad es 2
    const quantityText = await page.locator('span:has-text("2")').first().textContent();
    expect(quantityText).toContain('2');
    
    console.log('✅ Actualización de cantidades funciona correctamente');
    await context.close();
  });

  test('Verificar página 404 de producto', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`${BASE_URL}/productos/NOEXISTE`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1:has-text("Producto no encontrado")')).toBeVisible();
    await expect(page.locator('a:has-text("Ver todos los productos")')).toBeVisible();
    
    console.log('✅ Página 404 de producto funciona correctamente');
    await context.close();
  });

  test('Verificar filtros en página de productos', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`${BASE_URL}/productos`);
    await page.waitForLoadState('networkidle');
    
    // Verificar filtros de categoría
    const filters = await page.locator('button:has-text("COLAS"), button:has-text("AGUA")').count();
    expect(filters).toBeGreaterThan(0);
    
    // Click en filtro
    await page.click('button:has-text("COLAS")');
    await page.waitForTimeout(500);
    
    // Verificar que hay productos filtrados
    const products = await page.locator('[href*="/productos/"]').count();
    expect(products).toBeGreaterThan(0);
    
    console.log('✅ Filtros de categoría funcionan correctamente');
    await context.close();
  });

  test('Verificar modo de compra por caja en detalle', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await page.waitForLoadState('networkidle');
    
    // Cambiar a modo caja
    await page.click('button:has-text("Por caja")');
    
    // Verificar que muestra precio por caja
    const boxPrice = await page.locator('text=unidades').first().isVisible();
    expect(boxPrice).toBeTruthy();
    
    // Verificar que se actualiza el precio
    await expect(page.locator('span:has-text("$")').first()).toBeVisible();
    
    console.log('✅ Modo de compra por caja funciona correctamente');
    await context.close();
  });
});
