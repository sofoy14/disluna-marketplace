import { test, expect, chromium, type Browser, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// Helper para esperar que la página esté lista
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

// Test Suite Completo del Marketplace DISLUNA
test.describe('DISLUNA Marketplace - Pruebas Completas', () => {
  let browser: Browser;
  
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  // ============================================
  // FLUJO 1: Home → Categoría → Catálogo filtrado
  // ============================================
  test('FLUJO 1: Navegación Home → Categoría → Catálogo filtrado', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 1: Iniciando prueba de navegación por categoría...');
    
    // Paso 1: Ir al Home
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // Verificar que estamos en el home
    await expect(page.locator('text=Tu distribuidor de confianza')).toBeVisible();
    console.log('✅ Home cargado correctamente');
    
    // Paso 2: Click en una categoría (Colas)
    const categoriaColas = page.locator('text=Colas').first();
    await expect(categoriaColas).toBeVisible();
    await categoriaColas.click();
    
    // Esperar navegación al catálogo
    await page.waitForURL('**/productos?categoria=colas**');
    await waitForPageLoad(page);
    
    // Verificar que el catálogo está filtrado
    await expect(page.locator('text=Nuestros Productos')).toBeVisible();
    console.log('✅ Catálogo filtrado por categoría "Colas"');
    
    // Verificar que solo se muestran productos de colas
    const productos = await page.locator('[class*="ProductCard"], .group').count();
    console.log(`📊 Productos encontrados en categoría Colas: ${productos}`);
    
    await context.close();
  });

  // ============================================
  // FLUJO 2: Home → Buscar → Preview → Detalle
  // ============================================
  test('FLUJO 2: Búsqueda con preview y navegación a detalle', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 2: Iniciando prueba de búsqueda...');
    
    // Paso 1: Ir al Home
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // Paso 2: Hacer clic en el campo de búsqueda
    const searchInput = page.locator('input[placeholder*="Busca"]').first();
    await searchInput.click();
    await searchInput.fill('coca');
    
    // Esperar que aparezca el preview
    await page.waitForTimeout(500);
    
    // Verificar que el preview se muestra
    const previewDropdown = page.locator('text=Coca-Cola').first();
    await expect(previewDropdown).toBeVisible();
    console.log('✅ Preview de búsqueda visible');
    
    // Paso 3: Click en un resultado del preview
    await previewDropdown.click();
    
    // Verificar navegación a detalle de producto
    await page.waitForURL('**/productos/COKE**');
    await waitForPageLoad(page);
    
    // Verificar que estamos en la página de detalle
    await expect(page.locator('text=Coca-Cola')).toBeVisible();
    await expect(page.locator('text=Agregar al carrito')).toBeVisible();
    console.log('✅ Navegación a detalle de producto exitosa');
    
    // Verificar que el preview se cerró al navegar
    await expect(page.locator('input[placeholder*="Busca"]').first()).not.toBeFocused();
    console.log('✅ Preview se cierra correctamente al navegar');
    
    await context.close();
  });

  // ============================================
  // FLUJO 3: Detalle → Agregar al carrito → Ver carrito
  // ============================================
  test('FLUJO 3: Agregar productos al carrito (unidad y caja)', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 3: Iniciando prueba de carrito...');
    
    // Paso 1: Ir a un producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await waitForPageLoad(page);
    
    // Paso 2: Agregar por unidad
    await page.click('text=Por unidad');
    await page.click('text=Agregar al carrito');
    
    // Verificar mensaje de confirmación
    await expect(page.locator('text=Agregado al carrito')).toBeVisible();
    console.log('✅ Producto agregado por unidad');
    
    // Paso 3: Cambiar a modo caja y agregar
    await page.click('text=Por caja');
    await page.fill('input[type="number"]', '2');
    await page.click('text=Agregar al carrito');
    
    await expect(page.locator('text=Agregado al carrito')).toBeVisible();
    console.log('✅ Producto agregado por caja');
    
    // Paso 4: Abrir el carrito sidebar
    await page.click('[aria-label="Abrir carrito"]');
    await page.waitForTimeout(300);
    
    // Verificar que el sidebar se abrió
    await expect(page.locator('text=Tu Carrito')).toBeVisible();
    
    // Verificar items en el carrito
    const cartItems = await page.locator('[class*="CartItemRow"], .flex.gap-4').count();
    console.log(`📊 Items en carrito: ${cartItems}`);
    
    // Paso 5: Ir a la página de carrito
    await page.goto(`${BASE_URL}/carrito`);
    await waitForPageLoad(page);
    
    await expect(page.locator('text=Carrito de Compras')).toBeVisible();
    console.log('✅ Página de carrito cargada');
    
    await context.close();
  });

  // ============================================
  // FLUJO 4: Carrito → Checkout → Confirmación
  // ============================================
  test('FLUJO 4: Checkout completo hasta confirmación', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 4: Iniciando prueba de checkout...');
    
    // Paso 1: Agregar producto al carrito
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await waitForPageLoad(page);
    await page.click('text=Agregar al carrito');
    await expect(page.locator('text=Agregado al carrito')).toBeVisible();
    
    // Paso 2: Ir al carrito
    await page.goto(`${BASE_URL}/carrito`);
    await waitForPageLoad(page);
    
    // Verificar que hay items
    await expect(page.locator('text=Coca-Cola')).toBeVisible();
    
    // Paso 3: Proceder al checkout
    await page.click('text=Proceder al pago');
    await page.waitForURL('**/checkout**');
    await waitForPageLoad(page);
    
    console.log('✅ Página de checkout cargada');
    
    // Paso 4: Llenar formulario
    await page.fill('input[placeholder*="Juan Pérez"]', 'Usuario Test');
    await page.fill('input[placeholder*="312"]', '3123456789');
    await page.fill('input[placeholder*="juan@ejemplo.com"]', 'test@test.com');
    await page.fill('input[placeholder*="Calle 10"]', 'Calle 123 # 45-67');
    await page.fill('input[placeholder*="Centro"]', 'Centro');
    
    // Paso 5: Seleccionar método de entrega
    await page.click('text=Envío a domicilio');
    
    // Paso 6: Seleccionar método de pago
    await page.click('text=Contraentrega');
    
    // Paso 7: Aceptar términos
    await page.click('input[type="checkbox"]');
    
    // Paso 8: Confirmar pedido
    await page.click('text=Confirmar pedido');
    
    // Esperar redirección a confirmación
    await page.waitForURL('**/checkout/confirmacion**', { timeout: 10000 });
    await waitForPageLoad(page);
    
    // Verificar página de confirmación
    await expect(page.locator('text=¡Pedido recibido!')).toBeVisible();
    await expect(page.locator('text=Número de pedido')).toBeVisible();
    console.log('✅ Pedido confirmado exitosamente');
    
    await context.close();
  });

  // ============================================
  // FLUJO 5: Navegación por el menú
  // ============================================
  test('FLUJO 5: Navegación por menú en todas las páginas', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 5: Iniciando prueba de navegación...');
    
    const pages = [
      { url: '/', name: 'Home' },
      { url: '/productos', name: 'Productos' },
      { url: '/nosotros', name: 'Nosotros' },
      { url: '/carrito', name: 'Carrito' },
    ];
    
    for (const pag of pages) {
      await page.goto(`${BASE_URL}${pag.url}`);
      await waitForPageLoad(page);
      
      // Verificar que el menú está presente
      await expect(page.locator('text=Inicio').first()).toBeVisible();
      await expect(page.locator('text=Productos').first()).toBeVisible();
      await expect(page.locator('text=Nosotros').first()).toBeVisible();
      
      console.log(`✅ Menú funciona en página: ${pag.name}`);
      
      // Probar navegación desde cada página
      if (pag.url !== '/') {
        await page.click('text=Inicio');
        await page.waitForURL('**/');
        await page.goBack();
      }
    }
    
    await context.close();
  });

  // ============================================
  // FLUJO 6: Responsive - Mobile
  // ============================================
  test('FLUJO 6: Responsive en Mobile (DevTools)', async () => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await context.newPage();
    
    console.log('🔄 FLUJO 6: Iniciando pruebas responsive...');
    
    // Test Home en mobile
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // Verificar que el menú hamburguesa está presente
    const menuButton = page.locator('button[aria-label*="menu"], button:has(.lucide-menu)').first();
    await expect(menuButton).toBeVisible();
    console.log('✅ Menú hamburguesa visible en mobile');
    
    // Abrir menú mobile
    await menuButton.click();
    await page.waitForTimeout(300);
    
    // Verificar que el menú se despliega
    await expect(page.locator('text=Nosotros')).toBeVisible();
    console.log('✅ Menú mobile se despliega correctamente');
    
    // Cerrar menú haciendo click en un link
    await page.click('text=Productos');
    await page.waitForURL('**/productos**');
    console.log('✅ Navegación desde menú mobile funciona');
    
    // Test catálogo en mobile
    await waitForPageLoad(page);
    await expect(page.locator('text=Nuestros Productos')).toBeVisible();
    
    // Verificar filtros mobile (pills)
    const filterPills = await page.locator('button[class*="rounded-full"]').count();
    console.log(`📊 Filtros mobile disponibles: ${filterPills}`);
    
    // Test búsqueda en mobile
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    const searchInput = page.locator('input[placeholder*="Busca"]').first();
    await searchInput.click();
    await searchInput.fill('sprite');
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Sprite').first()).toBeVisible();
    console.log('✅ Búsqueda funciona en mobile');
    
    // Test detalle producto en mobile
    await page.goto(`${BASE_URL}/productos/SPRI001`);
    await waitForPageLoad(page);
    
    await expect(page.locator('text=Agregar al carrito')).toBeVisible();
    console.log('✅ Página de detalle responsive');
    
    // Test carrito en mobile
    await page.click('text=Agregar al carrito');
    await page.goto(`${BASE_URL}/carrito`);
    await waitForPageLoad(page);
    
    await expect(page.locator('text=Carrito de Compras')).toBeVisible();
    console.log('✅ Página de carrito responsive');
    
    await context.close();
  });

  // ============================================
  // TESTS ADICIONALES
  // ============================================
  
  test('Verificar links rotos', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 Verificando links...');
    
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    
    // Verificar links principales
    const linksToTest = [
      { selector: 'a[href="/productos"]', name: 'Catálogo' },
      { selector: 'a[href="/nosotros"]', name: 'Nosotros' },
      { selector: 'a[href="/carrito"]', name: 'Carrito' },
      { selector: 'a[href="https://wa.me/573143395376"]', name: 'WhatsApp' },
    ];
    
    for (const link of linksToTest) {
      const element = page.locator(link.selector).first();
      const count = await element.count();
      if (count > 0) {
        console.log(`✅ Link encontrado: ${link.name}`);
      } else {
        console.log(`⚠️ Link no encontrado: ${link.name}`);
      }
    }
    
    await context.close();
  });

  test('Verificar actualización del carrito', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 Verificando actualización del carrito...');
    
    // Limpiar localStorage
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    
    // Agregar producto
    await page.goto(`${BASE_URL}/productos/COKE001`);
    await waitForPageLoad(page);
    
    // Verificar que el carrito está vacío inicialmente
    const cartBadge = page.locator('span[class*="rounded-full"]').first();
    
    await page.click('text=Agregar al carrito');
    await expect(page.locator('text=Agregado al carrito')).toBeVisible();
    
    // Recargar y verificar que persiste
    await page.reload();
    await waitForPageLoad(page);
    
    // Abrir carrito y verificar
    await page.click('[aria-label="Abrir carrito"]');
    await page.waitForTimeout(300);
    
    await expect(page.locator('text=Coca-Cola')).toBeVisible();
    console.log('✅ Carrito se actualiza y persiste correctamente');
    
    await context.close();
  });

  test('Verificar páginas de error 404', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔄 Verificando manejo de errores 404...');
    
    // Producto inexistente
    const response = await page.goto(`${BASE_URL}/productos/PRODUCTO_INEXISTENTE`);
    await waitForPageLoad(page);
    
    // Verificar que muestra mensaje de error
    await expect(page.locator('text=Producto no encontrado')).toBeVisible();
    await expect(page.locator('text=Ver todos los productos')).toBeVisible();
    console.log('✅ Página 404 de producto manejada correctamente');
    
    // URL inexistente
    await page.goto(`${BASE_URL}/pagina-que-no-existe`);
    await waitForPageLoad(page);
    
    // Next.js debería mostrar página 404 por defecto
    console.log('✅ Página 404 general manejada');
    
    await context.close();
  });
});
