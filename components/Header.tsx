'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ShoppingCart, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import CartSidebar from './CartSidebar';
import { SearchWithPreview } from './SearchWithPreview';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isHydrated, totalItems } = useCart();
  const pathname = usePathname();

  // Determinar si debe iniciar como scrolled (para páginas sin imagen de fondo)
  const shouldStartScrolled = pathname !== '/';

  useEffect(() => {
    // Si no estamos en la home, iniciar como scrolled
    if (shouldStartScrolled) {
      setIsScrolled(true);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50 || shouldStartScrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldStartScrolled]);

  const navItems = [
    { label: 'Inicio', href: '/' },
    { label: 'Productos', href: '/productos' },
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Admin', href: '/admin/dashboard' },
  ];

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-expo-out",
          isScrolled 
            ? 'bg-white/85 backdrop-blur-xl shadow-soft border-b border-gray-200/30' 
            : 'bg-transparent'
        )}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <div className="relative transition-all duration-500 hover:scale-105" style={{ width: '160px', height: '50px' }}>
                <Image
                  src={isScrolled ? "/disluna azul.png" : "/disluna blanco.png"}
                  alt="Disluna Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    isScrolled 
                      ? "text-gray-700 hover:text-primary hover:bg-primary/5" 
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Search - Desktop */}
            <div className="hidden lg:block flex-1 max-w-md mx-8">
              <SearchWithPreview isScrolled={isScrolled} variant="header" />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* WhatsApp CTA - Desktop */}
              <a
                href="https://wa.me/573174018932"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "hidden md:flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  "hover:scale-105 active:scale-95",
                  isScrolled
                    ? "bg-whatsapp text-white hover:bg-whatsapp/90 shadow-lg shadow-whatsapp/25"
                    : "bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20"
                )}
              >
                <Phone className="w-4 h-4" />
                <span>Cotizar</span>
              </a>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={cn(
                  "relative p-3 rounded-full transition-all duration-300",
                  "hover:scale-110 active:scale-95",
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                )}
                aria-label="Abrir carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                {isHydrated && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center animate-scale-in shadow-lg">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "md:hidden p-3 rounded-full transition-all duration-300",
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                )}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div 
          className={cn(
            "md:hidden absolute top-full left-0 right-0 overflow-hidden transition-all duration-500 ease-expo-out",
            isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className={cn(
            "mx-4 mt-2 rounded-2xl backdrop-blur-xl border shadow-glass-lg overflow-hidden",
            isScrolled ? "bg-white/95 border-gray-200/50" : "bg-primary/95 border-white/20"
          )}>
            <div className="p-4 space-y-2">
              {/* Mobile Search */}
              <div className="mb-4">
                <SearchWithPreview isScrolled={true} variant="header" />
              </div>

              {/* Mobile Nav Links */}
              {navItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "block py-3 px-4 rounded-xl font-medium transition-all duration-300",
                    "hover:translate-x-2",
                    isScrolled 
                      ? "text-gray-700 hover:bg-gray-100 hover:text-primary" 
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile WhatsApp */}
              <a
                href="https://wa.me/573174018932"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-3 px-4 mt-2 bg-whatsapp text-white rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Phone className="w-5 h-5" />
                <span>Cotizar por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

export default Header;
