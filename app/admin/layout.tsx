"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hasActiveSession, destroyAdminSession } from "@/lib/adminAuth";
import { Shield, LogOut, LayoutGrid, ShoppingBag, Users, Package, BarChart3, Truck, Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!pathname) return;

    const normalizedPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

    if (normalizedPath === "/admin") {
      setIsLoading(false);
      setShouldRender(true);
      return;
    }

    const hasSession = hasActiveSession();

    if (!hasSession) {
      router.replace("/admin");
      setIsLoading(false);
      setShouldRender(false);
      return;
    }

    setIsLoading(false);
    setShouldRender(true);
  }, [pathname, router, mounted]);

  const handleLogout = () => {
    destroyAdminSession();
    router.push("/admin");
  };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!shouldRender) {
    return null;
  }

  const normalizedPath = pathname && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const isLoginPage = normalizedPath === "/admin";

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Navegación del admin
  const navItems = [
    { id: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "/admin/productos", label: "Productos", icon: Package },
    { id: "/admin/ruteo", label: "Ruta del Día", icon: Truck },
    { id: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "/admin/clientes", label: "Clientes", icon: Users },
  ];

  // Determinar qué item está activo
  const isActive = (itemId: string) => {
    if (!pathname) return false;
    const normalizedPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    return normalizedPath === itemId || normalizedPath.startsWith(itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header - Mobile Optimized */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/admin/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className={mobileMenuOpen ? "hidden" : ""}>
                <h1 className="text-base sm:text-lg font-bold text-gray-800">DISLUNA</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Panel de administración</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const active = isActive(item.id);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.id}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
                <Shield className="w-4 h-4" />
                <span className="font-medium">Sesión activa</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>

            {/* Mobile Actions (inside menu) */}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
              {/* Mobile Status */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Sesión activa</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar</span>
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.id);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.id}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1">{item.label}</span>
                      {active && (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Logout Button (bottom) */}
              {/* Already included in menu above */}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
