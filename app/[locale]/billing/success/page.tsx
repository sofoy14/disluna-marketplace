// app/[locale]/billing/success/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [transaction, setTransaction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const transactionId = searchParams.get('id');
    
    if (!transactionId) {
      setStatus('error');
      setError('No se encontró ID de transacción');
      return;
    }

    // Verificar estado de la transacción
    verifyTransaction(transactionId);
  }, [searchParams]);

  const verifyTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/billing/verify-transaction?id=${transactionId}`);
      const data = await response.json();

      if (response.ok) {
        setTransaction(data.transaction);
        setStatus(data.transaction.status === 'APPROVED' ? 'success' : 'error');
        
        if (data.transaction.status !== 'APPROVED') {
          setError(`Transacción ${data.transaction.status}`);
        }
      } else {
        setStatus('error');
        setError(data.error || 'Error verificando transacción');
      }
    } catch (err) {
      setStatus('error');
      setError('Error de conexión');
    }
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {status === 'loading' && 'Verificando pago...'}
              {status === 'success' && '¡Pago exitoso!'}
              {status === 'error' && 'Error en el pago'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
                <p className="text-gray-600">
                  Verificando el estado de tu transacción...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-green-600">
                    ¡Bienvenido a tu suscripción!
                  </h3>
                  <p className="text-gray-600">
                    Tu pago ha sido procesado exitosamente
                  </p>
                  {transaction && (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <p><strong>ID de transacción:</strong> {transaction.id}</p>
                      <p><strong>Monto:</strong> ${(transaction.amount_in_cents / 1000).toLocaleString()} COP</p>
                      <p><strong>Referencia:</strong> {transaction.reference}</p>
                    </div>
                  )}
                </div>
                <Button onClick={handleContinue} className="w-full">
                  Ir al Dashboard
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 text-red-600 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-red-600">
                    Error en el pago
                  </h3>
                  <p className="text-gray-600">
                    {error || 'Hubo un problema procesando tu pago'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={() => router.push('/onboarding')} className="w-full">
                    Intentar de nuevo
                  </Button>
                  <Button 
                    onClick={() => router.push('/')} 
                    variant="outline" 
                    className="w-full"
                  >
                    Volver al inicio
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


