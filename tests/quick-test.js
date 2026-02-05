const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('=== PRUEBAS RAPIDAS DISLUNA ===\n');
  
  // Test 1: Home carga
  await page.goto('http://localhost:3001');
  await page.waitForLoadState('networkidle');
  const title = await page.title();
  console.log('✅ Test 1 - Home carga:', title || 'Sin titulo');
  
  // Test 2: Navegacion a productos (usando URL directa)
  await page.goto('http://localhost:3001/productos');
  await page.waitForLoadState('networkidle');
  const hasProducts = await page.locator('h1:has-text("Nuestros")').isVisible();
  console.log('✅ Test 2 - Catalogo:', hasProducts ? 'OK' : 'FALLA');
  
  // Test 3: Detalle de producto
  await page.goto('http://localhost:3001/productos/COKE001');
  await page.waitForLoadState('networkidle');
  const hasDetail = await page.locator('button:has-text("Agregar al carrito")').isVisible();
  console.log('✅ Test 3 - Detalle producto:', hasDetail ? 'OK' : 'FALLA');
  
  // Test 4: Agregar al carrito
  await page.click('button:has-text("Agregar al carrito")');
  await page.waitForTimeout(500);
  const cartUpdated = await page.locator('button:has-text("Agregado")').isVisible().catch(() => false);
  console.log('✅ Test 4 - Agregar carrito:', cartUpdated ? 'OK' : 'FALLA');
  
  // Test 5: Carrito sidebar
  await page.click('button[aria-label="Abrir carrito"]');
  await page.waitForTimeout(300);
  const sidebarOpen = await page.locator('text=Tu Carrito').isVisible();
  console.log('✅ Test 5 - Sidebar carrito:', sidebarOpen ? 'OK' : 'FALLA');
  
  // Test 6: Pagina carrito
  await page.goto('http://localhost:3001/carrito');
  await page.waitForLoadState('networkidle');
  const cartPage = await page.locator('h1:has-text("Carrito")').isVisible();
  console.log('✅ Test 6 - Pagina carrito:', cartPage ? 'OK' : 'FALLA');
  
  // Test 7: Checkout
  await page.goto('http://localhost:3001/checkout');
  await page.waitForLoadState('networkidle');
  const checkoutPage = await page.locator('h1:has-text("Finalizar")').isVisible();
  console.log('✅ Test 7 - Checkout:', checkoutPage ? 'OK' : 'FALLA');
  
  // Test 8: Pagina nosotros
  await page.goto('http://localhost:3001/nosotros');
  await page.waitForLoadState('networkidle');
  const nosotrosTitle = await page.title();
  console.log('✅ Test 8 - Nosotros:', nosotrosTitle.includes('Nosotros') ? 'OK' : 'FALLA - Titulo: ' + nosotrosTitle);
  
  // Test 9: 404 producto
  await page.goto('http://localhost:3001/productos/NOEXISTE');
  await page.waitForLoadState('networkidle');
  const notFound = await page.locator('h1:has-text("no encontrado")').isVisible();
  console.log('✅ Test 9 - 404 producto:', notFound ? 'OK' : 'FALLA');
  
  // Test 10: Busqueda preview
  await page.goto('http://localhost:3001');
  await page.waitForLoadState('networkidle');
  const searchInput = page.locator('input[placeholder*="Busca"]').first();
  await searchInput.fill('coca');
  await page.waitForTimeout(500);
  const hasPreview = await page.locator('p:has-text("Coca-Cola")').first().isVisible();
  console.log('✅ Test 10 - Preview busqueda:', hasPreview ? 'OK' : 'FALLA');
  
  // Test 11: Filtros categoria
  await page.goto('http://localhost:3001/productos?categoria=colas');
  await page.waitForLoadState('networkidle');
  const hasFilter = await page.locator('button:has-text("COLAS")').isVisible();
  console.log('✅ Test 11 - Filtro categoria:', hasFilter ? 'OK' : 'FALLA');
  
  // Test 12: Links rotos - terminos y privacidad en checkout
  await page.goto('http://localhost:3001/checkout');
  await page.waitForLoadState('networkidle');
  const hasTerms = await page.locator('a[href="/terminos"]').count();
  const hasPrivacy = await page.locator('a[href="/privacidad"]').count();
  console.log('✅ Test 12 - Links checkout: Terminos(' + hasTerms + ') Privacidad(' + hasPrivacy + ')');
  
  await browser.close();
  console.log('\n=== PRUEBAS COMPLETADAS ===');
})();
