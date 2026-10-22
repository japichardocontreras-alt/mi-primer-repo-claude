import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro rápido: sin cookie de sesión se redirige a /login.
 * La validación real de la sesión y de los permisos ocurre en el servidor
 * (páginas, server actions y API) contra la base de datos.
 */
const PUBLIC = ["/login", "/api/health"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (req.cookies.get("mm_session")) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpeg).*)"] };
