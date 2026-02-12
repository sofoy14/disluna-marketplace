"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simular pequeña validación
    await new Promise(resolve => setTimeout(resolve, 500));

    if (token === "12062026") {
      // Guardar sesión
      if (typeof window !== "undefined") {
        sessionStorage.setItem("disluna_admin_session", Date.now().toString());
      }
      // Redirigir al dashboard
      router.push("/admin/dashboard");
    } else {
      setError("Token de acceso incorrecto");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-secondary flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel DISLUNA</h1>
          <p className="text-white/80">Acceso restringido a administradores</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Iniciar Sesión</h2>
                <p className="text-sm text-gray-500">Ingresa tu token de acceso</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Token de Acceso
                </label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-center text-lg tracking-widest"
                  disabled={isLoading}
                  maxLength={8}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !token}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isLoading || !token
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02]"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Ingresar al Panel</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                🔒 Los intentos de acceso son monitoreados
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4">
            <a
              href="/"
              className="text-sm text-gray-600 hover:text-primary transition-colors flex items-center justify-center space-x-2"
            >
              <span>← Volver a la tienda</span>
            </a>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-white/70 text-sm">
            Área restringida • Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
