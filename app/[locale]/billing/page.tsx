// app/[locale]/billing/page.tsx
// import { BillingPage } from '@/components/billing/BillingPage'; // ELIMINADO - Sistema de billing removido

export default function Billing() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Facturación</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          Sistema de Facturación Temporalmente Deshabilitado
        </h2>
        <p className="text-yellow-700">
          El sistema de facturación ha sido temporalmente deshabilitado durante la refactorización del sistema.
          Por favor, contacta al administrador para más información.
        </p>
      </div>
    </div>
  );
}




