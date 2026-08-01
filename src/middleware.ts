import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtenemos la cookie 'access_token' (así es como se llama en backend)
  const token = request.cookies.get('access_token');
  
  // Si estamos intentando acceder al dashboard y NO hay token, redirigimos al login
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si estamos en auth (login/register) y YA hay token, redirigimos al dashboard
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    if (token) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Especificamos en qué rutas debe correr este middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*'
  ]
};
