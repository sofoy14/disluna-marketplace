// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redirigir después del login exitoso a selección de plan
  if (pathname === '/login' && request.nextUrl.searchParams.get('redirect') === 'select-plan') {
    return NextResponse.redirect(new URL('/select-plan', request.url));
  }
  
  // Si el usuario viene del login y no tiene plan seleccionado, redirigir a selección
  if (pathname === '/dashboard' && request.nextUrl.searchParams.get('from') === 'login') {
    return NextResponse.redirect(new URL('/select-plan', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard', '/select-plan', '/payment']
};