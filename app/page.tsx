"use client";

import Link from "next/link";
import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { SearchWithPreview } from "@/components/SearchWithPreview";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { 
  Truck,
  Package,
  BadgeCheck,
  ArrowRight,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  Star,
  TrendingUp,
  Users
} from "lucide-react";

const categories = [
  { 
    name: "Agua", 
    image: "/images/products/brisa-manzana-600ml-6.png", 
    slug: "agua", 
    count: 9, 
    gradient: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-50"
  },
  { 
    name: "Colas", 
    image: "/images/products/coca-cola-2lt-rp9-nvo.png", 
    slug: "colas", 
    count: 9, 
    gradient: "from-red-500 to-rose-500",
    bgColor: "bg-red-50"
  },
  { 
    name: "Jugos", 
    image: "/images/products/fresh-citrus-15lt-pet12nvo.png", 
    slug: "jugos", 
    count: 6, 
    gradient: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50"
  },
  { 
    name: "Isotónicos", 
    image: "/images/products/powerade-ion4-ft-500ml-pet6.png", 
    slug: "isotonicos", 
    count: 7, 
    gradient: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50"
  },
  { 
    name: "Sabores", 
    image: "/images/products/sprite-15l-pet-12.png", 
    slug: "sabores", 
    count: 6, 
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50"
  },
];

const featuredProducts = products.slice(0, 6);

