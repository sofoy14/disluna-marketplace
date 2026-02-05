import Link from "next/link";
import { 
  Target, 
  Eye, 
  Heart, 
  Award, 
  Users,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Compromiso",
    description: "Nos dedicamos a satisfacer las necesidades de nuestros clientes con dedicación y pasión.",
  },
  {
    icon: Award,
    title: "Calidad",
    description: "Ofrecemos solo productos de las mejores marcas, garantizando frescura y autenticidad.",
  },
  {
    icon: Users,
    title: "Trabajo en equipo",
    description: "Nuestro equipo colabora para brindar el mejor servicio y experiencia de compra.",
  },
  {
    icon: Target,
    title: "Orientación al cliente",
    description: "Ponemos al cliente en el centro de todas nuestras decisiones y acciones.",
  },
];

const team = [
  { name: "Director General", role: "Fundador & CEO", placeholder: true },
  { name: "Gerente Comercial", role: "Ventas & Marketing", placeholder: true },
  { name: "Jefe de Logística", role: "Distribución", placeholder: true },
  { name: "Atención al Cliente", role: "Soporte", placeholder: true },
];

const milestones = [
  { year: "2014", title: "Fundación", description: "Nace DISLUNA con la misión de distribuir bebidas de calidad en Ibagué." },
  { year: "2016", title: "Expansión", description: "Ampliamos nuestra flota de vehículos para mejorar el servicio de entrega." },
  { year: "2018", title: "Nuevas Alianzas", description: "Incorporamos más de 20 marcas reconocidas a nuestro catálogo." },
  { year: "2020", title: "Digitalización", description: "Lanzamos nuestro sistema de pedidos online para mayor comodidad." },
  { year: "2024", title: "Crecimiento", description: "Seguimos creciendo y sirviendo a cientos de negocios en la región." },
];

export default function NosotrosPage() {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="relative bg-primary py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Sobre DISLUNA
          </h1>
          <p className="text-xl text-gray-100 max-w-3xl mx-auto">
            Más de 10 años sirviendo a Ibagué con los mejores productos y 
            un servicio que marca la diferencia.
          </p>
        </div>
      </section>

      {/* Historia */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Nuestra Historia</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  DISLUNA nació en el año 2014 con una visión clara: ser el distribuidor de bebidas 
                  más confiable de Ibagué. Lo que comenzó como un pequeño emprendimiento familiar, 
                  hoy es una empresa consolidada que sirve a cientos de negocios en la región.
                </p>
                <p>
                  A lo largo de estos años, hemos construido relaciones sólidas con las mejores marcas 
                  del mercado y, más importante aún, con nuestros clientes. Cada entrega, cada pedido, 
                  cada sonrisa nos ha llevado a ser quienes somos hoy.
                </p>
                <p>
                  Nuestro compromiso va más allá de distribuir bebidas. Nos esforzamos por ser un aliado 
                  estratégico para el crecimiento de los negocios de nuestros clientes, ofreciendo no 
                  solo productos de calidad, sino también asesoría, puntualidad y un servicio personalizado.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl font-bold text-primary mb-2">10+</div>
                  <p className="text-gray-600 text-lg">Años de experiencia</p>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-2xl font-bold text-secondary">500+</div>
                      <p className="text-sm text-gray-500">Clientes</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-2xl font-bold text-secondary">50+</div>
                      <p className="text-sm text-gray-500">Productos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Nuestro Recorrido</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Una década de crecimiento, aprendizaje y compromiso con nuestros clientes
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 md:-ml-px" />
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={milestone.year} className={`relative flex items-center ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}>
                  <div className="hidden md:block w-1/2" />
                  <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-primary rounded-full border-4 border-white shadow md:-ml-2" />
                  <div className={`ml-12 md:ml-0 md:w-1/2 ${
                    index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                  }`}>
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                      <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-2">
                        {milestone.year}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">{milestone.title}</h3>
                      <p className="text-gray-600 text-sm">{milestone.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Misión */}
            <div className="bg-primary rounded-2xl p-8 text-white">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Nuestra Misión</h2>
              <p className="text-gray-100 leading-relaxed">
                Proveer productos de alta calidad a comercios y negocios de Ibagué, 
                ofreciendo un servicio confiable, precios competitivos y atención personalizada 
                que supere las expectativas de nuestros clientes, contribuyendo al crecimiento 
                de sus negocios y al bienestar de la comunidad.
              </p>
            </div>

            {/* Visión */}
            <div className="bg-secondary rounded-2xl p-8 text-white">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Nuestra Visión</h2>
              <p className="text-gray-100 leading-relaxed">
                Ser el distribuidor de bebidas líder en Ibagué y la región, reconocido por 
                nuestra excelencia en el servicio, variedad de productos y compromiso con 
                el crecimiento de nuestros clientes, siendo la primera opción de distribución 
                para negocios de todos los tamaños.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Nuestros Valores</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Los principios que guían cada decisión y acción en DISLUNA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-14 h-14 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Nuestro Equipo</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Personas dedicadas a hacer de DISLUNA tu mejor opción en distribución
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-800">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Contáctanos</h2>
              <p className="text-gray-100 mb-8">
                Estamos listos para atenderte. Escríbenos o visítanos en nuestra bodega.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Dirección</p>
                    <p>Calle 5b #13- Esquina, Ibagué</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Teléfono</p>
                    <a href="tel:+573XXXXXXXXX" className="hover:underline">+57 3XX XXX XXXX</a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Email</p>
                    <a href="mailto:info@disluna.com" className="hover:underline">info@disluna.com</a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300">Horario</p>
                    <p>Lunes a Sábado: 8:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>

              <Link
                href="/#contacto"
                className="inline-flex items-center space-x-2 bg-white text-primary px-6 py-3 rounded-lg font-semibold mt-8 hover:bg-gray-100 transition-colors"
              >
                <span>Enviar mensaje</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">¿Por qué elegirnos?</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Más de 10 años de experiencia en el mercado</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Amplia variedad de productos de las mejores marcas</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Precios competitivos para mayoristas</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Entrega rápida y confiable en Ibagué</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Atención personalizada y asesoría experta</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