const stats = [
  { value: "10+", label: "Años de experiencia", icon: TrendingUp },
  { value: "500+", label: "Clientes satisfechos", icon: Users },
  { value: "37", label: "Productos disponibles", icon: Package },
  { value: "24h", label: "Entrega express", icon: Truck },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* HERO - With Background Image */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="Disluna distribución"
            fill
            className="object-cover"
            priority
            quality={90}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/75 via-primary/60 to-primary/40" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              {/* Title */}
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[0.95] tracking-tight">
                  Tu distribuidor
                  <span className="block mt-2 bg-gradient-to-r from-accent to-white bg-clip-text text-transparent">
                    de confianza
                  </span>
                </h1>
                <p className="text-lg lg:text-xl text-white/70 max-w-lg leading-relaxed">
                  Bebidas de las mejores marcas para tu negocio. 
                  Precios competitivos, entrega el mismo día en Ibagué.
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="max-w-xl animate-slide-up" style={{ animationDelay: '200ms' }}>
                <SearchWithPreview isScrolled={false} variant="hero" />
              </div>
              
              {/* CTAs */}
              <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
                <Link
                  href="/productos"
                  className="group inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95"
                >
                  <span>Ver catálogo</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                
                <a
                  href="https://wa.me/573143395376"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Cotizar</span>
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-6 pt-4 animate-fade-in" style={{ animationDelay: '600ms' }}>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <BadgeCheck className="w-5 h-5 text-accent" />
                  <span>Precios de mayorista</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Truck className="w-5 h-5 text-accent" />
                  <span>Entrega el mismo día</span>
                </div>
              </div>
            </div>

            {/* Right Column - Stats Cards */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Main stats card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-glass-lg animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <div className="grid grid-cols-2 gap-6">
                    {stats.map((stat, i) => (
                      <div 
                        key={i} 
                        className="group p-6 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:scale-105"
                        style={{ animationDelay: `${400 + i * 100}ms` }}
                      >
                        <stat.icon className="w-8 h-8 text-accent mb-4 opacity-80 group-hover:scale-110 transition-transform duration-300" />
                        <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-sm text-white/60">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating mini cards */}
                <div className="absolute -top-8 -right-8 bg-white rounded-2xl p-4 shadow-soft-lg animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Entregado</p>
                      <p className="text-xs text-gray-500">Pedido #1234</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-soft-lg animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Nuevo pedido</p>
                      <p className="text-xs text-gray-500">12 productos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* CATEGORÍAS - Grid amplio desktop */}
      <section className="py-24 bg-gray-50/30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Explora por categoría
              </h2>
              <p className="text-gray-500 text-lg max-w-xl">
                Encuentra lo que necesitas para tu negocio. Desde agua purificada hasta bebidas energizantes.
              </p>
            </div>
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300"
            >
              Ver todo el catálogo
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                href={`/productos?categoria=${category.slug}`}
                className="group relative bg-white rounded-3xl p-4 lg:p-6 border border-gray-100 hover:border-transparent transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-2 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover gradient bg */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500",
                  category.gradient
                )} />
                
                {/* Product Image Container */}
                <div className={cn(
                  "relative w-full aspect-square rounded-2xl mb-4 overflow-hidden transition-all duration-500 group-hover:scale-105",
                  category.bgColor
                )}>
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-contain p-2 lg:p-4 transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                </div>
                
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors duration-300">
                  {category.name}
                </h3>
                <p className="text-gray-400 text-sm mb-3">{category.count} productos</p>
                
                <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <span>Explorar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DESTACADOS - Grid de 6 en desktop */}
      <section className="py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Productos destacados
              </h2>
              <p className="text-gray-500 text-lg">
                Los más solicitados por nuestros clientes
              </p>
            </div>
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300"
            >
              Ver todos
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {featuredProducts.map((product, index) => (
              <div 
                key={product.sku}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESO - Con glassmorphism */}
      <section className="py-24 bg-gray-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Así de fácil es pedir
            </h2>
            <p className="text-gray-400 text-lg">
              Tres simples pasos para recibir tu pedido en la puerta de tu negocio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                step: "01", 
                title: "Elige tus productos", 
                desc: "Explora nuestro catálogo y selecciona por unidad o caja",
                icon: Package
              },
              { 
                step: "02", 
                title: "Cotiza o compra", 
                desc: "Compra directo o escríbenos para una cotización personalizada",
                icon: MessageCircle
              },
              { 
                step: "03", 
                title: "Recibe en tu puerta", 
                desc: "Entregamos el mismo día en Ibagué. Rápido y seguro.",
                icon: Truck
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className="group relative"
              >
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 lg:p-10 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:-translate-y-2">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-8 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  
                  <span className="text-6xl font-bold text-white/10 absolute top-8 right-8">
                    {item.step}
                  </span>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 relative">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed relative">
                    {item.desc}
                  </p>
                </div>

                {/* Connector line - desktop only */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL - Glassmorphism */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Image - Desktop and Mobile */}
        <div className="absolute inset-0">
          {/* Desktop Image */}
          <div className="hidden lg:block absolute inset-0">
            <Image
              src="/ibague.png"
              alt="Ibagué"
              fill
              className="object-cover"
              priority
              quality={90}
            />
          </div>
          {/* Mobile Image */}
          <div className="lg:hidden absolute inset-0">
            <Image
              src="/ibague movil.png"
              alt="Ibagué"
              fill
              className="object-cover"
              priority
              quality={90}
            />
          </div>
          {/* Blue gradient overlay with transparency */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-[#1565C0]/60" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        </div>
        
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
                ¿Listo para surtir tu negocio?
              </h2>
              <p className="text-xl text-white/70">
                Contáctanos hoy y descubre por qué somos el distribuidor preferido en Ibagué.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://wa.me/573143395376"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-whatsapp text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-whatsapp/30 hover:scale-105 active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Escribir por WhatsApp</span>
                </a>
                
                <a
                  href="tel:+573216389995"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:bg-white/20"
                >
                  <Phone className="w-5 h-5" />
                  <span>Llamar ahora</span>
                </a>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-glass-lg">
              <h3 className="text-2xl font-bold text-white mb-8">Información de contacto</h3>
              
              <div className="space-y-6">
                <a href="tel:+573216389995" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10">
                  <div className="w-14 h-14 rounded-xl bg-whatsapp/20 flex items-center justify-center">
                    <Phone className="w-6 h-6 text-whatsapp" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Teléfono / WhatsApp</p>
                    <p className="text-white font-semibold text-lg">321 638 9995</p>
                  </div>
                </a>
                
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Dirección</p>
                    <p className="text-white font-semibold">Calle 5b #13 - Esquina, Ibagué</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Horario</p>
                    <p className="text-white font-semibold">Lun - Sáb: 8:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
